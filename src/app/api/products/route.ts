import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop") ?? req.headers.get("x-shop-domain");
  const supabase = createAdminClient();

  // Get shop record
  const { data: shopRow } = await supabase
    .from("shops")
    .select("id")
    .eq("shopify_domain", shop ?? "")
    .single();

  // If no shop param, return all products (for embedded use where shop comes from session)
  const query = supabase
    .from("products")
    .select("*, suppliers(name), sales_velocity(avg_daily_sales, days_of_stock_remaining, period_days)")
    .order("title");

  if (shopRow?.id) {
    query.eq("shop_id", shopRow.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
