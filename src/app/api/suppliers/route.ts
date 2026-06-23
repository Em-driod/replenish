import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createAdminClient();

  // Get first installed shop
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .is("uninstalled_at", null)
    .order("installed_at", { ascending: false })
    .single();

  if (!shop) return NextResponse.json({ error: "No shop found" }, { status: 404 });

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      shop_id: shop.id,
      name: body.name,
      email: body.email,
      notes: body.notes ?? null,
      default_lead_time_days: body.lead_time_days ?? 14,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
