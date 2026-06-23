/**
 * Shopify product + order sync utilities.
 * Called on app install and via webhooks.
 */
import { createAdminClient } from "./supabase/server";

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  inventory_quantity: number;
  cost?: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
}

export async function syncProducts(shop: string, accessToken: string, shopDbId: string) {
  const supabase = createAdminClient();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `https://${shop}/admin/api/2025-01/products.json?limit=250&page=${page}&fields=id,title,variants`,
      { headers: { "X-Shopify-Access-Token": accessToken } }
    );

    if (!res.ok) break;

    const { products }: { products: ShopifyProduct[] } = await res.json();
    hasMore = products.length === 250;
    page++;

    if (products.length === 0) break;

    const rows = products.flatMap((p) =>
      p.variants.map((v) => ({
        shop_id: shopDbId,
        shopify_product_id: p.id.toString(),
        shopify_variant_id: v.id.toString(),
        title: `${p.title}${v.title !== "Default Title" ? ` - ${v.title}` : ""}`,
        sku: v.sku ?? null,
        current_inventory: v.inventory_quantity ?? 0,
        cost_per_unit: v.cost ? parseFloat(v.cost) : null,
        updated_at: new Date().toISOString(),
      }))
    );

    if (rows.length > 0) {
      await supabase
        .from("products")
        .upsert(rows, { onConflict: "shop_id,shopify_variant_id" });
    }
  }
}

export async function computeSalesVelocity(shopDbId: string, shop: string, accessToken: string) {
  const supabase = createAdminClient();

  // Fetch last 90 days of fulfilled orders
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const res = await fetch(
    `https://${shop}/admin/api/2025-01/orders.json?status=any&fulfillment_status=shipped&created_at_min=${since.toISOString()}&limit=250&fields=id,line_items`,
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );

  if (!res.ok) return;

  const { orders } = await res.json();

  // Aggregate units sold per variant
  const salesMap: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.line_items ?? []) {
      const key = item.variant_id?.toString();
      if (key) salesMap[key] = (salesMap[key] ?? 0) + item.quantity;
    }
  }

  // Get all tracked products for this shop
  const { data: products } = await supabase
    .from("products")
    .select("id, shopify_variant_id, current_inventory")
    .eq("shop_id", shopDbId)
    .eq("is_tracked", true);

  if (!products) return;

  const velocityRows = products.map((p: any) => {
    const sold90 = salesMap[p.shopify_variant_id] ?? 0;
    const avgDaily = sold90 / 90;
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
