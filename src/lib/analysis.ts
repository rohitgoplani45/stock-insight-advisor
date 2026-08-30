// Pure technical analysis helpers — no I/O, safe on client and server.

export type Candle = {
  t: number; // epoch seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Verdict = "BUY" | "WAIT" | "DON'T BUY";

export type Analysis = {
  verdict: Verdict;
  score: number;
  history: { days: number; isNewListing: boolean; hasFullYear: boolean };
  currentPrice: number;
  prevClose: number;
  dayChangePct: number;
  ma50: number | null;
  ma200: number | null;
  rsi: number | null;
  volumeTrendPct: number | null;
  high52: number;
  low52: number;
  volatilityPct: number;
  support: number;
  resistance: number;
  inputDeltaPct: number;
  priceCheck: string;
  timing: string;
  timingLikely: boolean;
  outlookDirection: "up" | "down" | "flat";
  outlookPct: number;
  outlookLow: number;
  outlookHigh: number;
  outlookTimeframe: string;
  outlookReasoning: string;
  reasons: string[];
  signals: { label: string; value: string; tone: "good" | "bad" | "neutral" }[];
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return avg(closes.slice(-period));
}

export function smaSeries(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) =>
    i + 1 < period ? null : avg(closes.slice(i + 1 - period, i + 1)),
  );
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function stdevPct(closes: number[]): number {
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    rets.push((closes[i]! - closes[i - 1]!) / closes[i - 1]!);
  }
  if (!rets.length) return 0;
  const m = avg(rets);
  const variance = avg(rets.map((r) => (r - m) ** 2));
  return Math.sqrt(variance) * 100;
}

export function analyze(candles: Candle[], inputPrice: number): Analysis {
  const closes: number[] = candles.map((c) => c.c);
  const volumes = candles.map((c) => c.v);
  const currentPrice = closes[closes.length - 1]!;
  const prevClose: number = closes[closes.length - 2] ?? currentPrice;
  const dayChangePct = ((currentPrice - prevClose) / prevClose) * 100;

  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const rsiValue = rsi(closes);

  const recentVol = avg(volumes.slice(-10));
  const baseVol = avg(volumes.slice(-60, -10));
  const volumeTrendPct = baseVol ? ((recentVol - baseVol) / baseVol) * 100 : null;

  const window = closes.slice(-252);
  const high52 = Math.max(...window);
  const low52 = Math.min(...window);
  const volatilityPct = stdevPct(closes.slice(-60));

  const recent = candles.slice(-60);
  const support = Math.min(...recent.map((c) => c.l));
  const resistance = Math.max(...recent.map((c) => c.h));

  const inputDeltaPct = ((inputPrice - currentPrice) / currentPrice) * 100;

  // ---- scoring ----
  let score = 0;
  const reasons: string[] = [];
  const signals: Analysis["signals"] = [];

  if (ma50 != null && ma200 != null) {
    if (ma50 > ma200) {
      score += 2;
      signals.push({ label: "Trend (50 vs 200 DMA)", value: "Golden cross — uptrend", tone: "good" });
    } else {
      score -= 2;
      signals.push({ label: "Trend (50 vs 200 DMA)", value: "Death cross — downtrend", tone: "bad" });
      reasons.push("The 50-day average sits below the 200-day average — the medium-term trend is still down.");
    }
  }

  if (ma50 != null) {
    if (currentPrice > ma50) {
      score += 1;
      signals.push({ label: "Price vs 50 DMA", value: `${pct((currentPrice / ma50 - 1) * 100)} above`, tone: "good" });
    } else {
      score -= 1;
      signals.push({ label: "Price vs 50 DMA", value: `${pct((currentPrice / ma50 - 1) * 100)} below`, tone: "bad" });
      reasons.push("Price is trading below its 50-day average, so short-term momentum is weak.");
    }
  }

  if (rsiValue != null) {
    if (rsiValue > 70) {
      score -= 2;
      signals.push({ label: "RSI (14)", value: `${rsiValue.toFixed(1)} — overbought`, tone: "bad" });
      reasons.push(`RSI at ${rsiValue.toFixed(0)} is in overbought territory; entries here often see a pullback.`);
    } else if (rsiValue < 30) {
      score += 2;
      signals.push({ label: "RSI (14)", value: `${rsiValue.toFixed(1)} — oversold`, tone: "good" });
    } else {
      score += rsiValue > 50 ? 1 : 0;
      signals.push({ label: "RSI (14)", value: `${rsiValue.toFixed(1)} — neutral`, tone: "neutral" });
    }
  }

  if (volumeTrendPct != null) {
    const rising = volumeTrendPct > 15;
    const falling = volumeTrendPct < -15;
    if (rising && currentPrice > (ma50 ?? currentPrice)) score += 1;
    if (falling) score -= 0.5;
    signals.push({
      label: "Volume (10d vs 60d)",
      value: `${pct(volumeTrendPct)} ${rising ? "surging" : falling ? "thinning" : "steady"}`,
      tone: rising ? "good" : falling ? "bad" : "neutral",
    });
    if (falling) reasons.push("Traded volumes are thinning out, which means limited conviction behind the current move.");
  }

  const fromHigh = ((currentPrice - high52) / high52) * 100;
  signals.push({
    label: "From 52-week high",
    value: pct(fromHigh),
    tone: fromHigh > -5 ? "good" : fromHigh < -25 ? "bad" : "neutral",
  });
  if (fromHigh > -2) {
    score -= 0.5;
    reasons.push("The stock is right at its 52-week high, so you'd be buying with little margin of safety.");
  }

  // Entry price quality
  if (inputDeltaPct > 3) {
    score -= 1.5;
    reasons.push(
      `Your entry of ₹${fmt(inputPrice)} is ${pct(inputDeltaPct)} above the market price of ₹${fmt(currentPrice)} — you'd be overpaying today.`,
    );
  } else if (inputDeltaPct < -2) {
    score += 1;
  }

  let verdict: Verdict;
  if (score >= 3 && inputDeltaPct <= 2) verdict = "BUY";
  else if (score <= -1.5) verdict = "DON'T BUY";
  else verdict = "WAIT";

  if (verdict !== "DON'T BUY" && reasons.length === 0) {
    reasons.push("No major red flags in the current trend structure.");
  }

  // Price check text
  const priceCheck =
    Math.abs(inputDeltaPct) < 0.75
      ? `Your price is effectively at market — a fair entry on today's tape.`
      : inputDeltaPct > 0
        ? `You're offering ${pct(inputDeltaPct)} above the market price. Placing a limit order at or below ₹${fmt(currentPrice)} saves you ₹${fmt(inputPrice - currentPrice)} per share.`
        : `Your price is ${pct(Math.abs(inputDeltaPct))} below market — a disciplined entry, but it may not fill unless the stock dips.`;

  // Timing
  const dipTarget = Math.max(support, currentPrice * (1 - volatilityPct * 0.02));
  const daysToDip = Math.round(Math.max(3, ((currentPrice - dipTarget) / currentPrice) * 100 / Math.max(volatilityPct, 0.4)));
  const timingLikely = rsiValue != null && (rsiValue > 62 || currentPrice > (ma50 ?? 0) * 1.08);
  const timing = timingLikely
    ? `A better entry looks likely. With this stock's recent swing of about ${volatilityPct.toFixed(1)}% a day, a pullback toward ₹${fmt(dipTarget)} is plausible within roughly ${daysToDip}–${daysToDip * 3} trading days.`
    : `No obvious cheaper window. The stock is not stretched, so waiting risks chasing it higher; staggering your buy across 2–3 tranches is the sensible play.`;

  // Outlook
  const momentum = ma50 && ma200 ? (ma50 / ma200 - 1) * 100 : 0;
  const trendPct = ((currentPrice - ((closes[closes.length - 64] ?? currentPrice))) / ((closes[closes.length - 64] ?? currentPrice))) * 100;
  let outlookPct = momentum * 1.2 + trendPct * 0.35 + (score - 1) * 1.1;
  outlookPct = Math.max(-28, Math.min(32, outlookPct));
  const band = Math.max(3, volatilityPct * 4);
  const outlookDirection = outlookPct > 2 ? "up" : outlookPct < -2 ? "down" : "flat";
  const outlookTimeframe = "next 3–6 months";
  const outlookReasoning =
    `${outlookDirection === "up" ? "The structure is constructive" : outlookDirection === "down" ? "The structure is deteriorating" : "The structure is range-bound"}: ` +
    `${ma50 && ma200 ? (ma50 > ma200 ? "the 50-day average is holding above the 200-day" : "the 50-day average is trailing the 200-day") : "moving averages are still forming"}, ` +
    `RSI is at ${rsiValue?.toFixed(0) ?? "n/a"}, and volumes are ${volumeTrendPct != null && volumeTrendPct > 15 ? "expanding" : volumeTrendPct != null && volumeTrendPct < -15 ? "contracting" : "steady"}. ` +
    `Extending that trend, a move of roughly ${pct(outlookPct)} over the ${outlookTimeframe} is the base case, with support near ₹${fmt(support)} and resistance near ₹${fmt(resistance)}.`;

  return {
    verdict,
    score,
    currentPrice,
    prevClose,
    dayChangePct,
    ma50,
    ma200,
    rsi: rsiValue,
    volumeTrendPct,
    high52,
    low52,
    volatilityPct,
    support,
    resistance,
    inputDeltaPct,
    priceCheck,
    timing,
    timingLikely,
    outlookDirection,
    outlookPct,
    outlookLow: outlookPct - band,
    outlookHigh: outlookPct + band,
    outlookTimeframe,
    outlookReasoning,
    reasons,
    signals,
  };
}

export function fmt(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}
