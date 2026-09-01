import type { Ipo } from "./ipo.functions";

export type IpoCall = "Apply" | "Neutral" | "Avoid";

export type IpoReasoning = { call: IpoCall; reason: string };

/** Heuristic read on an IPO from grey-market premium, subscription heat and listing outcome. */
export function ipoReasoning(ipo: Ipo): IpoReasoning {
  const gmp = ipo.gmpPct ?? 0;
  const sub = ipo.subscription;

  if (ipo.status === "listed") {
    const gain = ipo.listingGainPct ?? 0;
    if (gain >= 15)
      return {
        call: "Apply",
        reason: `Listed at ₹${ipo.listingPrice?.toFixed(2)} — a ${gain.toFixed(1)}% listing gain over the issue price.`,
      };
    if (gain > 0)
      return {
        call: "Neutral",
        reason: `Listed ${gain.toFixed(1)}% above issue price — a muted debut, so let the price settle before buying.`,
      };
    return {
      call: "Avoid",
      reason: `Listed ${gain.toFixed(1)}% versus issue price — a weak debut; wait for a base to form.`,
    };
  }

  const subText =
    sub == null ? "subscription data not out yet" : `subscribed ${sub.toFixed(2)}x so far`;

  if (gmp >= 20 && (sub == null || sub >= 2))
    return {
      call: "Apply",
      reason: `Grey market is pricing a ${gmp.toFixed(1)}% premium and demand is strong (${subText}).`,
    };
  if (gmp >= 8)
    return {
      call: "Neutral",
      reason: `A ${gmp.toFixed(1)}% grey-market premium points to a modest pop, ${subText}. Worth an application only if you're comfortable with SME/IPO volatility.`,
    };
  if (gmp <= 1)
    return {
      call: "Avoid",
      reason: `Almost no grey-market premium (${gmp.toFixed(1)}%), ${subText} — little sign of listing-day appetite.`,
    };
  return {
    call: "Neutral",
    reason: `Thin grey-market premium of ${gmp.toFixed(1)}%, ${subText}. No clear edge either way.`,
  };
}

export const statusLabel: Record<Ipo["status"], string> = {
  upcoming: "Upcoming",
  open: "Open now",
  closing: "Closing today",
  closed: "Closed",
  listed: "Listed",
};
