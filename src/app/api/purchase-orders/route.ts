import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(name, email)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { supplier_id, expected_delivery_date, notes, send_email, items } = body;

  const supabase = createAdminClient();

  // Get supplier
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplier_id)
    .single();

  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  // Get shop (first installed)
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .is("uninstalled_at", null)
    .single();

  if (!shop) return NextResponse.json({ error: "No shop found" }, { status: 404 });

  // Generate PO number
  const { data: poNum } = await supabase.rpc("generate_po_number");

  // Create PO
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      shop_id: shop.id,
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

  // Add line items
  if (items?.length > 0) {
    const lineRows = await Promise.all(
      items.map(async (item: any) => {
        const { data: product } = await supabase
          .from("products")
          .select("title, sku")
          .eq("id", item.product_id)
          .single();
        return {
          po_id: po.id,
          product_id: item.product_id,
          qty_ordered: item.qty_ordered,
          unit_cost: item.unit_cost ?? null,
          product_title: product?.title ?? "",
          product_sku: product?.sku ?? "",
        };
      })
    );
    await supabase.from("po_line_items").insert(lineRows);
  }

  // Send email via Resend
  if (send_email && supplier.email) {
    const lineItemsHtml = items
      .map((item: any, i: number) => {
        const row = (items as any[])[i];
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${row.product_title ?? item.product_id}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty_ordered}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.unit_cost ? `$${item.unit_cost}` : "—"}</td>
        </tr>`;
      })
      .join("");

    const total = items.reduce((sum: number, item: any) => sum + item.qty_ordered * (item.unit_cost ?? 0), 0);

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
