import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ipoReasoning, statusLabel, type IpoCall } from "@/lib/ipo-verdict";
import { getIpos, type Ipo, type IpoStatus } from "@/lib/ipo.functions";

export const Route = createFileRoute("/ipo")({
  head: () => ({
    meta: [
      { title: "IPO Watch — Live GMP, subscription and listing gains" },
      {
        name: "description",
        content:
          "Track every open, upcoming and recently listed Indian IPO with live grey market premium, subscription figures and a plain-English apply-or-avoid read.",
      },
      { property: "og:title", content: "IPO Watch — Live GMP and subscription tracker" },
      {
        property: "og:description",
        content: "Mainboard and SME IPOs with GMP, subscription and listing-gain reasoning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IpoPage,
});

const STATUSES: { key: IpoStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closing", label: "Closing today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "closed", label: "Closed" },
  { key: "listed", label: "Listed" },
];

const BOARDS = ["All", "Mainboard", "SME"] as const;
const SORTS = [
  { key: "gmp", label: "GMP %" },
  { key: "sub", label: "Subscription" },
  { key: "listing", label: "Listing date" },
  { key: "name", label: "Name" },
] as const;

const callTone: Record<IpoCall, string> = {
  Apply: "text-[color:var(--positive)] border-[color:var(--positive)]/40",
  Neutral: "text-[color:var(--gold)] border-[color:var(--gold)]/40",
  Avoid: "text-[color:var(--negative)] border-[color:var(--negative)]/40",
};

function monthIndex(d: string | null): number {
  if (!d) return -1;
  const m = d.match(/(\d{1,2})-([A-Za-z]{3})/);
  if (!m) return -1;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return months.indexOf(m[2]!.toLowerCase()) * 31 + Number(m[1]);
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="eyebrow">{k}</p>
      <p className="num mt-1 text-sm">{v}</p>
    </div>
  );
}

function IpoCard({ ipo }: { ipo: Ipo }) {
  const r = ipoReasoning(ipo);
  return (
    <article className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {ipo.board} · {statusLabel[ipo.status]}
          </p>
          <h3 className="font-display mt-1 text-lg leading-tight">{ipo.name}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] tracking-wide uppercase ${callTone[r.call]}`}>
          {r.call}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Field k="GMP" v={ipo.gmp == null ? "—" : `₹${ipo.gmp} (${(ipo.gmpPct ?? 0).toFixed(1)}%)`} />
        <Field k="Subscription" v={ipo.subscription == null ? "—" : `${ipo.subscription}x`} />
        <Field k="Price" v={ipo.price == null ? "—" : `₹${ipo.price}`} />
        <Field k="Lot" v={ipo.lot == null ? "—" : String(ipo.lot)} />
        <Field k="Issue size" v={ipo.issueSize ?? "—"} />
        <Field k="Open · Close" v={`${ipo.openDate ?? "—"} · ${ipo.closeDate ?? "—"}`} />
        <Field k="Allotment" v={ipo.allotmentDate ?? "—"} />
        <Field
          k={ipo.status === "listed" ? "Listed at" : "Listing"}
          v={
            ipo.status === "listed" && ipo.listingPrice != null
              ? `₹${ipo.listingPrice} (${(ipo.listingGainPct ?? 0).toFixed(1)}%)`
              : (ipo.listingDate ?? "—")
          }
        />
      </div>

      <p className="text-muted-foreground text-sm">{r.reason}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          {Array.from({ length: Math.max(1, ipo.rating) }).map((_, i) => (
            <Flame key={i} className="h-3.5 w-3.5 text-[color:var(--gold)]" strokeWidth={1.5} />
          ))}
          <span className="ml-2">{ipo.anchor ? "Anchor investors in" : "No anchor book"}</span>
        </span>
        {ipo.status === "listed" && (
          <Link
            to="/"
            search={{ q: ipo.name }}
            className="text-xs text-[color:var(--gold)] hover:underline"
          >
            Analyse this stock →
          </Link>
        )}
      </div>
    </article>
  );
}

function IpoPage() {
  const fetchIpos = useServerFn(getIpos);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["ipos"],
    queryFn: () => fetchIpos(),
    staleTime: 5 * 60 * 1000,
  });

  const [status, setStatus] = useState<IpoStatus | "all">("all");
  const [board, setBoard] = useState<(typeof BOARDS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("gmp");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = data?.ipos ?? [];
    const term = q.trim().toLowerCase();
    const filtered = all.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (board === "Mainboard" && i.board !== "Mainboard") return false;
      if (board === "SME" && i.board === "Mainboard") return false;
      if (term && !i.name.toLowerCase().includes(term)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "gmp") return (b.gmpPct ?? -1) - (a.gmpPct ?? -1);
      if (sort === "sub") return (b.subscription ?? -1) - (a.subscription ?? -1);
      if (sort === "listing") return monthIndex(b.listingDate) - monthIndex(a.listingDate);
      return a.name.localeCompare(b.name);
    });
  }, [data, status, board, sort, q]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pt-12 pb-24 sm:px-6 sm:pt-20">
      <header className="mb-8 text-center">
        <p className="eyebrow">Mainboard · SME</p>
        <h1 className="gold-text mt-3 text-4xl leading-none font-semibold sm:text-5xl">IPO Watch</h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm">
          Live grey market premium, subscription and listing-gain data, with a plain-English read on
          each issue.
        </p>
        <Link to="/" className="mt-4 inline-block text-xs text-[color:var(--gold)] hover:underline">
          ← Back to Stock Analyser
        </Link>
      </header>

      <div className="panel space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search IPOs"
            className="border-border bg-[color:var(--surface-raised)] focus:border-[color:var(--gold)] h-11 w-full rounded-lg border pr-3 pl-9 text-sm outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                status === s.key
                  ? "border-[color:var(--gold)] text-[color:var(--gold)]"
                  : "border-border text-muted-foreground hover:border-[color:var(--gold)]/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {BOARDS.map((b) => (
              <button
                key={b}
                onClick={() => setBoard(b)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  board === b
                    ? "border-[color:var(--gold)] text-[color:var(--gold)]"
                    : "border-border text-muted-foreground hover:border-[color:var(--gold)]/50"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="eyebrow">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number]["key"])}
              className="border-border bg-[color:var(--surface-raised)] h-9 rounded-lg border px-2 text-xs outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => void refetch()}
              className="border-border hover:border-[color:var(--gold)] flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground mt-10 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the IPO board
        </p>
      ) : data?.error ? (
        <div className="panel mt-6 p-6 text-center">
          <p className="text-sm text-[color:var(--negative)]">{data.error}</p>
          <button
            onClick={() => void refetch()}
            className="border-border hover:border-[color:var(--gold)] mt-4 rounded-lg border px-4 py-2 text-xs transition-colors"
          >
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center text-sm">
          No IPOs match these filters.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {rows.map((ipo) => (
            <IpoCard key={`${ipo.name}-${ipo.board}`} ipo={ipo} />
          ))}
        </div>
      )}

      <p className="text-muted-foreground mt-12 text-center text-xs">
        GMP is unofficial grey-market chatter sourced from a public tracker — it is an indicator of
        sentiment, not a price guarantee. Not financial advice.
      </p>
    </main>
  );
}
