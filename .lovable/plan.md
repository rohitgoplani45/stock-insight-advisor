# Add an IPO Watch page with live GMP, subscription and filters

## What changes for the user

A new **IPO Watch** page appears in the app. It lists Indian IPOs (mainboard + SME) with live data pulled from an external tracker, plus a quick reasoning label for each IPO.

### What the new page shows
- **Live IPO table/cards**: company name, status (Open / Upcoming / Closed / Listed), board (Mainboard / SME), price band, lot size, issue dates, listing date, GMP (grey market premium) and subscription rate.
- **Filters**: by status and board; sort by GMP %, subscription, listing date or name.
- **Reasoning label**: each IPO gets an "Apply / Neutral / Avoid" tag with a one-line reason based on GMP, subscription heat and listing-day performance (when available).
- **Quick analyse link**: for IPOs that have already listed, a link pre-fills the main Stock Analyser with the listed symbol so users can run the full trend report.

### What stays the same
- The existing Stock Analyser flow on `/` does not change.
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
