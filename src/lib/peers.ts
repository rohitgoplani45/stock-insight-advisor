// Curated NSE sector peer groups used for "alternative stock" suggestions.

export const PEER_GROUPS: { sector: string; symbols: { symbol: string; name: string }[] }[] = [
  {
    sector: "Automobiles",
    symbols: [
      { symbol: "TATAMOTORS.NS", name: "Tata Motors" },
      { symbol: "M&M.NS", name: "Mahindra & Mahindra" },
      { symbol: "MARUTI.NS", name: "Maruti Suzuki" },
      { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto" },
      { symbol: "EICHERMOT.NS", name: "Eicher Motors" },
      { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp" },
      { symbol: "TVSMOTOR.NS", name: "TVS Motor" },
    ],
  },
  {
    sector: "Banking & Financials",
    symbols: [
      { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
      { symbol: "AXISBANK.NS", name: "Axis Bank" },
      { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
      { symbol: "SBIN.NS", name: "State Bank of India" },
      { symbol: "BAJFINANCE.NS", name: "Bajaj Finance" },
      { symbol: "INDUSINDBK.NS", name: "IndusInd Bank" },
    ],
  },
  {
    sector: "Information Technology",
    symbols: [
      { symbol: "TCS.NS", name: "Tata Consultancy Services" },
      { symbol: "INFY.NS", name: "Infosys" },
      { symbol: "HCLTECH.NS", name: "HCL Technologies" },
      { symbol: "WIPRO.NS", name: "Wipro" },
      { symbol: "TECHM.NS", name: "Tech Mahindra" },
      { symbol: "LTIM.NS", name: "LTIMindtree" },
    ],
  },
  {
    sector: "Energy & Power",
    symbols: [
      { symbol: "RELIANCE.NS", name: "Reliance Industries" },
      { symbol: "ONGC.NS", name: "ONGC" },
      { symbol: "NTPC.NS", name: "NTPC" },
      { symbol: "POWERGRID.NS", name: "Power Grid" },
      { symbol: "BPCL.NS", name: "BPCL" },
      { symbol: "IOC.NS", name: "Indian Oil" },
      { symbol: "TATAPOWER.NS", name: "Tata Power" },
    ],
  },
  {
    sector: "FMCG & Consumer",
    symbols: [
      { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever" },
      { symbol: "ITC.NS", name: "ITC" },
      { symbol: "NESTLEIND.NS", name: "Nestle India" },
      { symbol: "BRITANNIA.NS", name: "Britannia" },
      { symbol: "DABUR.NS", name: "Dabur India" },
      { symbol: "TATACONSUM.NS", name: "Tata Consumer" },
    ],
  },
  {
    sector: "Pharma & Healthcare",
    symbols: [
      { symbol: "SUNPHARMA.NS", name: "Sun Pharma" },
      { symbol: "CIPLA.NS", name: "Cipla" },
      { symbol: "DRREDDY.NS", name: "Dr Reddy's Labs" },
      { symbol: "DIVISLAB.NS", name: "Divi's Labs" },
      { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals" },
      { symbol: "LUPIN.NS", name: "Lupin" },
    ],
  },
  {
    sector: "Metals & Mining",
    symbols: [
      { symbol: "TATASTEEL.NS", name: "Tata Steel" },
      { symbol: "JSWSTEEL.NS", name: "JSW Steel" },
      { symbol: "HINDALCO.NS", name: "Hindalco" },
      { symbol: "VEDL.NS", name: "Vedanta" },
      { symbol: "COALINDIA.NS", name: "Coal India" },
      { symbol: "SAIL.NS", name: "SAIL" },
    ],
  },
  {
    sector: "Infrastructure & Cement",
    symbols: [
      { symbol: "LT.NS", name: "Larsen & Toubro" },
      { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement" },
      { symbol: "AMBUJACEM.NS", name: "Ambuja Cements" },
      { symbol: "SHREECEM.NS", name: "Shree Cement" },
      { symbol: "GRASIM.NS", name: "Grasim Industries" },
    ],
  },
  {
    sector: "Telecom & Media",
    symbols: [
      { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
      { symbol: "IDEA.NS", name: "Vodafone Idea" },
      { symbol: "INDUSTOWER.NS", name: "Indus Towers" },
      { symbol: "ZEEL.NS", name: "Zee Entertainment" },
    ],
  },
];

const FALLBACK = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  { symbol: "LT.NS", name: "Larsen & Toubro" },
];

export function findPeers(symbol: string): { sector: string; peers: { symbol: string; name: string }[] } {
  const base = symbol.toUpperCase();
  const group = PEER_GROUPS.find((g) => g.symbols.some((s) => s.symbol === base));
  if (!group) return { sector: "Indian large caps", peers: FALLBACK.filter((p) => p.symbol !== base).slice(0, 3) };
  return {
    sector: group.sector,
    peers: group.symbols.filter((s) => s.symbol !== base).slice(0, 4),
  };
}
