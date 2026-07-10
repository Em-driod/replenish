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
    await computeSalesVelocity(shop.id, shop.shopify_domain, shop.access_token);
  } catch (err) {
    console.error("Sync failed:", err);
    const message = err instanceof Error ? err.message : "Unknown sync error";
    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
