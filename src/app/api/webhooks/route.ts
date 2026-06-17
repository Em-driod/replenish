import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/webhooks
// Shopify sends all webhook events here
export async function POST(req: NextRequest) {
  const body = await req.text();
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";

  // Verify the webhook came from Shopify
  const isValid = await shopify.webhooks.validate({
    rawBody: body,
    rawRequest: req,
  } as any).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const payload = JSON.parse(body);

  // Log the event
  await supabase.from("webhook_events").insert({
    topic,
    shopify_id: payload.id?.toString(),
  });

  // Route to handler
  switch (topic) {
    case "products/create":
    case "products/update":
      await handleProductUpdate(supabase, shop, payload);
      break;
    case "products/delete":
      await handleProductDelete(supabase, shop, payload);
      break;
    case "inventory_levels/update":
      await handleInventoryUpdate(supabase, shop, payload);
      break;
    case "app/uninstalled":
      await handleUninstall(supabase, shop);
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}

async function handleProductUpdate(supabase: any, shop: string, product: any) {
  const { data: shopRecord } = await supabase
    .from("shops")
    .select("id")
    .eq("shopify_domain", shop)
    .single();

  if (!shopRecord) return;

  for (const variant of product.variants ?? []) {
    await supabase.from("products").upsert(
      {
        shop_id: shopRecord.id,
        shopify_product_id: product.id.toString(),
        shopify_variant_id: variant.id.toString(),
        title: `${product.title}${variant.title !== "Default Title" ? ` - ${variant.title}` : ""}`,
        sku: variant.sku ?? null,
        current_inventory: variant.inventory_quantity ?? 0,
        cost_per_unit: variant.cost ? parseFloat(variant.cost) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id,shopify_variant_id" }
    );
  }
}

async function handleProductDelete(supabase: any, shop: string, payload: any) {
  const { data: shopRecord } = await supabase
    .from("shops")
    .select("id")
    .eq("shopify_domain", shop)
    .single();

  if (!shopRecord) return;

  await supabase
    .from("products")
    .delete()
    .eq("shop_id", shopRecord.id)
    .eq("shopify_product_id", payload.id.toString());
}

async function handleInventoryUpdate(supabase: any, shop: string, payload: any) {
  const { data: shopRecord } = await supabase
    .from("shops")
    .select("id")
    .eq("shopify_domain", shop)
    .single();

  if (!shopRecord) return;

  // inventory_levels/update gives inventory_item_id, not variant_id
  // We match by shop + update inventory_quantity
  // Shopify inventory_item_id maps 1:1 to variant via the Admin API
  // For MVP: update via the variant lookup if we have it stored
  if (payload.inventory_item_id && payload.available !== undefined) {
    await supabase
      .from("products")
      .update({ current_inventory: payload.available, updated_at: new Date().toISOString() })
      .eq("shop_id", shopRecord.id)
      .eq("shopify_variant_id", payload.inventory_item_id.toString());
  }
}

async function handleUninstall(supabase: any, shop: string) {
  await supabase
    .from("shops")
    .update({ uninstalled_at: new Date().toISOString() })
    .eq("shopify_domain", shop);
}
