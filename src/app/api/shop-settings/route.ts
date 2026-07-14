import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";

const DEFAULT_SETTINGS = {
  lead_time_buffer_days: 7,
  forecast_window_days: 60,
  low_stock_digest_enabled: true,
  digest_email: null as string | null,
};

export async function GET(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = createAdminClient();
  const { data } = await supabase.from("shops").select("settings").eq("id", ctx.shopId).single();

  return NextResponse.json({ ...DEFAULT_SETTINGS, ...((data as { settings: object } | null)?.settings ?? {}) });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();
  const supabase = createAdminClient();

  const { data: shopRow } = await supabase.from("shops").select("settings").eq("id", ctx.shopId).single();
  const currentSettings = (shopRow as { settings: object } | null)?.settings ?? {};

  const updatedSettings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ...(body.low_stock_digest_enabled !== undefined ? { low_stock_digest_enabled: body.low_stock_digest_enabled } : {}),
    ...(body.digest_email !== undefined ? { digest_email: body.digest_email } : {}),
  };

  const { error } = await supabase.from("shops").update({ settings: updatedSettings } as any).eq("id", ctx.shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(updatedSettings);
}
