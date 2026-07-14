/**
 * Suggests a reorder point/quantity from real sales velocity + supplier lead
 * time, instead of merchants guessing a number cold.
 *
 * reorder point = enough stock to survive from "time to reorder" through
 * the supplier's lead time plus a safety buffer, at the current daily rate.
 * reorder qty   = enough to cover the shop's target forecast window after
 * the restock arrives.
 */
export interface ReorderSuggestion {
  reorderPoint: number;
  reorderQty: number;
}

export function computeSuggestedReorder(
  avgDailySales: number,
  leadTimeDays: number,
  bufferDays: number,
  forecastWindowDays: number
): ReorderSuggestion | null {
  if (avgDailySales <= 0) return null;

  const reorderPoint = Math.ceil(avgDailySales * (leadTimeDays + bufferDays));
  const reorderQty = Math.ceil(avgDailySales * forecastWindowDays);

  return { reorderPoint, reorderQty };
}
