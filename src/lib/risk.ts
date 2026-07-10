/**
 * A product is genuinely at risk of a stockout — regardless of any manually
 * set reorder point — if it will run out before a fresh order placed today
 * could realistically arrive (the supplier's lead time).
 */
export function isAtRiskOfStockout(daysRemaining: number | null, leadTimeDays: number | null | undefined): boolean {
  if (daysRemaining == null || leadTimeDays == null) return false;
  return daysRemaining <= leadTimeDays;
}
