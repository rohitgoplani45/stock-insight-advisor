/** Fetches the public InvestorGain live-GMP report (JSON API) into structured IPO rows. */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const TIMEOUT = 12_000;
const TTL = 10 * 60 * 1000;

let cache: { at: number; data: Ipo[] } | null = null;

export type IpoStatus = "upcoming" | "open" | "closing" | "closed" | "listed";
export type IpoBoard = "Mainboard" | "NSE SME" | "BSE SME";

export type Ipo = {
  name: string;
  board: IpoBoard;
  status: IpoStatus;
  gmp: number | null;
  gmpPct: number | null;
  rating: number;
  subscription: number | null;
  price: number | null;
  issueSize: string | null;
  lot: number | null;
  openDate: string | null;
  closeDate: string | null;
  allotmentDate: string | null;
  listingDate: string | null;
  listingPrice: number | null;
  listingGainPct: number | null;
  anchor: boolean;
  updatedAt: string | null;
};

type Row = Record<string, unknown>;

function text(v: unknown): string {
  return String(v ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&#8377;/g, "₹")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function num(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function shortDate(v: unknown): string | null {
  const m = text(v).match(/\d{1,2}-[A-Za-z]{3}/);
  return m ? m[0] : null;
}

/** Fiscal-year label used by the source API, e.g. 2026-27 for Apr 2026 onwards. */
function fiscal(now: Date): { year: number; fy: string } {
  const y = now.getUTCFullYear();
  const startYear = now.getUTCMonth() >= 3 ? y : y - 1;
  return { year: y, fy: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}` };
}

function endpoints(): string[] {
  const now = new Date();
  const { year, fy } = fiscal(now);
  const day = now.getUTCDate();
  const v = `${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return [
    `https://webnodejs.investorgain.com/cloud/v2/report/data-read/331/1/${day}/${year}/${fy}/0/all?search=&v=${v}`,
    `https://webnodejs.investorgain.com/cloud/v2/report/data-read/331/1/1/${year}/${fy}/0/all?search=`,
  ];
}

function parseRow(row: Row): Ipo | null {
  const name = text(row["~ipo_name"]) || text(row["Name"]).split(" IPO")[0]!;
  if (!name) return null;

  const nameHtml = String(row["Name"] ?? "");
  const board: IpoBoard = /NSE SME/i.test(nameHtml)
    ? "NSE SME"
    : /BSE SME/i.test(nameHtml)
      ? "BSE SME"
      : "Mainboard";

  const code = String(row["~ipo_status1"] ?? "").toUpperCase();
  const status: IpoStatus = code.startsWith("L")
    ? "listed"
    : code === "U"
      ? "upcoming"
      : code === "O"
        ? "open"
        : code === "CT"
          ? "closing"
          : "closed";

  const listed = nameHtml.match(/L@([\d.]+)\s*\(([-\d.]+)%\)/);
  const listingPrice = listed ? Number(listed[1]) : null;
  const listingGainPct = listed ? Number(listed[2]) : null;

  const gmpText = text(row["GMP"]);
  const gmpMatch = gmpText.match(/₹\s*(--|-?[\d.]+)/);
  const gmp = gmpMatch && gmpMatch[1] !== "--" ? Number(gmpMatch[1]) : null;
  const gmpPct = num(String(row["~gmp_percent_calc"] ?? "")) ?? num(gmpText.match(/\(([-\d.]+)%\)/)?.[1]);

  const rating = (String(row["Rating"] ?? "").match(/128293/g) ?? []).length;
  const issueSize = text(row["IPO Size"]);

  return {
    name,
    board,
    status,
    gmp,
    gmpPct,
    rating,
    subscription: num(text(row["Sub"]).replace(/^-$/, "")),
    price: num(text(row["Price (₹)"])),
    issueSize: issueSize || null,
    lot: num(text(row["Lot"])),
    openDate: shortDate(row["Open"]),
    closeDate: shortDate(row["Close"]),
    allotmentDate: shortDate(row["BoA Dt"]),
    listingDate: shortDate(row["Listing"]),
    listingPrice,
    listingGainPct,
    anchor: String(row["Anchor"] ?? "").includes("✅"),
    updatedAt: text(row["Updated-On"]) || null,
  };
}

async function fetchRows(url: string): Promise<Row[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: "https://www.investorgain.com/",
      },
    });
    if (!res.ok) throw new Error(`Source returned ${res.status}`);
    const json = (await res.json()) as { reportTableData?: Row[] };
    const rows = json.reportTableData ?? [];
    if (rows.length === 0) throw new Error("Source returned no rows");
    return rows;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchIpos(): Promise<Ipo[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;

  let raw: Row[] | null = null;
  let lastError: unknown = null;
  for (const url of endpoints()) {
    try {
      raw = await fetchRows(url);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!raw) throw new Error(`Could not read the IPO tracker right now. ${String(lastError ?? "")}`.trim());

  const rows: Ipo[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const row = parseRow(r);
    if (!row) continue;
    const key = `${row.name}|${row.board}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  if (rows.length === 0) throw new Error("Could not read the IPO tracker right now.");
  cache = { at: Date.now(), data: rows };
  return rows;
}

