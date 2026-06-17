import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/auth/callback
// Shopify redirects here after merchant approves the app
export async function GET(req: NextRequest) {
  try {
    const { session, headers } = await shopify.auth.callback({
      rawRequest: req,
    } as any);

    const supabase = createAdminClient();

    // Upsert shop record
    const { error: shopError } = await supabase
      .from("shops")
      .upsert(
        {
          shopify_domain: session.shop,
          access_token: session.accessToken!,
          installed_at: new Date().toISOString(),
          uninstalled_at: null,
        },
        { onConflict: "shopify_domain" }
      );

    if (shopError) {
      console.error("Failed to save shop:", shopError);
      return NextResponse.json({ error: "Failed to save shop" }, { status: 500 });
    }

    // Store session in Supabase (for session retrieval on subsequent requests)
    await supabase.from("shopify_sessions").upsert(
      {
        id: session.id,
        shop: session.shop,
        state: session.state,
        is_online: session.isOnline,
        scope: session.scope,
        expires: session.expires?.toISOString() ?? null,
        access_token: session.accessToken,
      },
      { onConflict: "id" }
    );

    // Register webhooks after install
    await registerWebhooks(session.shop, session.accessToken!);

    // Redirect into the embedded app
    const redirectUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
    const response = NextResponse.redirect(redirectUrl);

    headers?.forEach((value: string, key: string) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}

async function registerWebhooks(shop: string, accessToken: string) {
  const webhooks = [
    "products/create",
    "products/update",
    "products/delete",
    "inventory_levels/update",
    "orders/fulfilled",
    "app/uninstalled",
  ];

  const appUrl = process.env.SHOPIFY_APP_URL;

  for (const topic of webhooks) {
    try {
      await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${appUrl}/api/webhooks`,
            format: "json",
          },
        }),
      });
    } catch (err) {
      console.error(`Failed to register webhook ${topic}:`, err);
    }
  }
}
