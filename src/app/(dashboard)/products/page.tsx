"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Page, Card, DataTable, Badge, Button, TextField, BlockStack,
  InlineStack, Text, Spinner, EmptyState, Modal, Select, Banner,
  Box, Divider,
} from "@shopify/polaris";

interface Product {
  id: string; title: string; sku: string | null;
  current_inventory: number; reorder_point: number | null;
  reorder_qty: number | null; is_tracked: boolean; supplier_id: string | null;
  suppliers?: { name: string } | null;
  sales_velocity?: { avg_daily_sales: number; days_of_stock_remaining: number | null }[];
}
interface Supplier { id: string; name: string; }

export default function ProductsPage() {
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetch("/api/products"), fetch("/api/suppliers")]);
      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
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
    await fetch(`/api/products/${editProduct.id}`, {
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

  const stockBadge = (p: Product) => {
    if (p.current_inventory === 0) return <Badge tone="critical">Out of stock</Badge>;
    if (p.reorder_point !== null && p.current_inventory <= p.reorder_point) return <Badge tone="warning">{`${p.current_inventory} left`}</Badge>;
    return <Badge tone="success">{`${p.current_inventory} in stock`}</Badge>;
  };

  const filtered = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(p => [
    <BlockStack key={`t-${p.id}`} gap="050">
      <Text as="span" fontWeight="semibold">{p.title}</Text>
      {p.sku && <Text as="span" variant="bodySm" tone="subdued">{p.sku}</Text>}
    </BlockStack>,
    stockBadge(p),
    p.reorder_point ?? <Text as="span" tone="subdued">Not set</Text>,
    daysBadge(p.sales_velocity?.[0]?.days_of_stock_remaining),
    p.suppliers?.name ?? <Text as="span" tone="subdued">—</Text>,
    <Button key={`e-${p.id}`} size="slim" onClick={() => openEdit(p)}>Configure</Button>,
  ]);

  const supplierOptions = [
    { label: "No supplier assigned", value: "" },
    ...suppliers.map(s => ({ label: s.name, value: s.id })),
  ];

  return (
    <Page
      title="Products"
      subtitle={products.length > 0 ? `${products.length} products synced` : undefined}
      primaryAction={{ content: syncing ? "Syncing…" : "Sync from Shopify", onAction: sync, loading: syncing }}
    >
      <BlockStack gap="400">
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
              image=""
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
            <DataTable
              columnContentTypes={["text", "text", "numeric", "text", "text", "text"]}
              headings={["Product", "Stock", "Reorder At", "Days Left", "Supplier", ""]}
              rows={rows}
              hoverable
            />
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
