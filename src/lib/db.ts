/**
 * Typed database helpers.
 * Wraps Supabase calls with explicit return types to avoid
 * the createClient<Database> generic inference issue in strict mode.
 * Replace with generated types from `supabase gen types typescript` once connected.
 */
import { createAdminClient } from "./supabase/server";
import type { ShopRow, SupplierRow, ProductRow, PurchaseOrderRow, POLineItemRow } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createAdminClient();
}

// ── Shops ─────────────────────────────────────────────────────────────────────

export async function getShopByDomain(domain: string): Promise<ShopRow | null> {
  const { data } = await db().from("shops").select("*").eq("shopify_domain", domain).single();
  return (data as ShopRow | null) ?? null;
}

export async function upsertShop(values: {
  shopify_domain: string;
  access_token: string;
  installed_at?: string;
  uninstalled_at?: string | null;
}) {
  return db().from("shops").upsert(values as any, { onConflict: "shopify_domain" });
}

export async function markShopUninstalled(domain: string) {
  return db()
    .from("shops")
    .update({ uninstalled_at: new Date().toISOString() } as any)
    .eq("shopify_domain", domain);
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function getSuppliers(shopId: string): Promise<SupplierRow[]> {
  const { data } = await db().from("suppliers").select("*").eq("shop_id", shopId).order("name");
  return (data as SupplierRow[]) ?? [];
}

export async function upsertSupplier(values: Partial<SupplierRow> & { shop_id: string; name: string }) {
  return db().from("suppliers").upsert(values as any);
}

export async function deleteSupplier(id: string) {
  return db().from("suppliers").delete().eq("id", id);
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getTrackedProducts(shopId: string): Promise<(ProductRow & { velocity?: { avg_daily_sales: number; days_of_stock_remaining: number | null } })[]> {
  const { data } = await db()
    .from("products")
    .select("*, sales_velocity(avg_daily_sales, days_of_stock_remaining, period_days)")
    .eq("shop_id", shopId)
    .eq("is_tracked", true)
    .order("title");
  return (data as any[]) ?? [];
}

export async function getLowStockProducts(shopId: string): Promise<ProductRow[]> {
  // Products where current_inventory <= reorder_point
  const { data } = await db()
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_tracked", true)
    .not("reorder_point", "is", null)
    .order("current_inventory");

  const rows = (data as ProductRow[]) ?? [];
  return rows.filter((p) => p.reorder_point !== null && p.current_inventory <= p.reorder_point!);
}

export async function updateProductReorderSettings(
  productId: string,
  values: { reorder_point?: number; reorder_qty?: number; supplier_id?: string; is_tracked?: boolean; cost_per_unit?: number }
) {
  return db().from("products").update(values as any).eq("id", productId);
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function getPurchaseOrders(shopId: string): Promise<PurchaseOrderRow[]> {
  const { data } = await db()
    .from("purchase_orders")
    .select("*, suppliers(name, email)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  return (data as any[]) ?? [];
}

export async function createPurchaseOrder(values: {
  shop_id: string;
  supplier_id: string;
  po_number: string;
  expected_delivery_date?: string;
  notes?: string;
}) {
  const { data, error } = await db()
    .from("purchase_orders")
    .insert(values as any)
    .select()
    .single();
  return { data: data as PurchaseOrderRow | null, error };
}

export async function updatePOStatus(
  poId: string,
  status: string,
  extra?: { sent_at?: string; received_at?: string }
) {
  return db()
    .from("purchase_orders")
    .update({ status, ...extra } as any)
    .eq("id", poId);
}

export async function getPOWithLineItems(poId: string) {
  const { data } = await db()
    .from("purchase_orders")
    .select("*, suppliers(name, email), po_line_items(*, products(title, sku))")
    .eq("id", poId)
    .single();
  return data as any;
}

export async function addLineItemsToPO(
  items: { po_id: string; product_id: string; qty_ordered: number; unit_cost?: number; notes?: string }[]
) {
  return db().from("po_line_items").insert(items as any);
}
