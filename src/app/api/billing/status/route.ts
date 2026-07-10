import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";
import { isPlanId } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = createAdminClient();
  const [{ data: shopRow }, { count }] = await Promise.all([
    supabase.from("shops").select("plan_id").eq("id", ctx.shopId).single(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", ctx.shopId).eq("is_tracked", true),
  ]);

  const planId = shopRow && isPlanId((shopRow as { plan_id: string }).plan_id) ? (shopRow as { plan_id: string }).plan_id : "free";

  return NextResponse.json({ plan_id: planId, tracked_count: count ?? 0 });
}
