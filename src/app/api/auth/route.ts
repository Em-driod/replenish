import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

// GET /api/auth?shop=mystore.myshopify.com
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const appUrl = process.env.SHOPIFY_APP_URL!;
  const apiKey = process.env.SHOPIFY_API_KEY!;
  const scopes = process.env.SHOPIFY_SCOPES!;
  const redirectUri = `${appUrl}/api/auth/callback`;

  const state = crypto.randomUUID();
  const authUrl =
    `https://${sanitizedShop}/admin/oauth/authorize` +
    `?client_id=${apiKey}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 300,
  });

  return response;
}
