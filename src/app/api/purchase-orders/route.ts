import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireShopId } from "@/lib/shop-context";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(name, email)")
    .eq("shop_id", ctx.shopId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await requireShopId(req);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();
  const { supplier_id, expected_delivery_date, notes, send_email, items } = body;

  const supabase = createAdminClient();

  // Get supplier — scoped to this shop so a merchant can't reference another shop's supplier
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplier_id)
    .eq("shop_id", ctx.shopId)
    .single();

  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  // Generate PO number scoped to this shop
  const { data: poNum, error: poNumError } = await supabase.rpc("generate_po_number", { p_shop_id: ctx.shopId });
  if (poNumError) return NextResponse.json({ error: poNumError.message }, { status: 500 });

  // Create PO
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      shop_id: ctx.shopId,
      supplier_id,
      po_number: poNum,
      expected_delivery_date: expected_delivery_date ?? null,
      notes: notes ?? null,
      status: send_email ? "sent" : "draft",
      sent_at: send_email ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (poError) return NextResponse.json({ error: poError.message }, { status: 500 });

  // Add line items — look up products scoped to this shop
  const lineItems: { title: string; sku: string; qty: number; cost: number }[] = [];
  if (items?.length > 0) {
    const lineRows = await Promise.all(
      items.map(async (item: any) => {
        const { data: product } = await supabase
          .from("products")
          .select("title, sku")
          .eq("id", item.product_id)
          .eq("shop_id", ctx.shopId)
          .single();

        lineItems.push({
          title: product?.title ?? "Unknown product",
          sku: product?.sku ?? "",
          qty: item.qty_ordered,
          cost: item.unit_cost ?? 0,
        });

        return {
          po_id: po.id,
          product_id: item.product_id,
          qty_ordered: item.qty_ordered,
          unit_cost: item.unit_cost ?? null,
        };
      })
    );
    await supabase.from("po_line_items").insert(lineRows);
  }

  // Send email via Resend
  if (send_email && supplier.email) {
    const lineItemsHtml = lineItems
      .map(
        (item) => `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.title}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.cost ? `$${item.cost}` : "—"}</td>
        </tr>`
      )
      .join("");

    const total = lineItems.reduce((sum, item) => sum + item.qty * item.cost, 0);

    await resend.emails.send({
      from: "Replenish <onboarding@resend.dev>",
      to: supplier.email,
      subject: `Purchase Order ${poNum}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h1 style="color:#4f46e5">Purchase Order: ${poNum}</h1>
          <p>Dear ${supplier.name},</p>
          <p>Please find below our purchase order details:</p>
          ${expected_delivery_date ? `<p><strong>Expected delivery:</strong> ${expected_delivery_date}</p>` : ""}
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:8px;text-align:left">Product</th>
                <th style="padding:8px;text-align:center">Qty</th>
                <th style="padding:8px;text-align:right">Unit Cost</th>
              </tr>
            </thead>
            <tbody>${lineItemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:8px;text-align:right"><strong>Total:</strong></td>
                <td style="padding:8px;text-align:right"><strong>$${total.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
          <p style="color:#6b7280;font-size:14px">Sent via Replenish · Inventory &amp; Purchase Order Management</p>
        </div>
      `,
    });
  }

  return NextResponse.json({ ok: true, po_number: poNum, po_id: po.id });
}
