import { NextRequest, NextResponse } from "next/server";
import { upsertShop } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";
import { shopify } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const rawShop = searchParams.get("shop");
    const state = searchParams.get("state");

    if (!code || !rawShop) {
      return NextResponse.json({ error: "Missing code or shop" }, { status: 400 });
    }

    const shop = shopify.utils.sanitizeShop(rawShop, false);
    if (!shop) {
      return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
    }

    // CSRF protection: only enforced when our own /api/auth actually set the
    // cookie. Shopify's managed-install flow (no legacy install flow) redirects
    // straight to this callback without ever hitting /api/auth, so there's
    // legitimately no cookie in that case — HMAC verification below is what
    // actually proves the request came from Shopify either way.
    const expectedState = req.cookies.get("shopify_oauth_state")?.value;
    if (expectedState && state !== expectedState) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 401 });
    }

    let isValidHmac = false;
    try {
      isValidHmac = await shopify.utils.validateHmac(Object.fromEntries(searchParams));
    } catch (hmacErr) {
      console.error("HMAC validation error:", hmacErr);
      return NextResponse.json({ error: "HMAC validation error" }, { status: 401 });
    }
    if (!isValidHmac) {
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
    }

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

    const { error: upsertErr } = await upsertShop({
      shopify_domain: shop,
      access_token,
      installed_at: new Date().toISOString(),
      uninstalled_at: null,
    });
    if (upsertErr) {
      console.error("Failed to save shop:", upsertErr);
    }

    const supabase = createAdminClient();
    await supabase.from("shopify_sessions").upsert(
      { id: shop, shop, is_online: false, scope, access_token } as any,
      { onConflict: "id" }
    );

    // Must be awaited, not fire-and-forget: Vercel's serverless runtime can
    // freeze/terminate the function right after the response is sent,
    // killing any in-flight unawaited work — this was previously causing
    // webhook registration (including app/uninstalled) to silently never
    // complete.
    try {
      await registerWebhooks(shop, access_token);
    } catch (webhookErr) {
      console.error("Webhook registration failed:", webhookErr);
    }

    const redirectUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("shopify_oauth_state");
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}

async function registerWebhooks(shop: string, accessToken: string) {
  // customers/data_request, customers/redact, and shop/redact are NOT
  // registered here — Shopify's regular webhooks.json API 404s on them
  // ("could not find the webhook topic"). Those 3 GDPR compliance topics
  // are handled entirely via the separate Compliance Webhooks URLs
  // configured in the Dev Dashboard, which /api/webhooks already handles.
  const topics = [
    "products/create",
    "products/update",
    "products/delete",
    "inventory_levels/update",
    "app/uninstalled",
    "app_subscriptions/update",
  ];

  const appUrl = process.env.SHOPIFY_APP_URL;

  const results = await Promise.allSettled(
    topics.map(async (topic) => {
      const res = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: { topic, address: `${appUrl}/api/webhooks`, format: "json" },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${topic}: ${res.status} ${body.slice(0, 150)}`);
      }
      return topic;
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Webhook topic registration failed:", result.reason);
    }
  }
}
