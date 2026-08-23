import type { Candle } from "./analysis";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

async function yahoo(path: string): Promise<any> {
  let lastErr: unknown = null;
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (!res.ok) {
        lastErr = new Error(`Upstream returned ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Data source unreachable");
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
  const data = await yahoo(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`);
  const quotes: any[] = data?.quotes ?? [];
  return quotes
    .filter((x) => typeof x.symbol === "string" && /\.(NS|BO)$/i.test(x.symbol))
    .sort((a, b) => (a.symbol.endsWith(".NS") ? -1 : 1) - (b.symbol.endsWith(".NS") ? -1 : 1))
    .map((x) => ({ symbol: x.symbol as string, name: (x.longname || x.shortname || x.symbol) as string }));
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
  const matches = await searchSymbol(input);
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
