import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { analyze, type Analysis, type Candle } from "./analysis";
import { findPeers } from "./peers";
import { resolveAndFetch, fetchChart, searchSymbol } from "./stock.server";

export type Alternative = {
  symbol: string;
  name: string;
  price: number;
  changePct6m: number;
  note: string;
};

export type Report = {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  quantity: number;
  inputPrice: number;
  generatedAt: string;
  candles: Candle[];
  analysis: Analysis;
  alternatives: Alternative[];
};

export const analyzeStock = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        query: z.string().min(1).max(60),
        quantity: z.number().positive().max(10_000_000),
        inputPrice: z.number().positive().max(10_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<Report> => {
    const quote = await resolveAndFetch(data.query);
    const analysis = analyze(quote.candles, data.inputPrice);
    const { sector, peers } = findPeers(quote.symbol);

    let alternatives: Alternative[] = [];
    if (analysis.verdict !== "BUY") {
      const results = await Promise.all(
        peers.slice(0, 4).map(async (p) => {
          try {
            const pq = await fetchChart(p.symbol, "1y");
            const pa = analyze(pq.candles, pq.candles[pq.candles.length - 1]!.c);
            const closes = pq.candles.map((c) => c.c);
            const past = closes[Math.max(0, closes.length - 126)]!;
            const changePct6m = ((pa.currentPrice - past) / past) * 100;
            return {
              symbol: p.symbol,
              name: p.name,
              price: pa.currentPrice,
              changePct6m,
              score: pa.score,
              rsi: pa.rsi ?? 50,
            };
          } catch {
            return null;
          }
        }),
      );
      alternatives = results
        .filter((r): r is NonNullable<typeof r> => r !== null && r.score > analysis.score)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((r) => ({
          symbol: r.symbol,
          name: r.name,
          price: r.price,
          changePct6m: r.changePct6m,
          note: `Stronger trend structure — RSI ${r.rsi.toFixed(0)}, ${r.changePct6m >= 0 ? "up" : "down"} ${Math.abs(r.changePct6m).toFixed(1)}% over 6 months.`,
        }));
    }

    return {
      symbol: quote.symbol,
      name: quote.name,
      exchange: quote.exchange,
      sector,
      quantity: data.quantity,
      inputPrice: data.inputPrice,
      generatedAt: new Date().toISOString(),
      candles: quote.candles.slice(-130),
      analysis,
      alternatives,
    };
  });

export const suggestSymbols = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ query: z.string().max(60) }).parse(data))
  .handler(async ({ data }) => {
    if (data.query.trim().length < 2) return [];
    try {
      return (await searchSymbol(data.query)).slice(0, 6);
    } catch {
      return [];
    }
  });
