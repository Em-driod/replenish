"use client";

import { Suspense, useEffect, useState } from "react";
import {
  Page, Card, DataTable, Badge, Text, Banner,
  Button, BlockStack, InlineStack, Spinner, Divider, Box,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";
import HeroStat from "@/components/ui/HeroStat";
import StockGauge from "@/components/ui/StockGauge";
import StampBadge from "@/components/ui/StampBadge";
import PageHeader from "@/components/ui/PageHeader";
import Reveal from "@/components/ui/Reveal";
import { authFetch } from "@/lib/authFetch";
import { isAtRiskOfStockout } from "@/lib/risk";

interface Product {
  id: string; title: string; sku: string | null;
  current_inventory: number; reorder_point: number | null;
  suppliers?: { name: string; default_lead_time_days: number | null } | null;
  sales_velocity?: { days_of_stock_remaining: number | null }[];
}
interface PO {
  id: string; po_number: string; status: string;
  created_at: string;
  suppliers?: { name: string } | null;
}
interface Supplier { id: string; }

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "critical" | undefined> = {
  draft: undefined, sent: "info", partial: "warning", received: "success", cancelled: "critical",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<Page title="Dashboard"><Box padding="2000"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Page>}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pos, setPOs] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      authFetch("/api/products").then(r => r.ok ? r.json() : []),
      authFetch("/api/purchase-orders").then(r => r.ok ? r.json() : []),
      authFetch("/api/suppliers").then(r => r.ok ? r.json() : []),
    ]).then(([p, po, s]) => {
      setProducts(p);
      setPOs(po);
      setSuppliers(s);
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

  const poRows = openPOs.slice(0, 5).map(po => [
    <Text key={`n-${po.id}`} as="span" fontWeight="semibold">{po.po_number}</Text>,
    po.suppliers?.name ?? "—",
    <Badge key={`s-${po.id}`} tone={STATUS_TONE[po.status]}>{po.status}</Badge>,
    new Date(po.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  ]);

  return (
    <Page title="">
      <BlockStack gap="600">

        <PageHeader index="01" title="Dashboard" subtitle="Live inventory health across your store" />

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

        {/* Manifest header — status stamp, not a mood-colored gradient tile */}
        <Reveal>
          <HeroStat
            eyebrow="Status"
            value={lowStock.length}
            ok={lowStock.length === 0}
            sub={
              outOfStock.length > 0
                ? `${outOfStock.length} product${outOfStock.length > 1 ? "s are" : " is"} completely out of stock. Restock now to avoid lost sales.`
                : lowStock.length > 0
                ? "products have dropped to or below their reorder point."
                : "No products are below their reorder points right now."
            }
            action={
              lowStock.length > 0 ? (
                <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}>Create purchase order</Button>
              ) : undefined
            }
          />
        </Reveal>

        {/* Manifest strip — inline counts, barcode-tick dividers */}
        <Reveal delay={0.05}>
          <div className="rp-manifest-strip">
            <div className="rp-manifest-strip__cell">
              <div className="rp-manifest-strip__label">Tracked Products</div>
              <div className="rp-manifest-strip__value">{products.length}</div>
              <div className="rp-manifest-strip__sub">synced from Shopify</div>
            </div>
            <div className="rp-manifest-strip__cell">
              <div className="rp-manifest-strip__label">Open Purchase Orders</div>
              <div className="rp-manifest-strip__value">{openPOs.length}</div>
              <div className="rp-manifest-strip__sub">
                {openPOs.filter(p => p.status === "sent").length} sent · {openPOs.filter(p => p.status === "draft").length} draft
              </div>
            </div>
            <div className="rp-manifest-strip__cell">
              <div className="rp-manifest-strip__label">Suppliers</div>
              <div className="rp-manifest-strip__value">{suppliers.length}</div>
              <div className="rp-manifest-strip__sub">ready to receive orders</div>
            </div>
            <div className="rp-manifest-strip__cell">
              <div className="rp-manifest-strip__label">Stock Health</div>
              <div className="rp-manifest-strip__value">
                {products.length > 0 ? `${Math.round(((products.length - lowStock.length) / products.length) * 100)}%` : "—"}
              </div>
              <div className="rp-manifest-strip__sub">of tracked SKUs above reorder point</div>
            </div>
          </div>
        </Reveal>

        {/* Low Stock Table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <div className="rp-section-heading"><Text variant="headingMd" as="h2">Low Stock Alerts</Text></div>
                <Text variant="bodySm" tone="subdued" as="p">Products that need reordering soon</Text>
              </BlockStack>
              <Button variant="plain" onClick={() => router.push("/products")}>View all →</Button>
            </InlineStack>
            <Divider />
            {lowStock.length === 0 ? (
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text variant="headingMd" as="p">All stock levels look good</Text>
                  <Text tone="subdued" as="p">No products are below their reorder points.</Text>
                </BlockStack>
              </Box>
            ) : (
              <div className="rp-ledger">
                {lowStock.slice(0, 6).map((p, i) => {
                  const daysRaw = p.sales_velocity?.[0]?.days_of_stock_remaining;
                  const days: number | null = daysRaw != null ? Number(daysRaw) : null;
                  return (
                    <Reveal key={p.id} delay={i * 0.04}>
                      <div className="rp-ledger__row">
                        <span className="rp-ledger__index">{String(i + 1).padStart(2, "0")}</span>
                        <BlockStack gap="050">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">{p.title}</Text>
                          {p.sku && <Text as="span" variant="bodySm" tone="subdued">{p.sku}</Text>}
                        </BlockStack>
                        <StockGauge current={p.current_inventory} reorderPoint={p.reorder_point} />
                        {days != null ? (
                          (() => {
                            const atRisk = isAtRiskOfStockout(days, p.suppliers?.default_lead_time_days);
                            if (atRisk || days <= 7) return <StampBadge tone="bad">Reorder Now</StampBadge>;
                            if (days <= 14) return <StampBadge tone="warn">Low Soon</StampBadge>;
                            return <span className="rp-num" style={{ color: "var(--rp-ink-soft)", fontSize: 13 }}>{`${Math.round(days)}d left`}</span>;
                          })()
                        ) : (
                          <Text as="span" tone="subdued">—</Text>
                        )}
                        <Button size="slim" onClick={() => router.push("/purchase-orders/new")}>Create PO</Button>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </BlockStack>
        </Card>

        {/* PO Table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <div className="rp-section-heading"><Text variant="headingMd" as="h2">Purchase Orders</Text></div>
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
