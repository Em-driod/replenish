import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncProducts } from "@/lib/sync";

export async function POST() {
  const supabase = createAdminClient();

  // Get all installed shops
  const { data: shops } = await supabase
    .from("shops")
    .select("id, shopify_domain, access_token")
    .is("uninstalled_at", null);

  if (!shops || shops.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  await Promise.allSettled(
    shops.map((shop: any) =>
      syncProducts(shop.shopify_domain, shop.access_token, shop.id)
    )
  );

  return NextResponse.json({ ok: true, synced: shops.length });
}
