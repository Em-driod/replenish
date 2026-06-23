import { NextRequest, NextResponse } from "next/server";
import { upsertShop } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    if (!code || !shop) {
      return NextResponse.json({ error: "Missing code or shop" }, { status: 400 });
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
    }

    const { access_token, scope } = await tokenRes.json();

    // Save shop to Supabase
    await upsertShop({
      shopify_domain: shop,
      access_token,
      installed_at: new Date().toISOString(),
      uninstalled_at: null,
    });

    // Save session
    const supabase = createAdminClient();
    await supabase.from("shopify_sessions").upsert(
      { id: shop, shop, is_online: false, scope, access_token } as any,
      { onConflict: "id" }
    );

    // Register webhooks (fire and forget)
    registerWebhooks(shop, access_token).catch(console.error);

    // Redirect back into the Shopify admin
    const redirectUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}

async function registerWebhooks(shop: string, accessToken: string) {
  const topics = [
    "products/create",
    "products/update",
    "products/delete",
    "inventory_levels/update",
    "app/uninstalled",
  ];

  const appUrl = process.env.SHOPIFY_APP_URL;

  await Promise.allSettled(
    topics.map((topic) =>
      fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: { topic, address: `${appUrl}/api/webhooks`, format: "json" },
        }),
      })
    )
  );
}
