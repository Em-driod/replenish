"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import {
  Page, Card, Badge, Button, EmptyState,
  BlockStack, InlineStack, Text, Spinner, Banner, Box, Modal,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Reveal from "@/components/ui/Reveal";
import { authFetch } from "@/lib/authFetch";

interface PO {
  id: string; po_number: string; status: string;
  created_at: string; expected_delivery_date?: string | null;
  suppliers?: { name: string; email: string } | null;
}

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "critical" | undefined> = {
  draft: undefined, sent: "info", partial: "warning", received: "success", cancelled: "critical",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", partial: "Partial", received: "Received", cancelled: "Cancelled",
};

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<Page title="Purchase Orders"><Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Page>}>
      <PurchaseOrdersPageContent />
    </Suspense>
  );
}

function PurchaseOrdersPageContent() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmReceive, setConfirmReceive] = useState<PO | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/purchase-orders");
      if (res.ok) setPOs(await res.json());
      else setError("Failed to load purchase orders.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markReceived = async (po: PO) => {
    setReceiving(true);
    await authFetch(`/api/purchase-orders/${po.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "received", received_at: new Date().toISOString() }),
    });
    setReceiving(false);
    setConfirmReceive(null);
    setSuccess(`${po.po_number} marked as received.`);
    load();
  };

  const counts = { draft: 0, sent: 0, received: 0 };
  pos.forEach(p => { if (p.status in counts) counts[p.status as keyof typeof counts]++; });

  return (
    <Page title="">
      <BlockStack gap="500">
        <PageHeader
          index="04"
          title="Purchase Orders"
          subtitle={pos.length > 0 ? `${pos.length} order${pos.length === 1 ? "" : "s"} total` : "Build a PO and email it straight to your supplier"}
          action={<Button variant="primary" onClick={() => router.push("/purchase-orders/new")}>+ New Purchase Order</Button>}
        />
        {success && <Banner tone="success" title={success} onDismiss={() => setSuccess(null)} />}
        {error && <Banner tone="critical" title={error} onDismiss={() => setError(null)} />}

        {pos.length > 0 && (
          <Reveal delay={0.05}>
            <div className="rp-manifest-strip">
              <div className="rp-manifest-strip__cell">
                <div className="rp-manifest-strip__label">Draft</div>
                <div className="rp-manifest-strip__value">{counts.draft}</div>
                <div className="rp-manifest-strip__sub">not yet sent</div>
              </div>
              <div className="rp-manifest-strip__cell">
                <div className="rp-manifest-strip__label">Sent to Supplier</div>
                <div className="rp-manifest-strip__value">{counts.sent}</div>
                <div className="rp-manifest-strip__sub">awaiting delivery</div>
              </div>
              <div className="rp-manifest-strip__cell">
                <div className="rp-manifest-strip__label">Received</div>
                <div className="rp-manifest-strip__value">{counts.received}</div>
                <div className="rp-manifest-strip__sub">fulfilled orders</div>
              </div>
            </div>
          </Reveal>
        )}

        <Card>
          {loading ? (
            <Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box>
          ) : pos.length === 0 ? (
            <EmptyState
              heading="No purchase orders yet"
              image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
              action={{ content: "Create your first PO", onAction: () => router.push("/purchase-orders/new") }}
            >
              <p>Build a purchase order, add line items, and email it directly to your supplier — all in one step.</p>
            </EmptyState>
          ) : (
            <div className="rp-ledger">
              {pos.map((po, i) => (
                <Reveal key={po.id} delay={Math.min(i * 0.05, 0.5)}>
                  <div className="rp-ledger__row" style={{ gridTemplateColumns: "auto 1fr 1fr auto auto auto" }}>
                    <span className="rp-ledger__index">{String(i + 1).padStart(2, "0")}</span>
                    <Text as="span" fontWeight="semibold">{po.po_number}</Text>
                    <Text as="span" tone="subdued">{po.suppliers?.name ?? "—"}</Text>
                    <Badge tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status] ?? po.status}</Badge>
                    <Text as="span" tone="subdued">
                      {po.expected_delivery_date
                        ? new Date(po.expected_delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </Text>
                    {po.status === "sent" ? (
                      <Button size="slim" tone="success" onClick={() => setConfirmReceive(po)}>Mark Received</Button>
                    ) : (
                      <span />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </Card>
      </BlockStack>

      <Modal
        open={confirmReceive !== null}
        onClose={() => setConfirmReceive(null)}
        title={`Confirm receipt of ${confirmReceive?.po_number}`}
        primaryAction={{ content: "Yes, Mark Received", loading: receiving, onAction: () => confirmReceive && markReceived(confirmReceive) }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirmReceive(null) }]}
      >
        <Modal.Section>
          <Text as="p">
            Mark all items in <strong>{confirmReceive?.po_number}</strong> as received from <strong>{confirmReceive?.suppliers?.name}</strong>?
            This will update your inventory records.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
