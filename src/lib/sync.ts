/**
 * Shopify product + order sync utilities.
 * Called on app install and via webhooks.
 */
import { createAdminClient } from "./supabase/server";
import { fetchAllPages } from "./shopify-paginate";

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  inventory_quantity: number;
  inventory_item_id: number;
  image_id?: number | null;
  cost?: string;
}

interface ShopifyImage {
  id: number;
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
  image?: ShopifyImage | null;
  images?: ShopifyImage[];
}

interface ShopifyLineItem {
  variant_id: number | null;
  quantity: number;
}

interface ShopifyOrder {
  created_at: string;
  cancelled_at: string | null;
  line_items: ShopifyLineItem[];
}

export async function syncProducts(shop: string, accessToken: string, shopDbId: string) {
  const supabase = createAdminClient();

  const products = await fetchAllPages<ShopifyProduct>(
    `https://${shop}/admin/api/2025-01/products.json?limit=250&fields=id,title,variants,image,images`,
    accessToken,
    "products"
  );

  const rows = products.flatMap((p) => {
    const imagesById = new Map((p.images ?? []).map((img) => [img.id, img.src]));
    const defaultImage = p.image?.src ?? p.images?.[0]?.src ?? null;

    return p.variants.map((v) => ({
      shop_id: shopDbId,
      shopify_product_id: p.id.toString(),
      shopify_variant_id: v.id.toString(),
      shopify_inventory_item_id: v.inventory_item_id?.toString() ?? null,
      image_url: (v.image_id != null ? imagesById.get(v.image_id) : null) ?? defaultImage,
      title: `${p.title}${v.title !== "Default Title" ? ` - ${v.title}` : ""}`,
      sku: v.sku ?? null,
      current_inventory: v.inventory_quantity ?? 0,
      cost_per_unit: v.cost ? parseFloat(v.cost) : null,
      updated_at: new Date().toISOString(),
    }));
  });

  if (rows.length === 0) return;

  const { data: upserted } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "shop_id,shopify_variant_id" })
    .select("id, current_inventory");

  // Log a point-in-time snapshot so velocity math can later detect stockout
  // windows instead of mistaking "out of stock" for "no demand."
  if (upserted && upserted.length > 0) {
    const snapshotRows = (upserted as { id: string; current_inventory: number }[]).map((p) => ({
      product_id: p.id,
      inventory: p.current_inventory,
    }));
    await supabase.from("inventory_snapshots").insert(snapshotRows);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sums the milliseconds within [windowStart, windowEnd] where inventory was at 0. */
function stockoutMsInWindow(
  snapshots: { inventory: number; recorded_at: string }[],
  windowStart: number,
  windowEnd: number
): number {
  if (snapshots.length === 0) return 0;

  let stockoutMs = 0;
  for (let i = 0; i < snapshots.length; i++) {
    const segStart = new Date(snapshots[i].recorded_at).getTime();
    const segEnd = i + 1 < snapshots.length ? new Date(snapshots[i + 1].recorded_at).getTime() : windowEnd;

    const clippedStart = Math.max(segStart, windowStart);
    const clippedEnd = Math.min(segEnd, windowEnd);
    if (clippedEnd <= clippedStart) continue;

    if (snapshots[i].inventory === 0) {
      stockoutMs += clippedEnd - clippedStart;
    }
  }
  return stockoutMs;
}

/**
 * Computes sales velocity per tracked product using a trend-weighted,
 * stockout-corrected average:
 *  - Last 30 days count for 60% of the estimate, prior 60 days for 40%, so a
 *    demand shift shows up within about a month instead of being diluted by
 *    a flat 90-day average.
 *  - Days where a product was fully out of stock are excluded from each
 *    bucket's denominator (using logged inventory_snapshots), since a
 *    stockout suppresses sales to zero regardless of real demand — dividing
 *    by the full window would understate true velocity and overstate
 *    "days of stock remaining" right after restocking.
 */
export async function computeSalesVelocity(shopDbId: string, shop: string, accessToken: string) {
  const supabase = createAdminClient();

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * DAY_MS;
  const NINETY_DAYS_MS = 90 * DAY_MS;
  const since = new Date(now - NINETY_DAYS_MS);
  const recentStart = now - THIRTY_DAYS_MS;

  const orders = await fetchAllPages<ShopifyOrder>(
    `https://${shop}/admin/api/2025-01/orders.json?status=any&created_at_min=${since.toISOString()}&limit=250&fields=id,created_at,cancelled_at,line_items`,
    accessToken,
    "orders"
  );

  // Per-variant units sold, split into "last 30 days" and "31-90 days ago" buckets
  const recent: Record<string, number> = {};
  const older: Record<string, number> = {};

  for (const order of orders) {
    if (order.cancelled_at) continue; // cancelled orders aren't real demand
    const orderTime = new Date(order.created_at).getTime();
    const bucket = orderTime >= recentStart ? recent : older;

    for (const item of order.line_items ?? []) {
      const key = item.variant_id?.toString();
      if (key) bucket[key] = (bucket[key] ?? 0) + item.quantity;
    }
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, shopify_variant_id, current_inventory")
    .eq("shop_id", shopDbId)
    .eq("is_tracked", true);

  if (!products || products.length === 0) return;

  const productIds = products.map((p: { id: string }) => p.id);
  const { data: snapshots } = await supabase
    .from("inventory_snapshots")
    .select("product_id, inventory, recorded_at")
    .in("product_id", productIds)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  const snapshotsByProduct = new Map<string, { inventory: number; recorded_at: string }[]>();
  for (const s of (snapshots ?? []) as { product_id: string; inventory: number; recorded_at: string }[]) {
    const list = snapshotsByProduct.get(s.product_id) ?? [];
    list.push({ inventory: s.inventory, recorded_at: s.recorded_at });
    snapshotsByProduct.set(s.product_id, list);
  }

  const velocityRows = products.map((p: { id: string; shopify_variant_id: string; current_inventory: number }) => {
    const sold30 = recent[p.shopify_variant_id] ?? 0;
    const sold60 = older[p.shopify_variant_id] ?? 0;
    const sold90 = sold30 + sold60;

    const productSnapshots = snapshotsByProduct.get(p.id) ?? [];
    const stockout30Ms = stockoutMsInWindow(productSnapshots, recentStart, now);
    const stockout60Ms = stockoutMsInWindow(productSnapshots, since.getTime(), recentStart);

    // Never divide by less than 1 day, so a fully-out-of-stock window doesn't blow up the average
    const effectiveDays30 = Math.max((THIRTY_DAYS_MS - stockout30Ms) / DAY_MS, 1);
    const effectiveDays60 = Math.max((THIRTY_DAYS_MS * 2 - stockout60Ms) / DAY_MS, 1);

    const avgRecent = sold30 / effectiveDays30;
    const avgOlder = sold60 / effectiveDays60;
    const avgDaily = sold90 > 0 ? avgRecent * 0.6 + avgOlder * 0.4 : 0;

    const daysRemaining = avgDaily > 0 ? p.current_inventory / avgDaily : null;

    return {
      product_id: p.id,
      period_days: 90,
      units_sold: sold90,
      avg_daily_sales: avgDaily,
      days_of_stock_remaining: daysRemaining,
      computed_at: new Date().toISOString(),
    };
  });

  if (velocityRows.length > 0) {
    await supabase
      .from("sales_velocity")
      .upsert(velocityRows, { onConflict: "product_id,period_days" });
  }
}
