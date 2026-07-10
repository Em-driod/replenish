import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveSubscriptions, planFromSubscriptionName } from "@/lib/billing";
import { shopify } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const rawShop = req.nextUrl.searchParams.get("shop");
  const shop = rawShop ? shopify.utils.sanitizeShop(rawShop, false) : null;
  if (!shop) return NextResponse.json({ error: "Missing or invalid shop" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, access_token")
    .eq("shopify_domain", shop)
    .single();

  if (!shopRow) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Don't trust the redirect params — re-query Shopify directly for the
  // subscription's real status before updating what plan the shop is on.
  const { id, access_token } = shopRow as { id: string; access_token: string };
  const subs = await getActiveSubscriptions(shop, access_token);
  const active = subs.find((s) => s.status === "ACTIVE");

  if (active) {
    const planId = planFromSubscriptionName(active.name);
    await supabase.from("shops").update({ plan_id: planId } as any).eq("id", id);
  }

  return NextResponse.redirect(`https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`);
}
