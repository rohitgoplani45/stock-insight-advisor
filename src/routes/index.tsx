import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, ImageDown, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ReportView } from "@/components/ReportView";
import { SnapshotCard } from "@/components/SnapshotCard";
import { Toaster } from "@/components/ui/sonner";
import { downloadFile, fetchLog, saveReport, toCsv, type LogRow } from "@/lib/log";
import { analyzeStock, type Report } from "@/lib/stock.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stock Analyser — Should you buy at that price?" },
      {
        name: "description",
        content:
          "Enter an NSE or BSE stock, quantity and your intended price for an instant trend-based verdict, entry check, chart and outlook.",
      },
      { property: "og:title", content: "Stock Analyser — Should you buy at that price?" },
      {
        property: "og:description",
        content: "A private-wealth style advisory read on any Indian stock in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const runAnalysis = useServerFn(analyzeStock);
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [snapping, setSnapping] = useState(false);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadLog = useCallback(async () => setLog(await fetchLog()), []);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    const px = Number(price);
    if (!query.trim() || !(qty > 0) || !(px > 0)) {
      setError("Enter a stock, a quantity and the price you're considering.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await runAnalysis({ data: { query: query.trim(), quantity: qty, inputPrice: px } });
      setReport(result);
      const row = await saveReport(result);
      if (row) setLog((prev) => [row, ...prev]);
      requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "Something went wrong fetching that stock.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadSnapshot() {
    if (!snapshotRef.current || !report) return;
    setSnapping(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(snapshotRef.current, {
        pixelRatio: 2,
        backgroundColor: "#221f1b",
        cacheBust: true,
      });
      if (!blob) throw new Error("Could not render the snapshot.");
      downloadFile(`${report.symbol.replace(/\W/g, "")}-analysis.png`, blob, "image/png");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Snapshot failed.");
    } finally {
      setSnapping(false);
    }
  }

  function downloadCsv() {
    if (!log.length) {
      toast.error("No queries logged yet.");
      return;
    }
    downloadFile(`stock-analyser-log-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(log));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pt-12 pb-24 sm:px-6 sm:pt-20">
      <Toaster />

      <header className="mb-10 text-center">
        <p className="eyebrow">NSE · BSE advisory</p>
        <h1 className="gold-text mt-3 text-4xl leading-none font-semibold sm:text-5xl">Stock Analyser</h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-md text-sm">
          One question, one considered answer: should you buy this stock, at this price, today?
        </p>
      </header>

      <form onSubmit={onSubmit} className="panel space-y-5 p-5 sm:p-7">
        <div>
          <label htmlFor="stock" className="eyebrow">
            Stock name or symbol
          </label>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              id="stock"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tata Motors or TATAMOTORS"
              autoComplete="off"
              className="border-border bg-[color:var(--surface-raised)] focus:border-[color:var(--gold)] focus:ring-0 h-12 w-full rounded-lg border pr-3 pl-9 text-base outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="qty" className="eyebrow">
              Quantity
            </label>
            <input
              id="qty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              className="num border-border bg-[color:var(--surface-raised)] focus:border-[color:var(--gold)] mt-2 h-12 w-full rounded-lg border px-3 text-base outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="px" className="eyebrow">
              Price per share (₹)
            </label>
            <input
              id="px"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1450"
              className="num border-border bg-[color:var(--surface-raised)] focus:border-[color:var(--gold)] mt-2 h-12 w-full rounded-lg border px-3 text-base outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="text-[color:var(--primary-foreground)] flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundImage: "var(--gradient-gold)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Reading the tape" : "Analyse"}
        </button>

        {error && <p className="text-[color:var(--negative)] text-sm">{error}</p>}
      </form>

      <div ref={reportRef} className="scroll-mt-6">
        {report && (
          <div className="mt-10 space-y-5">
            <ReportView report={report} />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadSnapshot}
                disabled={snapping}
                className="border-border hover:border-[color:var(--gold)] flex h-11 items-center gap-2 rounded-lg border px-4 text-sm transition-colors disabled:opacity-60"
              >
                {snapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
                Download snapshot
              </button>
              <button
                onClick={downloadCsv}
                className="border-border hover:border-[color:var(--gold)] flex h-11 items-center gap-2 rounded-lg border px-4 text-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                Download log as CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Query log */}
      <section className="mt-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow font-sans">Query log</h2>
          {log.length > 0 && (
            <button onClick={downloadCsv} className="text-[color:var(--gold)] text-xs hover:underline">
              Export CSV
            </button>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-muted-foreground text-sm">No queries yet. Your first analysis will show up here.</p>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground eyebrow border-border border-b">
                  <th className="p-3 font-normal">Date</th>
                  <th className="p-3 font-normal">Stock</th>
                  <th className="p-3 text-right font-normal">Qty</th>
                  <th className="p-3 text-right font-normal">Your price</th>
                  <th className="p-3 text-right font-normal">Market</th>
                  <th className="p-3 text-right font-normal">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 25).map((r) => (
                  <tr key={r.id} className="border-border/60 border-b last:border-0">
                    <td className="num text-muted-foreground p-3 text-xs">
                      {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="p-3">{r.stock_name}</td>
                    <td className="num p-3 text-right">{r.quantity}</td>
                    <td className="num p-3 text-right">₹{Number(r.input_price).toFixed(2)}</td>
                    <td className="num p-3 text-right">₹{Number(r.current_price).toFixed(2)}</td>
                    <td
                      className={`num p-3 text-right text-xs ${
                        r.verdict === "BUY"
                          ? "text-[color:var(--positive)]"
                          : r.verdict === "WAIT"
                            ? "text-[color:var(--gold)]"
                            : "text-[color:var(--negative)]"
                      }`}
                    >
                      {r.verdict}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-muted-foreground mt-12 text-center text-xs">
        Trend-based analysis, not financial advice. Data via a free Yahoo Finance feed and may lag.
      </p>

      {/* Offscreen snapshot render target */}
      {report && (
        <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
          <SnapshotCard report={report} innerRef={snapshotRef} />
        </div>
      )}
    </main>
  );
}
