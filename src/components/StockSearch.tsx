import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { suggestSymbols } from "@/lib/stock.functions";

export type StockPick = { symbol: string; name: string };

const RECENTS_KEY = "stock-analyser:recents";

/** Cheap subsequence + token score so near-miss spellings still rank sensibly. */
function score(query: string, candidate: string): number {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  const c = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!q) return 0;
  if (c.startsWith(q)) return 100;
  if (c.includes(q)) return 80;
  let i = 0;
  let hits = 0;
  for (const ch of c) {
    if (ch === q[i]) {
      i++;
      hits++;
      if (i === q.length) break;
    }
  }
  return (hits / q.length) * 60;
}

function readRecents(): StockPick[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed.slice(0, 5) as StockPick[]) : [];
  } catch {
    return [];
  }
}

export function rememberStock(pick: StockPick) {
  try {
    const next = [pick, ...readRecents().filter((r) => r.symbol !== pick.symbol)].slice(0, 5);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function StockSearch({
  value,
  onChange,
  selected,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  selected: StockPick | null;
  onSelect: (pick: StockPick | null) => void;
}) {
  const suggest = useServerFn(suggestSymbols);
  const [options, setOptions] = useState<StockPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<StockPick[]>([]);
  const [searched, setSearched] = useState(false);
  const cache = useRef(new Map<string, StockPick[]>());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setRecents(readRecents()), []);

  useEffect(() => {
    const q = value.trim();
    if (selected || q.length < 2) {
      setOptions([]);
      setSearched(false);
      return;
    }
    const cached = cache.current.get(q.toLowerCase());
    if (cached) {
      setOptions(cached);
      setSearched(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void suggest({ data: { query: q } })
        .then((res) => {
          if (cancelled) return;
          const ranked = [...res]
            .map((r) => ({ ...r, s: Math.max(score(q, r.name), score(q, r.symbol)) }))
            .sort((a, b) => b.s - a.s)
            .map(({ symbol, name }) => ({ symbol, name }));
          cache.current.set(q.toLowerCase(), ranked);
          setOptions(ranked);
          setActive(0);
          setSearched(true);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setLoading(false);
      clearTimeout(timer);
    };
  }, [value, selected, suggest]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const list = useMemo(
    () => (value.trim().length < 2 ? recents : options),
    [value, recents, options],
  );

  function choose(pick: StockPick) {
    onSelect(pick);
    onChange(pick.name);
    rememberStock(pick);
    setRecents(readRecents());
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % list.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + list.length) % list.length);
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      choose(list[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative mt-2">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          id="stock"
          role="combobox"
          aria-expanded={open}
          aria-controls="stock-listbox"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onSelect(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Start typing — e.g. relaince, hdfc bnk, INFY"
          autoComplete="off"
          className="border-border bg-[color:var(--surface-raised)] focus:border-[color:var(--gold)] h-12 w-full rounded-lg border pr-10 pl-9 text-base outline-none transition-colors focus:ring-0"
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {loading ? (
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          ) : selected ? (
            <button
              type="button"
              aria-label="Clear selected stock"
              onClick={() => {
                onSelect(null);
                onChange("");
              }}
            >
              <X className="text-muted-foreground hover:text-foreground h-4 w-4" />
            </button>
          ) : null}
        </span>
      </div>

      {selected && (
        <p className="mt-2 flex items-center gap-2 text-xs text-[color:var(--gold)]">
          <Check className="h-3.5 w-3.5" />
          {selected.name} · {selected.symbol}
        </p>
      )}

      {!selected && searched && !loading && value.trim().length >= 2 && options.length === 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          No match found — try the exchange ticker instead (e.g. INFY, RELIANCE).
        </p>
      )}

      {open && list.length > 0 && (
        <ul
          id="stock-listbox"
          role="listbox"
          className="border-border bg-[color:var(--surface-raised)] absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-lg border shadow-xl"
        >
          {value.trim().length < 2 && (
            <li className="eyebrow text-muted-foreground px-3 pt-3 pb-1">Recent</li>
          )}
          {list.map((o, i) => (
            <li key={o.symbol} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  i === active ? "bg-[color:var(--gold)]/10" : ""
                }`}
              >
                <span className="truncate">{o.name}</span>
                <span className="num text-muted-foreground shrink-0 text-xs">
                  {o.symbol.replace(/\.NS$/, " · NSE").replace(/\.BO$/, " · BSE")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
