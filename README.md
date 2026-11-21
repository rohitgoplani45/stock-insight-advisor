# Stock Insight Advisor

Indian Stock Advisory Tool — Project Brief & Build Prompt

What we're building (v1 scope)

A single-query web app, English only, personal use to start, publicly shareable via a link.

Flow:

User inputs: stock name, quantity, and price they're considering buying at (e.g. "Tata Motors, 10 shares, ₹1450").

App pulls current + historical price data (free NSE/BSE feed via Yahoo Finance wrapper).

App analyzes: technical indicators (moving averages, RSI, volume trends) + fundamentals/news sentiment where available.

App returns a full advisory report:

Buy / Don't Buy verdict

Whether ₹1450 is a good entry price vs. current price

Whether a better entry price is likely soon (and roughly when)

Future outlook: expected growth direction, rough % and timeframe, with reasoning

If "don't buy": clear reasons, plus alternative stock suggestions if relevant

Every query is logged as a row in an exportable spreadsheet (running personal database).

Every query also generates a clean, shareable snapshot image of that report (not PDF).

Explicitly out of scope for v1 (Phase 2):

Portfolio/transaction tracking (buy/sell records, brokerage, realized P&L)

WhatsApp alerts/notifications

Hindi language support

Watchlists / live dashboard

Lovable Build Prompt

Copy everything below into Lovable:

Build a web app called "Stock Analyser" — a single-query Indian stock advisory tool.

CORE FLOW:
1. A simple input form with three fields: Stock Name/Symbol (BSE/NSE), Quantity, 
   Price per share the user is considering.
2. On submit, fetch current and historical price data for the stock using a free 
   NSE/BSE data source (use a Yahoo Finance-based wrapper API for Indian stocks — 
   no paid API key required).
3. Run analysis combining:
   - Technical indicators: moving averages (50/200 day), RSI, recent volume trend
   - Basic fundamentals/news signal if available (recent price-moving news, sector trend)
4. Generate a report with these sections:
   - VERDICT: Buy / Don't Buy / Wait (clear, bolded)
   - PRICE CHECK: Is the user's input price good vs. current market price? 
     Show the delta.
   - PRICE CHART: A price history chart (candlestick or line) covering the last 
     3-6 months, with the 50/200 day moving averages overlaid and the user's 
     input price marked as a horizontal reference line.
   - TIMING: Is a better entry price likely soon? Give a rough timeframe if yes.
   - OUTLOOK: Expected direction, rough % growth estimate, and timeframe, with 
     plain-language reasoning (2-3 sentences). Show this visually too — a small 
     projected-range chart or trend arrow, not just text.
   - IF DON'T BUY: List clear reasons, and suggest 1-2 alternative stocks in the 
     same sector that may be more promising.
   - Include a visible disclaimer: "This is trend-based analysis, not financial 
     advice. Markets are unpredictable — invest at your own discretion."

LOGGING:
- Every query and its report gets saved as a row in a persistent log/spreadsheet 
  (columns: date, stock, quantity, input price, current price, verdict, outlook 
  summary). 
- Add a "Download Log as CSV" button to export this anytime.

SNAPSHOT:
- After each report, generate a clean, visually polished snapshot image (PNG) of 
  just that report — stock name, verdict, key numbers, a small chart, and 
  outlook — suitable for saving or sharing on social media. Add a "Download 
  Snapshot" button.

DESIGN — premium fintech, not generic dashboard:
This should feel like a private wealth product, not a free stock-screener site. 
Think the confidence of a private banking app crossed with the polish of a 
high-end trading terminal — dark, rich, considered, never cluttered or "busy 
with widgets."

- Base palette: deep charcoal/near-black background (not pure black), with a 
  single restrained metallic accent — a muted gold or bronze — used sparingly 
  for the verdict, key numbers, and chart highlights. Avoid generic SaaS blue 
  and avoid neon/acid accents.
- Typography: a refined serif or high-contrast display face for the verdict and 
  big numbers (this is the "hero" moment of the report), paired with a clean 
  grotesk/sans for body text and a monospace or tabular-figure font for all 
  prices and percentages, so numbers align cleanly like a real trading terminal.
- Charts should feel intentional, not default chart-library styling: thin 
  precise lines, restrained gridlines, the accent color used only for the 
  moving-average line or the verdict marker, generous whitespace around each 
  chart rather than cramming it into a small card.
- Micro-interactions: a subtle, confident reveal animation when the report 
  loads (numbers/verdict animating in), not excessive motion elsewhere.
- The overall feel should make checking a stock feel like a considered, 
  slightly luxurious moment — not a cluttered free-tool experience — while 
  staying fast and usable on mobile.
- English only for now.
- Mobile-friendly, since it'll be opened on phones via a shared link.
- No login required for v1 — fully open access via the link.

TECH NOTES:
- Use a free/no-key Indian stock data API (Yahoo Finance-based NSE/BSE wrapper) 
  for price data.
- Use a charting library (e.g. Recharts or Lightweight Charts) styled to match 
  the custom palette — no default/unstyled chart theming.
- Persist the log data so it survives across sessions (use Supabase or built-in 
  storage).
- Keep the whole flow to one screen: input → report → download options.


Phase 2 ideas (not now, just parked)

Portfolio tracking: log actual buys/sells, brokerage, realized P&L over time

WhatsApp alerts via Twilio (price nudges, report summaries)

Hindi language toggle

Watchlist / dashboard view

One honest caveat

The free data source is solid for prototyping but can lag or occasionally rate-limit. If you end up relying on this daily for real money decisions, it's worth budgeting for a paid feed (Breeze API via ICICI Direct is free if you open an account, or Zerodha Kite) down the line for more reliable, real-time data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/787862d7-3fa0-4aeb-b118-95877da25c80).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
