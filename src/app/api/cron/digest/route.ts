import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ShopRow {
  id: string;
  shopify_domain: string;
  settings: { low_stock_digest_enabled?: boolean; digest_email?: string | null } | null;
}

interface ProductRow {
  title: string;
  sku: string | null;
  current_inventory: number;
  reorder_point: number | null;
}

/**
 * Daily low-stock digest — the proactive counterpart to the dashboard: tells
 * merchants what needs reordering by email instead of relying on them to
 * remember to open the app. Triggered by Vercel Cron (see vercel.json).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: shops } = await supabase
    .from("shops")
    .select("id, shopify_domain, settings")
    .is("uninstalled_at", null);

  if (!shops || shops.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  let skipped = 0;

  for (const shop of shops as ShopRow[]) {
    const settings = shop.settings ?? {};
    const email = settings.digest_email;
    if (settings.low_stock_digest_enabled === false || !email) {
      skipped++;
      continue;
    }

    const { data: products } = await supabase
      .from("products")
      .select("title, sku, current_inventory, reorder_point")
      .eq("shop_id", shop.id)
      .eq("is_tracked", true)
      .not("reorder_point", "is", null);

    const lowStock = ((products ?? []) as ProductRow[]).filter(
      (p) => p.reorder_point !== null && p.current_inventory <= p.reorder_point
    );

    if (lowStock.length === 0) continue; // no news isn't worth an email

    const rowsHtml = lowStock
      .slice(0, 25)
      .map(
        (p) => `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${p.title}${p.sku ? ` <span style="color:#888">(${p.sku})</span>` : ""}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${p.current_inventory}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${p.reorder_point}</td>
        </tr>`
      )
      .join("");

    try {
      await resend.emails.send({
        from: "Replenish <onboarding@resend.dev>",
        to: email,
        subject: `${lowStock.length} product${lowStock.length === 1 ? "" : "s"} need reordering — ${shop.shopify_domain}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h1 style="color:#1e6bff">Low Stock Alert</h1>
            <p>${lowStock.length} product${lowStock.length === 1 ? " is" : "s are"} at or below their reorder point today.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:8px;text-align:left">Product</th>
                  <th style="padding:8px;text-align:center">In Stock</th>
                  <th style="padding:8px;text-align:center">Reorder At</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <p style="color:#6b7280;font-size:14px">Open Replenish to create a purchase order for these items.</p>
          </div>
        `,
      });
      sent++;
    } catch (err) {
      console.error(`Digest email failed for ${shop.shopify_domain}:`, err);
    }
  }

  return NextResponse.json({ sent, skipped, totalShops: shops.length });
}
