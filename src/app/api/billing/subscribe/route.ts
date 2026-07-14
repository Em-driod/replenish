import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";
import { createSubscription } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { plan } = await req.json();
  if (plan !== "starter" && plan !== "growth") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: shopRow } = await supabase
    .from("shops")
    .select("shopify_domain, access_token")
    .eq("id", ctx.shopId)
    .single();

  if (!shopRow) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const { shopify_domain, access_token } = shopRow as { shopify_domain: string; access_token: string };
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/api/billing/confirm?shop=${encodeURIComponent(shopify_domain)}`;

  try {
    const { confirmationUrl } = await createSubscription(shopify_domain, access_token, plan, returnUrl);
    return NextResponse.json({ confirmationUrl });
  } catch (err) {
    console.error("Billing subscribe error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to start subscription: ${message}` }, { status: 500 });
  }
}
