import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  const update: Record<string, any> = { status: body.status };
  if (body.received_at) update.received_at = body.received_at;
  if (body.sent_at) update.sent_at = body.sent_at;

  const { error } = await supabase
    .from("purchase_orders")
    .update(update)
    .eq("id", id)
    .eq("shop_id", ctx.shopId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("purchase_orders")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shopId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
