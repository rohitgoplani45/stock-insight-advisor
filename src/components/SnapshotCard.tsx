import { PriceChart } from "@/components/PriceChart";
import { fmt, pct, type Verdict } from "@/lib/analysis";
import type { Report } from "@/lib/stock.functions";

const verdictColor: Record<Verdict, string> = {
  BUY: "var(--positive)",
  WAIT: "var(--gold)",
  "DON'T BUY": "var(--negative)",
};

/** Fixed-width card rendered offscreen and rasterised to PNG for sharing. */
export function SnapshotCard({ report, innerRef }: { report: Report; innerRef: React.Ref<HTMLDivElement> }) {
  const a = report.analysis;
  const closes = report.candles.map((c) => c.c);

  return (
    <div
      ref={innerRef}
      style={{
        width: 900,
        padding: 48,
        background: "linear-gradient(180deg, oklch(0.21 0.009 78), oklch(0.155 0.007 75))",
        color: "var(--foreground)",
        fontFamily: "var(--font-sans)",
        border: "1px solid var(--hairline)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">
            {report.exchange} · {report.symbol}
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 34, marginTop: 4 }}>{report.name}</p>
        </div>
        <p className="eyebrow" style={{ textAlign: "right" }}>
          Stock Analyser
          <br />
          {new Date(report.generatedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="hairline-rule" style={{ margin: "28px 0" }} />

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
        <div>
          <p className="eyebrow">Verdict</p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 64,
              lineHeight: 1,
              fontWeight: 600,
              color: verdictColor[a.verdict],
            }}
          >
            {a.verdict}
          </p>
        </div>
        <div style={{ display: "flex", gap: 36, textAlign: "right" }}>
          {[
            { k: "Market", v: `₹${fmt(a.currentPrice)}` },
            { k: "Your price", v: `₹${fmt(report.inputPrice)}` },
            { k: "vs market", v: pct(a.inputDeltaPct) },
            { k: `Outlook ${a.outlookTimeframe.replace("next ", "")}`, v: pct(a.outlookPct) },
          ].map((i) => (
            <div key={i.k}>
              <p className="eyebrow">{i.k}</p>
              <p className="num" style={{ fontSize: 22, marginTop: 4 }}>
                {i.v}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <PriceChart candles={report.candles} allCloses={closes} inputPrice={report.inputPrice} compact />
      </div>

      <p style={{ marginTop: 22, fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
        {a.outlookReasoning}
      </p>

      <div className="hairline-rule" style={{ margin: "24px 0 14px" }} />
      <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
        Trend-based analysis, not financial advice. Markets are unpredictable — invest at your own discretion.
      </p>
    </div>
  );
}
