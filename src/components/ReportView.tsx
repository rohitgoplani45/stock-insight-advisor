import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { OutlookChart } from "@/components/OutlookChart";
import { PriceChart } from "@/components/PriceChart";
import { fmt, pct, type Verdict } from "@/lib/analysis";
import type { Report } from "@/lib/stock.functions";

const verdictTone: Record<Verdict, string> = {
  BUY: "text-[color:var(--positive)]",
  WAIT: "text-[color:var(--gold)]",
  "DON'T BUY": "text-[color:var(--negative)]",
};

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section className="rise panel p-5 sm:p-7" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="eyebrow mb-4 font-sans">{title}</h2>
      {children}
    </section>
  );
}

export function ReportView({ report }: { report: Report }) {
  const a = report.analysis;
  const closes = report.candles.map((c) => c.c);
  const delta = report.inputPrice - a.currentPrice;
  const DirIcon = a.outlookDirection === "up" ? ArrowUpRight : a.outlookDirection === "down" ? ArrowDownRight : ArrowRight;

  return (
    <div className="space-y-5">
      {/* VERDICT */}
      <section className="rise panel relative overflow-hidden p-6 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">
              {report.exchange} · {report.symbol}
            </p>
            <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">{report.name}</h1>
            {a.history.isNewListing && (
              <span className="mt-2 inline-block rounded-full border border-[color:var(--gold)]/40 px-3 py-1 text-[11px] tracking-wide text-[color:var(--gold)] uppercase">
                Recently listed · {a.history.days} trading days
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="eyebrow">Market price</p>
            <p className="num mt-1 text-2xl">₹{fmt(a.currentPrice)}</p>
            <p
              className={`num text-xs ${a.dayChangePct >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]"}`}
            >
              {pct(a.dayChangePct)} today
            </p>
          </div>
        </div>

        <div className="hairline-rule my-6" />

        <p className="eyebrow">Verdict</p>
        <p
          className={`sheen-in font-display text-5xl leading-none font-semibold sm:text-6xl ${verdictTone[a.verdict]}`}
          style={{ animationDelay: "120ms" }}
        >
          {a.verdict}
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
          {a.verdict === "BUY"
            ? "Trend, momentum and your entry price all line up. Enter with a plan and a stop."
            : a.verdict === "WAIT"
              ? "Nothing broken, but nothing compelling at this price. Patience is the edge here."
              : "The signals argue against putting fresh money in at this level."}
        </p>
        {a.history.isNewListing && (
          <p className="mt-3 max-w-2xl text-sm text-[color:var(--gold)]">
            This stock has only {a.history.days} trading sessions since listing, so this verdict is based on limited
            history and carries lower confidence than usual.
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { k: "Your price", v: `₹${fmt(report.inputPrice)}` },
            { k: "Quantity", v: report.quantity.toLocaleString("en-IN") },
            { k: "Total outlay", v: `₹${fmt(report.inputPrice * report.quantity)}` },
            { k: "vs market", v: pct(a.inputDeltaPct) },
          ].map((item) => (
            <div key={item.k}>
              <p className="eyebrow">{item.k}</p>
              <p className="num mt-1 text-base">{item.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICE CHECK */}
      <Section title="Price check" delay={60}>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <div>
            <p className="eyebrow">Your entry</p>
            <p className="num text-xl">₹{fmt(report.inputPrice)}</p>
          </div>
          <div>
            <p className="eyebrow">Delta per share</p>
            <p
              className={`num text-xl ${delta > 0 ? "text-[color:var(--negative)]" : "text-[color:var(--positive)]"}`}
            >
              {delta > 0 ? "+" : ""}
              {fmt(delta)}
            </p>
          </div>
          <div>
            <p className="eyebrow">On {report.quantity.toLocaleString("en-IN")} shares</p>
            <p
              className={`num text-xl ${delta > 0 ? "text-[color:var(--negative)]" : "text-[color:var(--positive)]"}`}
            >
              {delta > 0 ? "+" : ""}
              {fmt(delta * report.quantity)}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">{a.priceCheck}</p>
      </Section>

      {/* CHART */}
      <Section title={a.history.isNewListing ? "Price history · since listing" : "Price history · 6 months"} delay={120}>
        <PriceChart candles={report.candles} allCloses={closes} inputPrice={report.inputPrice} />
        <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <span className="flex items-center gap-2">
            <span className="bg-foreground inline-block h-px w-5" /> Close
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-px w-5 bg-[color:var(--gold)]" /> 50 DMA
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-px w-5 bg-[color:var(--bronze)]" /> 200 DMA
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-px w-5 border-t border-dashed border-[color:var(--gold)]" /> Your price
          </span>
        </div>
      </Section>

      {/* SIGNALS */}
      <Section title="Signals" delay={160}>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {a.signals.map((s) => (
            <div key={s.label} className="border-border/60 flex items-baseline justify-between gap-4 border-b pb-2">
              <span className="text-muted-foreground text-sm">{s.label}</span>
              <span
                className={`num text-sm ${
                  s.tone === "good"
                    ? "text-[color:var(--positive)]"
                    : s.tone === "bad"
                      ? "text-[color:var(--negative)]"
                      : "text-foreground"
                }`}
              >
                {s.value}
              </span>
            </div>
          ))}
          <div className="border-border/60 flex items-baseline justify-between gap-4 border-b pb-2">
            <span className="text-muted-foreground text-sm">
              {a.history.hasFullYear ? "52-week range" : "Range since listing"}
            </span>
            <span className="num text-sm">
              ₹{fmt(a.low52)} – ₹{fmt(a.high52)}
            </span>
          </div>
          <div className="border-border/60 flex items-baseline justify-between gap-4 border-b pb-2">
            <span className="text-muted-foreground text-sm">Support / resistance</span>
            <span className="num text-sm">
              ₹{fmt(a.support)} / ₹{fmt(a.resistance)}
            </span>
          </div>
        </div>
      </Section>

      {/* TIMING */}
      <Section title="Timing" delay={200}>
        <p className="font-display text-xl">
          {a.timingLikely ? "A better entry looks likely" : "No clearly cheaper window ahead"}
        </p>
        <p className="text-muted-foreground mt-3 text-sm">{a.timing}</p>
      </Section>

      {/* OUTLOOK */}
      <Section title={`Outlook · ${a.outlookTimeframe}`} delay={240}>
        <div className="flex items-center gap-3">
          <DirIcon className="h-7 w-7 text-[color:var(--gold)]" strokeWidth={1.5} />
          <span className="num text-3xl text-[color:var(--gold)]">{pct(a.outlookPct)}</span>
          <span className="text-muted-foreground text-sm">
            base case · range {pct(a.outlookLow)} to {pct(a.outlookHigh)}
          </span>
        </div>
        <div className="mt-5">
          <OutlookChart
            currentPrice={a.currentPrice}
            lowPct={a.outlookLow}
            basePct={a.outlookPct}
            highPct={a.outlookHigh}
          />
        </div>
        <p className="text-muted-foreground mt-4 text-sm">{a.outlookReasoning}</p>
      </Section>

      {/* REASONS / ALTERNATIVES */}
      {a.verdict !== "BUY" && (
        <Section title={a.verdict === "DON'T BUY" ? "Why not now" : "What's holding it back"} delay={280}>
          <ul className="space-y-3">
            {a.reasons.map((r) => (
              <li key={r} className="text-muted-foreground flex gap-3 text-sm">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]" />
                {r}
              </li>
            ))}
          </ul>

          {report.alternatives.length > 0 && (
            <>
              <div className="hairline-rule my-6" />
              <p className="eyebrow mb-4">Stronger names in {report.sector}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {report.alternatives.map((alt) => (
                  <div key={alt.symbol} className="border-border bg-[color:var(--surface-raised)] rounded-lg border p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-lg">{alt.name}</p>
                      <p className="num text-sm">₹{fmt(alt.price)}</p>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">{alt.note}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      <p className="text-muted-foreground px-1 text-xs">
        This is trend-based analysis, not financial advice. Markets are unpredictable — invest at your own discretion.
      </p>
    </div>
  );
}
