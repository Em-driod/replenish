"use client";

import { Suspense, useEffect, useState } from "react";
import {
  Page, Layout, Card, Select, TextField, Button,
  BlockStack, InlineStack, Text, Banner, Spinner, Divider, Box,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Reveal from "@/components/ui/Reveal";
import { authFetch } from "@/lib/authFetch";

interface Supplier { id: string; name: string; email: string; }
interface Product { id: string; title: string; sku: string | null; current_inventory: number; reorder_qty: number | null; }
interface LineItem { product_id: string; title: string; sku: string; qty: number; unit_cost: string; }

export default function NewPOPage() {
  return (
    <Suspense fallback={<Page title="New Purchase Order"><Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Page>}>
      <NewPOPageContent />
    </Suspense>
  );
}

function NewPOPageContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([authFetch("/api/suppliers"), authFetch("/api/products")]).then(async ([sRes, pRes]) => {
      if (sRes.ok) setSuppliers(await sRes.json());
      if (pRes.ok) setProducts(await pRes.json());
      setLoading(false);
    });
  }, []);

  const addLine = () => {
    const p = products.find(x => x.id === selectedProduct);
    if (!p || lines.find(l => l.product_id === p.id)) return;
    setLines(prev => [...prev, { product_id: p.id, title: p.title, sku: p.sku ?? "", qty: p.reorder_qty ?? 1, unit_cost: "" }]);
    setSelectedProduct("");
  };

  const updateQty = (i: number, v: string) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, qty: parseInt(v) || 1 } : l));
  const updateCost = (i: number, v: string) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, unit_cost: v } : l));
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + l.qty * (parseFloat(l.unit_cost) || 0), 0);
  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const submit = async (sendEmail: boolean) => {
    if (!supplierId) { setError("Please select a supplier."); return; }
    if (lines.length === 0) { setError("Add at least one product."); return; }
    setSubmitting(true); setError(null);
    const res = await authFetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: supplierId,
        expected_delivery_date: expectedDate || null,
        notes: notes || null,
        send_email: sendEmail,
        items: lines.map(l => ({ product_id: l.product_id, qty_ordered: l.qty, unit_cost: l.unit_cost ? parseFloat(l.unit_cost) : null })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Failed to create PO."); return; }
    setSuccess(sendEmail
      ? `✅ ${data.po_number} created and emailed to ${selectedSupplier?.email}.`
      : `✅ ${data.po_number} saved as draft.`
    );
    setLines([]); setSupplierId(""); setNotes(""); setExpectedDate("");
  };

  const supplierOptions = [{ label: "Select a supplier…", value: "" }, ...suppliers.map(s => ({ label: `${s.name} · ${s.email}`, value: s.id }))];
  const productOptions = [
    { label: "Choose a product to add…", value: "" },
    ...products.filter(p => !lines.find(l => l.product_id === p.id)).map(p => ({ label: `${p.title}${p.sku ? ` (${p.sku})` : ""} — ${p.current_inventory} in stock`, value: p.id })),
  ];

  if (loading) return <Page title="New Purchase Order"><Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Page>;

  return (
    <Page
      title=""
      backAction={{ content: "Purchase Orders", onAction: () => router.push("/purchase-orders") }}
    >
      <BlockStack gap="400">
        <PageHeader index="04.1" title="New Purchase Order" subtitle="Add line items and send directly to your supplier" />
      </BlockStack>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {success && (
              <Banner tone="success" title={success} action={{ content: "View all POs", onAction: () => router.push("/purchase-orders") }} onDismiss={() => setSuccess(null)} />
            )}
            {error && <Banner tone="critical" title={error} onDismiss={() => setError(null)} />}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Supplier & Details</Text>
                <Divider />
                <Select label="Supplier" options={supplierOptions} value={supplierId} onChange={setSupplierId} />
                {selectedSupplier && (
                  <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="subdued">PO will be emailed to: <strong>{selectedSupplier.email}</strong></Text>
                  </Box>
                )}
                <TextField label="Expected delivery date" type="date" value={expectedDate} onChange={setExpectedDate} autoComplete="off" />
                <TextField label="Notes to supplier (optional)" value={notes} onChange={setNotes} multiline={3} autoComplete="off" placeholder="Special instructions, shipping preferences…" />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Line Items</Text>
                <Divider />
                <InlineStack gap="300" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <Select label="Add product" options={productOptions} value={selectedProduct} onChange={setSelectedProduct} />
                  </div>
                  <Button onClick={addLine} disabled={!selectedProduct}>Add Item</Button>
                </InlineStack>

                {lines.length > 0 ? (
                  <>
                    <div className="rp-ledger">
                      {lines.map((l, i) => (
                        <Reveal key={l.product_id}>
                          <div className="rp-ledger__row" style={{ gridTemplateColumns: "auto 1.6fr 0.6fr 0.7fr 0.7fr auto" }}>
                            <span className="rp-ledger__index">{String(i + 1).padStart(2, "0")}</span>
                            <BlockStack gap="050">
                              <Text as="span" fontWeight="semibold">{l.title}</Text>
                              {l.sku && <Text as="span" variant="bodySm" tone="subdued">{l.sku}</Text>}
                            </BlockStack>
                            <TextField label="" labelHidden type="number" value={l.qty.toString()} onChange={v => updateQty(i, v)} autoComplete="off" />
                            <TextField label="" labelHidden type="number" prefix="$" value={l.unit_cost} onChange={v => updateCost(i, v)} autoComplete="off" placeholder="0.00" />
                            <Text as="span" fontWeight="semibold">${(l.qty * (parseFloat(l.unit_cost) || 0)).toFixed(2)}</Text>
                            <Button size="slim" tone="critical" variant="plain" onClick={() => removeLine(i)}>Remove</Button>
                          </div>
                        </Reveal>
                      ))}
                    </div>
                    <Divider />
                    <InlineStack align="end">
                      <Text variant="headingLg" as="p">Total: <strong>${total.toFixed(2)}</strong></Text>
                    </InlineStack>
                  </>
                ) : (
                  <Box padding="600">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text tone="subdued" as="p">No items added yet. Select a product above to begin.</Text>
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <div className="rp-panel-dark">
            <BlockStack gap="400">
              <span className="rp-panel-dark__label">Send Order</span>
              <Divider />
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">
                  <strong>Save as Draft</strong> — store the PO without sending. You can send it later.
                </Text>
                <Button fullWidth loading={submitting} onClick={() => submit(false)}>Save as Draft</Button>
              </BlockStack>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">
                  <strong>Email Supplier</strong> — save and immediately send the PO by email.
                </Text>
                <Button variant="primary" fullWidth loading={submitting} onClick={() => submit(true)} disabled={!supplierId || lines.length === 0}>
                  Save &amp; Email Supplier
                </Button>
              </BlockStack>
              {total > 0 && (
                <>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text tone="subdued" as="p">Order total</Text>
                    <Text fontWeight="bold" as="p">${total.toFixed(2)}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text tone="subdued" as="p">Line items</Text>
                    <Text as="p">{lines.length}</Text>
                  </InlineStack>
                </>
              )}
            </BlockStack>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
