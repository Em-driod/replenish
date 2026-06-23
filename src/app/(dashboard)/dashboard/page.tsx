"use client";

import { useEffect, useState } from "react";
import {
  Page, Layout, Card, DataTable, Badge, Text, Banner,
  EmptyState, Button, BlockStack, InlineStack, Spinner, Divider, Box,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

interface Product {
  id: string; title: string; sku: string | null;
  current_inventory: number; reorder_point: number | null;
  suppliers?: { name: string } | null;
  sales_velocity?: { days_of_stock_remaining: number | null }[];
}
interface PO {
  id: string; po_number: string; status: string;
  created_at: string;
  suppliers?: { name: string } | null;
}

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "critical" | undefined> = {
  draft: undefined, sent: "info", partial: "warning", received: "success", cancelled: "critical",
};

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then(r => r.ok ? r.json() : []),
      fetch("/api/purchase-orders").then(r => r.ok ? r.json() : []),
    ]).then(([p, po]) => {
      setProducts(p);
      setPOs(po);
      setLoading(false);
    });
  }, []);

  const lowStock = products.filter(p => p.reorder_point !== null && p.current_inventory <= p.reorder_point);
  const outOfStock = lowStock.filter(p => p.current_inventory === 0);
  const openPOs = pos.filter(p => p.status === "draft" || p.status === "sent");

  if (loading) {
    return (
      <Page title="Dashboard">
        <Box padding="2000">
          <InlineStack align="center"><Spinner size="large" /></InlineStack>
        </Box>
      </Page>
    );
  }

  const lowStockRows = lowStock.slice(0, 6).map(p => {
    const days = p.sales_velocity?.[0]?.days_of_stock_remaining;
    const stockTone = p.current_inventory === 0 ? "critical" : "warning";
    return [
      <BlockStack key={`t-${p.id}`} gap="050">
        <Text as="span" variant="bodyMd" fontWeight="semibold">{p.title}</Text>
        {p.sku && <Text as="span" variant="bodySm" tone="subdued">{p.sku}</Text>}
      </BlockStack>,
      <Badge key={`b-${p.id}`} tone={stockTone}>
        {p.current_inventory === 0 ? "Out of stock" : `${p.current_inventory} left`}
      </Badge>,
      days != null
        ? <Badge key={`d-${p.id}`} tone={days <= 7 ? "critical" : days <= 14 ? "warning" : "success"}>{Math.round(days)} days</Badge>
        : <Text key={`d-${p.id}`} as="span" tone="subdued">—</Text>,
      p.suppliers?.name ?? <Text key={`s-${p.id}`} as="span" tone="subdued">No supplier</Text>,
      <Button key={`a-${p.id}`} size="slim" onClick={() => router.push("/purchase-orders/new")}>Create PO</Button>,
    ];
  });

  const poRows = openPOs.slice(0, 5).map(po => [
    <Text key={`n-${po.id}`} as="span" fontWeight="semibold">{po.po_number}</Text>,
    po.suppliers?.name ?? "—",
    <Badge key={`s-${po.id}`} tone={STATUS_TONE[po.status]}>{po.status}</Badge>,
    new Date(po.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  ]);

  return (
    <Page title="Dashboard">
      <BlockStack gap="600">

        {outOfStock.length > 0 && (
          <Banner
            tone="critical"
            title={`${outOfStock.length} product${outOfStock.length > 1 ? "s are" : " is"} out of stock`}
            action={{ content: "Create purchase order", onAction: () => router.push("/purchase-orders/new") }}
          >
            <p>Restock immediately to avoid lost sales.</p>
          </Banner>
        )}

        {products.length === 0 && (
          <Banner
            tone="warning"
            title="Sync your products to get started"
            action={{ content: "Go to Products →", onAction: () => router.push("/products") }}
          >
            <p>Pull your Shopify inventory into Replenish to start tracking stock levels and set reorder alerts.</p>
          </Banner>
        )}

        {/* KPI Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">🔴  Low Stock Alerts</Text>
                <Text variant="heading2xl" as="p" tone={lowStock.length > 0 ? "critical" : undefined}>
                  {lowStock.length}
                </Text>
                <Divider />
                <Text variant="bodySm" tone="subdued" as="p">
                  {outOfStock.length > 0 ? `${outOfStock.length} out of stock` : "All stock OK"}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">📦  Tracked Products</Text>
                <Text variant="heading2xl" as="p">{products.length}</Text>
                <Divider />
                <Text variant="bodySm" tone="subdued" as="p">synced from Shopify</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">🛒  Open Purchase Orders</Text>
                <Text variant="heading2xl" as="p">{openPOs.length}</Text>
                <Divider />
                <Text variant="bodySm" tone="subdued" as="p">
                  {openPOs.filter(p => p.status === "sent").length} sent ·{" "}
                  {openPOs.filter(p => p.status === "draft").length} draft
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Low Stock Table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text variant="headingMd" as="h2">Low Stock Alerts</Text>
                <Text variant="bodySm" tone="subdued" as="p">Products that need reordering soon</Text>
              </BlockStack>
              <Button variant="plain" onClick={() => router.push("/products")}>View all →</Button>
            </InlineStack>
            <Divider />
            {lowStock.length === 0 ? (
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text variant="headingMd" as="p">✅ All stock levels look good</Text>
                  <Text tone="subdued" as="p">No products are below their reorder points.</Text>
                </BlockStack>
              </Box>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Product", "Stock", "Days Left", "Supplier", ""]}
                rows={lowStockRows}
                hoverable
              />
            )}
          </BlockStack>
        </Card>

        {/* PO Table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text variant="headingMd" as="h2">Purchase Orders</Text>
                <Text variant="bodySm" tone="subdued" as="p">Open and recent orders to suppliers</Text>
              </BlockStack>
              <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}>+ New PO</Button>
            </InlineStack>
            <Divider />
            {openPOs.length === 0 ? (
              <Box padding="800">
                <BlockStack gap="300" inlineAlign="center">
                  <Text variant="headingMd" as="p">No open purchase orders</Text>
                  <Text tone="subdued" as="p">Create a PO to send directly to your supplier.</Text>
                  <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}>Create first PO</Button>
                </BlockStack>
              </Box>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["PO Number", "Supplier", "Status", "Created"]}
                rows={poRows}
                hoverable
              />
            )}
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  );
}
