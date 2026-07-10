"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import {
  Page, Card, Badge, Button, TextField, BlockStack,
  InlineStack, Text, Spinner, EmptyState, Modal, Select, Banner,
  Box,
} from "@shopify/polaris";
import PageHeader from "@/components/ui/PageHeader";
import StockGauge from "@/components/ui/StockGauge";
import { useShop, withShop } from "@/lib/useShop";

interface Product {
  id: string; title: string; sku: string | null;
  current_inventory: number; reorder_point: number | null;
  reorder_qty: number | null; is_tracked: boolean; supplier_id: string | null;
  suppliers?: { name: string } | null;
  sales_velocity?: { avg_daily_sales: number; days_of_stock_remaining: number | null }[];
}
interface Supplier { id: string; name: string; }

export default function ProductsPage() {
  return (
    <Suspense fallback={<Page title="Products"><Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Page>}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ reorder_point: "", reorder_qty: "", supplier_id: "" });
  const [search, setSearch] = useState("");
  const shop = useShop();

  const load = useCallback(async () => {
    if (!shop) { setLoading(false); return; }
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetch(withShop("/api/products", shop)), fetch(withShop("/api/suppliers", shop))]);
      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(withShop("/api/sync", shop), { method: "POST" });
      if (res.ok) { setSuccess("Products synced from Shopify."); load(); }
      else setError("Sync failed. Check that the store is connected.");
    } catch { setError("Sync failed."); }
    finally { setSyncing(false); }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ reorder_point: p.reorder_point?.toString() ?? "", reorder_qty: p.reorder_qty?.toString() ?? "", supplier_id: p.supplier_id ?? "" });
  };

  const save = async () => {
    if (!editProduct) return;
    setSaving(true);
    await fetch(withShop(`/api/products/${editProduct.id}`, shop), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorder_point: form.reorder_point ? parseInt(form.reorder_point) : null,
        reorder_qty: form.reorder_qty ? parseInt(form.reorder_qty) : null,
        supplier_id: form.supplier_id || null,
        is_tracked: true,
      }),
    });
    setSaving(false);
    setEditProduct(null);
    setSuccess("Settings saved.");
    load();
  };

  const daysBadge = (days: number | null | undefined) => {
    if (days == null) return <Text as="span" tone="subdued">—</Text>;
    const rounded = Math.round(days);
    const tone = rounded <= 7 ? "critical" : rounded <= 14 ? "warning" : "success";
    return <Badge tone={tone}>{`${rounded} days`}</Badge>;
  };

  const filtered = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const supplierOptions = [
    { label: "No supplier assigned", value: "" },
    ...suppliers.map(s => ({ label: s.name, value: s.id })),
  ];

  return (
    <Page title="">
      <BlockStack gap="400">
        <PageHeader
          index="02"
          title="Products"
          subtitle={products.length > 0 ? `${products.length} products synced from Shopify` : "Sync your catalog to start tracking stock"}
          action={<Button variant="primary" loading={syncing} onClick={sync}>{syncing ? "Syncing…" : "Sync from Shopify"}</Button>}
        />
        {success && <Banner tone="success" title={success} onDismiss={() => setSuccess(null)} />}
        {error && <Banner tone="critical" title={error} onDismiss={() => setError(null)} />}

        {products.length > 0 && (
          <Box>
            <TextField
              label="" labelHidden
              placeholder="Search products or SKU…"
              value={search}
              onChange={setSearch}
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearch("")}
            />
          </Box>
        )}

        <Card>
          {loading ? (
            <Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box>
          ) : products.length === 0 ? (
            <EmptyState
              heading="No products synced yet"
              image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
              action={{ content: "Sync from Shopify", onAction: sync, loading: syncing }}
            >
              <p>Pull your Shopify products into Replenish to track inventory, set reorder points, and get low-stock alerts.</p>
            </EmptyState>
          ) : filtered.length === 0 ? (
            <Box padding="800">
              <BlockStack gap="200" inlineAlign="center">
                <Text variant="headingMd" as="p">No products match "{search}"</Text>
                <Button variant="plain" onClick={() => setSearch("")}>Clear search</Button>
              </BlockStack>
            </Box>
          ) : (
            <div className="rp-ledger">
              {filtered.map((p, i) => (
                <div className="rp-ledger__row" key={p.id}>
                  <span className="rp-ledger__index">{String(i + 1).padStart(2, "0")}</span>
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold">{p.title}</Text>
                    {p.sku && <Text as="span" variant="bodySm" tone="subdued">{p.sku}</Text>}
                  </BlockStack>
                  <StockGauge current={p.current_inventory} reorderPoint={p.reorder_point} />
                  {daysBadge(p.sales_velocity?.[0]?.days_of_stock_remaining)}
                  <Button size="slim" onClick={() => openEdit(p)}>Configure</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlockStack>

      {editProduct && (
        <Modal
          open
          onClose={() => setEditProduct(null)}
          title="Configure Product"
          primaryAction={{ content: "Save Settings", onAction: save, loading: saving }}
          secondaryActions={[{ content: "Cancel", onAction: () => setEditProduct(null) }]}
        >
          <Modal.Section>
            <BlockStack gap="050">
              <Text variant="headingMd" as="p">{editProduct.title}</Text>
              {editProduct.sku && <Text tone="subdued" as="p">SKU: {editProduct.sku}</Text>}
              <Text tone="subdued" as="p">Current stock: {editProduct.current_inventory} units</Text>
            </BlockStack>
          </Modal.Section>
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Reorder point (units)"
                type="number"
                value={form.reorder_point}
                onChange={v => setForm(f => ({ ...f, reorder_point: v }))}
                helpText="Alert when stock drops to or below this level"
                autoComplete="off"
                placeholder="e.g. 20"
              />
              <TextField
                label="Reorder quantity (units)"
                type="number"
                value={form.reorder_qty}
                onChange={v => setForm(f => ({ ...f, reorder_qty: v }))}
                helpText="Default quantity to add to a purchase order"
                autoComplete="off"
                placeholder="e.g. 100"
              />
              <Select
                label="Assigned supplier"
                options={supplierOptions}
                value={form.supplier_id}
                onChange={v => setForm(f => ({ ...f, supplier_id: v }))}
              />
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
