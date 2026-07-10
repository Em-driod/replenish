import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";
import { PLANS, isPlanId } from "@/lib/billing";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();
  const wantsTracked = body.is_tracked ?? true;

  if (wantsTracked) {
    const { data: existing } = await supabase
      .from("products")
      .select("is_tracked")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .single();

    // Only enforce the limit when newly tracking a product — editing an
    // already-tracked product's settings shouldn't get blocked by its own count.
    if (!(existing as { is_tracked: boolean } | null)?.is_tracked) {
      const { data: shopRow } = await supabase.from("shops").select("plan_id").eq("id", ctx.shopId).single();
      const planId = isPlanId((shopRow as { plan_id: string } | null)?.plan_id) ? (shopRow as { plan_id: string }).plan_id : "free";
      const limit = PLANS[planId as keyof typeof PLANS].skuLimit;

      if (limit != null) {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", ctx.shopId)
          .eq("is_tracked", true);

        if ((count ?? 0) >= limit) {
          return NextResponse.json(
            { error: `Your ${PLANS[planId as keyof typeof PLANS].name} plan tracks up to ${limit} products. Upgrade to track more.` },
            { status: 402 }
          );
        }
      }
    }
  }

  const { error } = await supabase
    .from("products")
    .update({
      reorder_point: body.reorder_point,
      reorder_qty: body.reorder_qty,
      supplier_id: body.supplier_id,
      is_tracked: wantsTracked,
    })
    .eq("id", id)
    .eq("shop_id", ctx.shopId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
