"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Page, Card, DataTable, Badge, Button, EmptyState,
  BlockStack, InlineStack, Text, Spinner, Banner, Box, Divider, Modal,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

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
      const res = await fetch("/api/purchase-orders");
      if (res.ok) setPOs(await res.json());
      else setError("Failed to load purchase orders.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markReceived = async (po: PO) => {
    setReceiving(true);
    await fetch(`/api/purchase-orders/${po.id}`, {
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

  const rows = pos.map(po => [
    <Text key={`n-${po.id}`} as="span" fontWeight="semibold">{po.po_number}</Text>,
    po.suppliers?.name ?? "—",
    <Badge key={`s-${po.id}`} tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status] ?? po.status}</Badge>,
    po.expected_delivery_date
      ? new Date(po.expected_delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    new Date(po.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    <InlineStack gap="200" key={`a-${po.id}`}>
      {po.status === "sent" && (
        <Button size="slim" tone="success" onClick={() => setConfirmReceive(po)}>Mark Received</Button>
      )}
    </InlineStack>,
  ]);

  return (
    <Page
      title="Purchase Orders"
      primaryAction={{ content: "+ New Purchase Order", onAction: () => router.push("/purchase-orders/new") }}
    >
      <BlockStack gap="500">
        {success && <Banner tone="success" title={success} onDismiss={() => setSuccess(null)} />}
        {error && <Banner tone="critical" title={error} onDismiss={() => setError(null)} />}

        {pos.length > 0 && (
          <InlineStack gap="400">
            {[
              { label: "Draft", count: counts.draft, tone: undefined },
              { label: "Sent to supplier", count: counts.sent, tone: "info" as const },
              { label: "Received", count: counts.received, tone: "success" as const },
            ].map(stat => (
              <Card key={stat.label}>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">{stat.label}</Text>
                  <Text variant="headingXl" as="p">{stat.count}</Text>
                </BlockStack>
              </Card>
            ))}
          </InlineStack>
        )}

        <Card>
          {loading ? (
            <Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box>
          ) : pos.length === 0 ? (
            <EmptyState
              heading="No purchase orders yet"
              image=""
              action={{ content: "Create your first PO", onAction: () => router.push("/purchase-orders/new") }}
            >
              <p>Build a purchase order, add line items, and email it directly to your supplier — all in one step.</p>
            </EmptyState>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text", "text"]}
              headings={["PO Number", "Supplier", "Status", "Expected Delivery", "Created", ""]}
              rows={rows}
              hoverable
            />
          )}
        </Card>
      </BlockStack>

      <Modal
        open={confirmReceive !== null}
        onClose={() => setConfirmReceive(null)}
        title={`Confirm receipt of ${confirmReceive?.po_number}`}
        primaryAction={{ content: "Yes, Mark Received", tone: "success", loading: receiving, onAction: () => confirmReceive && markReceived(confirmReceive) }}
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
