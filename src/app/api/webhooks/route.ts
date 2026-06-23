import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";
import { getShopByDomain, markShopUninstalled } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";

  const isValid = await shopify.webhooks.validate({
    rawBody: body,
    rawRequest: req,
  } as any).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const payload = JSON.parse(body);

  await supabase.from("webhook_events").insert({ topic, shopify_id: payload.id?.toString() } as any);

  const shopRecord = await getShopByDomain(shop);
  if (!shopRecord) return NextResponse.json({ ok: true });

  switch (topic) {
    case "products/create":
    case "products/update":
      await handleProductUpsert(supabase, shopRecord.id, payload);
      break;
    case "products/delete":
      await supabase.from("products").delete().eq("shop_id", shopRecord.id).eq("shopify_product_id", payload.id.toString());
      break;
    case "inventory_levels/update":
      if (payload.available !== undefined) {
        await supabase
          .from("products")
          .update({ current_inventory: payload.available, updated_at: new Date().toISOString() } as any)
          .eq("shop_id", shopRecord.id)
          .eq("shopify_variant_id", payload.inventory_item_id?.toString());
      }
      break;
    case "app/uninstalled":
      await markShopUninstalled(shop);
      break;
  }

  return NextResponse.json({ ok: true });
}

async function handleProductUpsert(supabase: any, shopId: string, product: any) {
  const rows = (product.variants ?? []).map((v: any) => ({
    shop_id: shopId,
    shopify_product_id: product.id.toString(),
    shopify_variant_id: v.id.toString(),
    title: `${product.title}${v.title !== "Default Title" ? ` - ${v.title}` : ""}`,
    sku: v.sku ?? null,
    current_inventory: v.inventory_quantity ?? 0,
    cost_per_unit: v.cost ? parseFloat(v.cost) : null,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    await supabase.from("products").upsert(rows, { onConflict: "shop_id,shopify_variant_id" });
  }
}
