import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/auth?shop=mystore.myshopify.com
// Starts the OAuth flow — redirects merchant to Shopify consent screen
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const { url, headers } = await shopify.auth.begin({
    shop: sanitizedShop,
    callbackPath: "/api/auth/callback",
    isOnline: false,
    rawRequest: req,
  } as any);

  const response = NextResponse.redirect(url);
  // Forward any cookies set by the Shopify library
  headers.forEach((value: string, key: string) => {
    response.headers.set(key, value);
  });

  return response;
}
