# Support recently listed IPO stocks

Right now a lookup fails for freshly listed companies because the data fetch rejects any stock with fewer than 30 trading days of history, and the analysis engine assumes 50/200-day averages and a 1-year window exist. New listings (a few days to a few months old) therefore either error out or produce meaningless signals.

## What changes for the user

- Newly listed stocks can be analysed as soon as they have a handful of trading sessions.
- The report clearly labels them: a "Recently listed" badge with the number of trading days available, and a short note that the verdict is based on limited history.
- Signals that need long history (50/200 DMA, 52-week range, 6-month outlook) are either replaced with short-history equivalents or shown as "not enough history yet" instead of misleading numbers.
- The verdict stays honest: with very little history the app leans to WAIT rather than a confident BUY, and explains why.
- Peer alternatives still work, since they come from the sector map.

## Technical approach

**Data fetch (`src/lib/stock.server.ts`)**
- Lower the hard minimum from 30 candles to 5.
- When a 1y request returns few candles, retry with `range=max` so the full (short) listing history is captured.
- Symbol resolution unchanged; the Yahoo search already returns new NSE/BSE listings.

**Analysis (`src/lib/analysis.ts`)**
- Add `history: { days: number; isNewListing: boolean }` to `Analysis` (new listing = under ~120 trading days).
- Guard every long-window computation: MA50/MA200, 52-week range, and the `-252`/`-126` slices fall back to whatever data exists and return `null` when the window is not covered.
- Scoring: when MAs are missing, use short-window substitutes (price vs 10/20-day average, RSI when at least 15 candles exist) with reduced weight, and cap the score so BUY needs enough history; otherwise WAIT with the reason "listed too recently to confirm a trend".
- Outlook: shorten the timeframe label to "next 1–3 months" and widen the range band for new listings.
- Timing text acknowledges post-IPO volatility and lock-in/anchor-investor unlock behaviour in general terms.

**UI (`src/components/ReportView.tsx`, `src/components/SnapshotCard.tsx`)**
- Badge next to the symbol when `isNewListing`, e.g. "Recently listed · 34 trading days".
- Signal rows and the 52-week range render "Not enough history" instead of blank/NaN values.
- Chart section title switches from "Price history · 6 months" to "Price history · since listing" when history is short.

No database or logging changes.
