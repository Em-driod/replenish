import { NextRequest } from "next/server";
import { createAdminClient } from "./supabase/server";
import { shopify } from "./shopify";

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export type ShopContextResult =
  | { shopId: string; error?: undefined; status?: undefined }
  | { shopId?: undefined; error: string; status: number };

/**
 * Resolves the shop domain from an App Bridge session token (Authorization:
 * Bearer <jwt>), which is the platform-guaranteed way to identify the
 * calling shop — Shopify's unified admin.shopify.com embed doesn't reliably
 * put shop/host in the iframe URL on deep-linked navigation (confirmed via
 * direct testing: a fresh embedded load can have a completely bare URL and
 * even document.referrer doesn't consistently contain the store handle).
 */
async function shopFromSessionToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;

  try {
    const payload = await shopify.session.decodeSessionToken(token);
    // dest/iss look like "https://<shop>.myshopify.com" or ".../admin"
    const dest = (payload.dest ?? payload.iss ?? "") as string;
    const host = dest.replace(/^https?:\/\//, "").split("/")[0];
    return SHOP_DOMAIN_RE.test(host) ? host : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the calling shop (session token first, `shop` query param as a
 * fallback for internally-constructed URLs like the billing return) and
 * confirms it's an installed shop, so every API route scopes reads/writes
 * to that tenant only.
 */
export async function requireShopId(req: NextRequest): Promise<ShopContextResult> {
  const fromToken = await shopFromSessionToken(req);
  const shop = fromToken ?? req.nextUrl.searchParams.get("shop");

  if (!shop || !SHOP_DOMAIN_RE.test(shop)) {
    return { error: `Missing or invalid shop parameter (received: "${shop ?? ""}")`, status: 400 };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("shopify_domain", shop)
    .is("uninstalled_at", null)
    .single();

  if (!data) {
    return { error: `Shop is not installed (resolved shop: "${shop}")`, status: 401 };
  }

  return { shopId: (data as { id: string }).id };
}
