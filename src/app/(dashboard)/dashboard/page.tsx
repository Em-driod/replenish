"use client";

import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Text,
  Banner,
  EmptyState,
  Button,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";

// Placeholder data — will be replaced with real Supabase fetch
const mockLowStockProducts = [
  {
    id: "1",
    title: "Blue Widget - Small",
    sku: "BW-S-001",
    current_inventory: 3,
    reorder_point: 10,
    days_remaining: 4,
    supplier: "Acme Widgets Co.",
  },
  {
    id: "2",
    title: "Red Gadget - Large",
    sku: "RG-L-002",
    current_inventory: 0,
    reorder_point: 5,
    days_remaining: 0,
    supplier: "Gadgets Inc.",
  },
  {
    id: "3",
    title: "Green Doohickey",
    sku: "GD-003",
    current_inventory: 7,
    reorder_point: 15,
    days_remaining: 9,
    supplier: "Parts World",
  },
];

const mockPendingPOs = [
  { id: "1", po_number: "PO-2026-0003", supplier: "Acme Widgets Co.", status: "sent", items: 4, expected: "Jun 24" },
  { id: "2", po_number: "PO-2026-0002", supplier: "Gadgets Inc.", status: "draft", items: 2, expected: "—" },
];

export default function DashboardPage() {
  const lowStockRows = mockLowStockProducts.map((p) => [
    p.title,
    p.sku,
    <Badge key={p.id} tone={p.current_inventory === 0 ? "critical" : "warning"}>
      {p.current_inventory === 0 ? "Out of stock" : `${p.current_inventory} left`}
    </Badge>,
    p.days_remaining === 0 ? "—" : `${p.days_remaining} days`,
    p.supplier,
    <Button key={`po-${p.id}`} size="slim" variant="plain">
      Create PO
    </Button>,
  ]);

  const poRows = mockPendingPOs.map((po) => [
    po.po_number,
    po.supplier,
    <Badge key={po.id} tone={po.status === "sent" ? "info" : undefined}>
      {po.status}
    </Badge>,
    `${po.items} items`,
    po.expected,
    <Button key={`view-${po.id}`} size="slim" variant="plain">
      View
    </Button>,
  ]);

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        {/* Alert banner when critical stock exists */}
        {mockLowStockProducts.some((p) => p.current_inventory === 0) && (
          <Banner tone="critical" title="1 product is out of stock">
            Create a purchase order to restock before losing sales.
          </Banner>
        )}

        {/* Summary cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">Products below reorder point</Text>
                <Text variant="heading2xl" as="p">3</Text>
                <Text variant="bodySm" tone="critical" as="p">↑ 2 since last week</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">Open purchase orders</Text>
                <Text variant="heading2xl" as="p">2</Text>
                <Text variant="bodySm" tone="subdued" as="p">1 sent · 1 draft</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="p">Tracked products</Text>
                <Text variant="heading2xl" as="p">24</Text>
                <Text variant="bodySm" tone="subdued" as="p">of 68 total variants</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Low stock table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">Low Stock Alerts</Text>
              <Button variant="plain" url="/products">Manage all products</Button>
            </InlineStack>
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text", "text"]}
              headings={["Product", "SKU", "Stock", "Days Remaining", "Supplier", ""]}
              rows={lowStockRows}
            />
          </BlockStack>
        </Card>

        {/* Pending POs */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">Purchase Orders</Text>
              <Button variant="primary" url="/purchase-orders/new">New PO</Button>
            </InlineStack>
            {mockPendingPOs.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                headings={["PO Number", "Supplier", "Status", "Items", "Expected", ""]}
                rows={poRows}
              />
            ) : (
              <EmptyState
                heading="No purchase orders yet"
                image=""
                action={{ content: "Create your first PO", url: "/purchase-orders/new" }}
              >
                <p>Add a supplier and create a PO to send directly from Replenish.</p>
              </EmptyState>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
