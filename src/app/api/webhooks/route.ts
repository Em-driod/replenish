import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/server";
import { getShopByDomain, markShopUninstalled } from "@/lib/db";
import { planFromSubscriptionName } from "@/lib/billing";

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
        const { data: updated } = await supabase
          .from("products")
          .update({ current_inventory: payload.available, updated_at: new Date().toISOString() } as any)
          .eq("shop_id", shopRecord.id)
          .eq("shopify_inventory_item_id", payload.inventory_item_id?.toString())
          .select("id")
          .single();

        if (updated) {
          await supabase.from("inventory_snapshots").insert({
            product_id: (updated as { id: string }).id,
            inventory: payload.available,
          } as any);
        }
      }
      break;
    case "app/uninstalled":
      await markShopUninstalled(shop);
      break;

    // ── Mandatory GDPR compliance webhooks (required for App Store approval) ──
    case "customers/data_request":
    case "customers/redact":
      // Replenish never stores customer PII — no customer names, emails, or
      // order contents, only shop-level product/supplier/PO data — so there
      // is nothing to export or erase for either of these.
      break;

    case "shop/redact":
      // Shopify sends this ~48h after uninstall, requiring full data erasure.
      await redactShop(supabase, shop);
      break;

    case "app_subscriptions/update": {
      // Keeps plan_id in sync when a merchant cancels/downgrades from Shopify's
      // own billing UI rather than through Replenish.
      const sub = payload.app_subscription;
      const planId = sub?.status === "ACTIVE" ? planFromSubscriptionName(sub.name ?? "") : "free";
      await supabase.from("shops").update({ plan_id: planId } as any).eq("id", shopRecord.id);
      break;
    }
  }

  return NextResponse.json({ ok: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function redactShop(supabase: any, shopDomain: string) {
  await supabase.from("shopify_sessions").delete().eq("shop", shopDomain);
  // Cascades to suppliers, products (+ sales_velocity, inventory_snapshots),
  // purchase_orders (+ po_line_items), and webhook_events via FK constraints.
  await supabase.from("shops").delete().eq("shopify_domain", shopDomain);
}

async function handleProductUpsert(supabase: any, shopId: string, product: any) {
  const imagesById = new Map((product.images ?? []).map((img: any) => [img.id, img.src]));
  const defaultImage = product.image?.src ?? product.images?.[0]?.src ?? null;

  const rows = (product.variants ?? []).map((v: any) => ({
    shop_id: shopId,
    shopify_product_id: product.id.toString(),
    shopify_variant_id: v.id.toString(),
    shopify_inventory_item_id: v.inventory_item_id?.toString() ?? null,
    image_url: (v.image_id != null ? imagesById.get(v.image_id) : null) ?? defaultImage,
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
