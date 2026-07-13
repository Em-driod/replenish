import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";
import { syncProducts, computeSalesVelocity } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = createAdminClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, shopify_domain, access_token")
    .eq("id", ctx.shopId)
    .single();

  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  try {
    await syncProducts(shop.shopify_domain, shop.access_token, shop.id);
  } catch (err) {
    console.error("Product sync failed:", err);
    const message = err instanceof Error ? err.message : "Unknown sync error";
    return NextResponse.json({ error: `Product sync failed: ${message}` }, { status: 500 });
  }

  // Sales velocity needs orders.json, which requires Protected Customer Data
  // approval — don't let that block the core product sync if it's not
  // approved yet, since products/inventory are the more critical data.
  let velocityWarning: string | null = null;
  try {
    await computeSalesVelocity(shop.id, shop.shopify_domain, shop.access_token);
  } catch (err) {
    console.error("Sales velocity computation failed:", err);
    velocityWarning = err instanceof Error ? err.message : "Unknown error computing sales velocity";
  }

  return NextResponse.json({ ok: true, velocityWarning });
}
