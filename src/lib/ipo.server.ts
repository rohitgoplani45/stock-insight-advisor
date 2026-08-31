/** Fetches and parses the public InvestorGain live-GMP report into structured IPO rows. */

const SOURCE = "https://www.investorgain.com/report/live-ipo-gmp/331/";

const RELAYS = [
  (url: string) => `https://r.jina.ai/${url}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

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

function stripLinks(s: string): string {
  return s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

function clean(s: string): string {
  return stripLinks(s)
    .replace(/\*\*/g, "")
    .replace(/[▲▼]/g, "")
    .trim();
}

function num(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function dateOnly(s: string): string | null {
  const c = clean(s).replace(/GMP:\s*[\d.]+/gi, "").trim();
  const m = c.match(/\d{1,2}-[A-Za-z]{3}/);
  return m ? m[0] : null;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const attempts = RELAYS.map(async (relay) => {
      const res = await fetch(relay(url), {
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "text/plain,text/html,*/*" },
      });
      const text = await res.text();
      if (!res.ok || text.length < 500) throw new Error(`Relay returned ${res.status}`);
      return text;
    });
    return await Promise.any(attempts);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function parseRow(line: string): Ipo | null {
  const cells = line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
  if (cells.length < 12) return null;

  const nameCell = cells[0] ?? "";
  const nameMatch = nameCell.match(/\[([^\]]+)\]/);
  if (!nameMatch) return null;
  const name = nameMatch[1]!.trim();
  if (/^name$/i.test(name)) return null;

  // Everything after the company link carries the board + status markers.
  const tail = stripLinks(nameCell.slice(nameCell.indexOf("]("))).replace(/Allotted/gi, "");
  const board: IpoBoard = /NSE SME/i.test(tail)
    ? "NSE SME"
    : /BSE SME/i.test(tail)
      ? "BSE SME"
      : "Mainboard";

  const listed = tail.match(/L@([\d.]+)\s*\(([-\d.]+)%\)/);
  let status: IpoStatus;
  let listingPrice: number | null = null;
  let listingGainPct: number | null = null;
  if (listed) {
    status = "listed";
    listingPrice = Number(listed[1]);
    listingGainPct = Number(listed[2]);
  } else {
    const flag = tail
      .replace(/NSE SME|BSE SME|IPO/gi, "")
      .replace(/\*\*/g, "")
      .trim();
    status =
      flag === "U" ? "upcoming" : flag === "O" ? "open" : flag === "CT" ? "closing" : "closed";
  }

  const gmpCell = clean(cells[1] ?? "");
  const gmpMatch = gmpCell.match(/₹\s*(--|[\d.]+)/);
  const gmp = gmpMatch && gmpMatch[1] !== "--" ? Number(gmpMatch[1]) : null;
  const pctMatch = gmpCell.match(/\(([-\d.]+)%\)/);
  const gmpPct = pctMatch ? Number(pctMatch[1]) : null;

  const rating = (cells[2]?.match(/🔥/g) ?? []).length;
  const subscription = num(clean(cells[3] ?? "").replace(/^-$/, ""));
  const price = num(clean(cells[4] ?? ""));
  const issueSizeRaw = clean(cells[5] ?? "");
  const lot = num(clean(cells[6] ?? ""));

  return {
    name,
    board,
    status,
    gmp,
    gmpPct,
    rating,
    subscription,
    price,
    issueSize: issueSizeRaw || null,
    lot,
    openDate: dateOnly(cells[7] ?? ""),
    closeDate: dateOnly(cells[8] ?? ""),
    allotmentDate: dateOnly(cells[9] ?? ""),
    listingDate: dateOnly(cells[10] ?? ""),
    listingPrice,
    listingGainPct,
    anchor: (cells[12] ?? "").includes("✅"),
    updatedAt: clean(cells[11] ?? "") || null,
  };
}

export async function fetchIpos(): Promise<Ipo[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;

  const text = await fetchText(SOURCE);
  const rows: Ipo[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    if (!line.trimStart().startsWith("|")) continue;
    if (!/\[.+\]\(/.test(line)) continue;
    const row = parseRow(line);
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
