import type { Candle } from "./analysis";

/* eslint-disable @typescript-eslint/no-explicit-any -- upstream JSON is untyped */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

/** Read-only relays used when the origin blocks the server's egress IP. */
const RELAYS: ((url: string) => string)[] = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://r.jina.ai/${url}`,
];

function extractJson(text: string): any {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Unexpected response from data source");
  return JSON.parse(text.slice(start));
}

async function get(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, {
    signal: signal ?? null,
    headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*" },
  });
  const text = await res.text();
  if (!res.ok && !text.trimStart().startsWith("{"))
    throw new Error(`Upstream returned ${res.status}`);
  const json = extractJson(text);
  if (json?.chart?.error) {
    throw new Error(json.chart.error.description || "No data found");
  }
  return json;
}

const cache = new Map<string, { at: number; data: any }>();
const TTL = 5 * 60 * 1000;
const ATTEMPT_TIMEOUT = 9000;

async function yahoo(path: string): Promise<any> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const urls = [
    ...HOSTS.map((h) => h + path),
    ...RELAYS.flatMap((relay) => HOSTS.map((h) => relay(h + path))),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT);
  let notFound: Error | null = null;

  const attempts = urls.map((u) =>
    get(u, controller.signal).catch((err: unknown) => {
      if (err instanceof Error && /No data found|delisted|Not Found/i.test(err.message))
        notFound = err;
      throw err;
    }),
  );

  try {
    const data = await Promise.any(attempts);
    cache.set(path, { at: Date.now(), data });
    return data;
  } catch {
    throw (
      notFound ?? new Error("Market data is temporarily unavailable. Please try again in a moment.")
    );
  } finally {
    clearTimeout(timer);
    // Cancel every still-pending relay request so the response isn't held open.
    controller.abort();
  }
}

export type Quote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  candles: Candle[];
};

export async function searchSymbol(query: string): Promise<{ symbol: string; name: string }[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await yahoo(
    `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`,
  );
  const quotes: any[] = data?.quotes ?? [];
  return quotes
    .filter((x) => typeof x.symbol === "string" && /\.(NS|BO)$/i.test(x.symbol))
    .sort((a, b) => (a.symbol.endsWith(".NS") ? -1 : 1) - (b.symbol.endsWith(".NS") ? -1 : 1))
    .map((x) => ({
      symbol: x.symbol as string,
      name: (x.longname || x.shortname || x.symbol) as string,
    }));
}

function normalizeInput(raw: string): string[] {
  const s = raw.trim().toUpperCase();
  if (/\.(NS|BO)$/.test(s)) return [s];
  if (/^[A-Z0-9&-]{1,15}$/.test(s)) return [`${s}.NS`, `${s}.BO`];
  return [];
}

export async function fetchChart(symbol: string, range = "1y"): Promise<Quote> {
  const data = await yahoo(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&includePrePost=false`,
  );
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No price data for ${symbol}`);
  const meta = result.meta ?? {};
  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (c == null) continue;
    candles.push({
      t: ts[i]!,
      o: q.open?.[i] ?? c,
      h: q.high?.[i] ?? c,
      l: q.low?.[i] ?? c,
      c,
      v: q.volume?.[i] ?? 0,
    });
  }
  if (candles.length < 30) throw new Error(`Not enough price history for ${symbol}`);
  if (meta.regularMarketPrice && candles.length) {
    candles[candles.length - 1]!.c = meta.regularMarketPrice;
  }
  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName || meta.shortName || (meta.symbol ?? symbol).replace(/\.(NS|BO)$/, ""),
    exchange: meta.fullExchangeName || (String(symbol).endsWith(".BO") ? "BSE" : "NSE"),
    currency: meta.currency ?? "INR",
    candles,
  };
}

export async function resolveAndFetch(input: string): Promise<Quote> {
  const direct = normalizeInput(input);
  for (const candidate of direct) {
    try {
      return await fetchChart(candidate);
    } catch {
      /* try next */
    }
  }
  let matches: { symbol: string; name: string }[] = [];
  try {
    matches = await searchSymbol(input);
  } catch {
    /* try next */
  }
  for (const m of matches.slice(0, 4)) {
    try {
      return await fetchChart(m.symbol);
    } catch {
      /* try next */
    }
  }

  throw new Error(
    `Couldn't find "${input}" on NSE/BSE. Try the exact ticker (e.g. TATAMOTORS) or the full company name.`,
  );
}
