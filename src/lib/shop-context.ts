import { NextRequest } from "next/server";
import { createAdminClient } from "./supabase/server";

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export type ShopContextResult =
  | { shopId: string; error?: undefined; status?: undefined }
  | { shopId?: undefined; error: string; status: number };

/**
 * Resolves the calling shop from the `shop` query param and confirms it's an
 * installed shop, so every API route scopes reads/writes to that tenant only.
 */
export async function requireShopId(req: NextRequest): Promise<ShopContextResult> {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop || !SHOP_DOMAIN_RE.test(shop)) {
    return { error: "Missing or invalid shop parameter", status: 400 };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("shopify_domain", shop)
    .is("uninstalled_at", null)
    .single();

  if (!data) {
    return { error: "Shop is not installed", status: 401 };
  }

  return { shopId: (data as { id: string }).id };
}
