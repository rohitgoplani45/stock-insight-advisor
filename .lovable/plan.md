# IPO Watch page + a proper stock search box

Two things: a new IPO Watch page with live GMP/subscription data, and a real searchable stock picker on the analyser so you no longer have to type the exact company name.

## Part 1 — Smarter stock search (analyser page)

Today the stock field is a plain text box: it only works if you type a close-enough name or the exact ticker, and a typo returns "couldn't find".

What changes:
- As you type (from 2 characters), a dropdown shows matching NSE/BSE companies with their name, ticker and exchange — pick one instead of typing it perfectly.
- Typo tolerance: results are matched loosely, so "relaince", "hdfc bnk" or "tata mtrs" still surface the right company.
- Keyboard support (arrow keys + Enter), click to select, and the chosen company is shown as a confirmed chip so you know exactly which stock will be analysed.
- Recent searches appear when the box is empty.
- If nothing matches, a clear "no match — try the ticker" hint instead of a failed analysis.

## Part 2 — IPO Watch page

A new **IPO Watch** page appears in the app. It lists Indian IPOs (mainboard + SME) with live data pulled from an external tracker, plus a quick reasoning label for each IPO.

### What the new page shows
- **Live IPO table/cards**: company name, status (Open / Upcoming / Closed / Listed), board (Mainboard / SME), price band, lot size, issue dates, listing date, GMP (grey market premium) and subscription rate.
- **Filters**: by status and board; sort by GMP %, subscription, listing date or name.
- **Reasoning label**: each IPO gets an "Apply / Neutral / Avoid" tag with a one-line reason based on GMP, subscription heat and listing-day performance (when available).
- **Quick analyse link**: for IPOs that have already listed, a link pre-fills the main Stock Analyser with the listed symbol so users can run the full trend report.

### What stays the same
- The analysis logic, report and verdict on `/` are unchanged — only the search input gets better.
- No database schema changes are needed; IPO data is fetched on demand and cached briefly in memory.


## Technical approach

1. **Data source**
   - Use InvestorGain's public GMP page, fetched via the existing `r.jina.ai` relay (the same pattern already used for Yahoo Finance fallbacks).
   - Parse the markdown table into structured IPO records: name, symbol, status, board, price, lot, GMP, GMP %, subscription, dates, anchor flag.
   - Cache results for ~10 minutes to avoid hammering the source.

2. **Server function**
   - Create `src/lib/ipo.server.ts` for fetching + parsing.
   - Expose `src/lib/ipo.functions.ts` with `getIpos()` returning the cleaned list.
   - Keep the parser tolerant of missing/"--" cells so the page still renders when a field is blank.

3. **New route**
   - Add `src/routes/ipo.tsx` mapped to `/ipo`.
   - Render filter chips, a search box, sort dropdown, and a responsive card grid.
   - Use existing Tailwind tokens and panel styles for consistency.

4. **Navigation**
   - Add an "IPO Watch" link in the header on `/` and in the root layout so users can switch between the two tools.

5. **Error handling**
   - If the external tracker is unreachable, show a friendly message with a retry button instead of crashing the page.

6. **Stock search typeahead**
   - Reuse the existing `searchSymbol` server function (Yahoo search, already filtered to `.NS`/`.BO`), exposed through a debounced (~250ms) server-function call from the input.
   - Add a local fuzzy-rank pass over the returned matches so near-miss spellings order sensibly, and keep a small in-memory cache of recent queries.
   - New `src/components/StockSearch.tsx` with an accessible combobox (listbox roles, arrow/Enter/Escape handling); selecting an option stores the resolved ticker and passes it to `analyzeStock` so resolution can't drift.
   - Recent selections persisted in `localStorage`, read after hydration to avoid SSR mismatch.

