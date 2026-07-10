"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import {
  Page, Card, Button, EmptyState,
  BlockStack, InlineStack, Text, Modal, TextField, Spinner, Banner,
  Box,
} from "@shopify/polaris";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import { useShop, withShop } from "@/lib/useShop";

interface Supplier {
  id: string; name: string; email: string;
  default_lead_time_days?: number | null; notes?: string | null;
}

const EMPTY = { name: "", email: "", notes: "", lead_time_days: "" };

export default function SuppliersPage() {
  return (
    <Suspense fallback={<Page title="Suppliers"><Box padding="1600"><InlineStack align="center"><Spinner /></InlineStack></Box></Page>}>
      <SuppliersPageContent />
    </Suspense>
  );
}

function SuppliersPageContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const shop = useShop();

  const load = useCallback(async () => {
    if (!shop) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withShop("/api/suppliers", shop));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setSuppliers(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setFormError(null); setModal("add"); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, notes: s.notes ?? "", lead_time_days: s.default_lead_time_days?.toString() ?? "" });
    setFormError(null);
    setModal("edit");
  };

  const save = async () => {
    if (!form.name.trim()) { setFormError("Company name is required."); return; }
    if (!form.email.trim()) { setFormError("Email address is required."); return; }
    setSaving(true); setFormError(null);
    const payload = { name: form.name.trim(), email: form.email.trim(), notes: form.notes.trim() || null, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : 14 };
    const url = withShop(editing ? `/api/suppliers/${editing.id}` : "/api/suppliers", shop);
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "Failed to save"); return; }
    setModal(null);
    setSuccess(editing ? "Supplier updated successfully." : "Supplier added successfully.");
    load();
  };

  const del = async (id: string) => {
    setDeleting(id);
    await fetch(withShop(`/api/suppliers/${id}`, shop), { method: "DELETE" });
    setDeleting(null);
    setSuccess("Supplier removed.");
    load();
  };

  const f = (key: keyof typeof EMPTY) => ({
    value: form[key], onChange: (v: string) => setForm(p => ({ ...p, [key]: v })), autoComplete: "off" as const,
  });

  return (
    <Page title="">
      <BlockStack gap="400">
        <PageHeader
          index="03"
          title="Suppliers"
          subtitle={suppliers.length > 0 ? `${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"} on file` : "Add suppliers to send purchase orders directly"}
          action={<Button variant="primary" onClick={openAdd}>Add supplier</Button>}
        />
        {success && <Banner tone="success" title={success} onDismiss={() => setSuccess(null)} />}
        {error && <Banner tone="critical" title={`Error: ${error}`} action={{ content: "Retry", onAction: load }} />}

        <Card>
          {loading ? (
            <Box padding="1600"><InlineStack align="center"><Spinner /></InlineStack></Box>
          ) : suppliers.length === 0 ? (
            <EmptyState
              heading="No suppliers yet"
              image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
              action={{ content: "Add your first supplier", onAction: openAdd }}
            >
              <p>Add suppliers with their email addresses so you can send purchase orders directly from Replenish.</p>
            </EmptyState>
          ) : (
            <div className="rp-ledger">
              {suppliers.map((s, i) => (
                <div className="rp-ledger__row" key={s.id} style={{ gridTemplateColumns: "auto auto 1fr auto" }}>
                  <span className="rp-ledger__index">{String(i + 1).padStart(2, "0")}</span>
                  <Avatar name={s.name} />
                  <BlockStack gap="050">
                    <Text variant="bodyMd" fontWeight="semibold" as="span">{s.name}</Text>
                    <Text variant="bodySm" tone="subdued" as="span">{s.email}</Text>
                    {s.default_lead_time_days && (
                      <Text variant="bodySm" tone="subdued" as="span">Lead time: {s.default_lead_time_days} days</Text>
                    )}
                  </BlockStack>
                  <InlineStack gap="200">
                    <Button size="slim" onClick={() => openEdit(s)}>Edit</Button>
                    <Button size="slim" tone="critical" loading={deleting === s.id} onClick={() => del(s.id)}>Delete</Button>
                  </InlineStack>
                </div>
              ))}
            </div>
          )}
        </Card>
      </BlockStack>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "edit" ? `Edit ${editing?.name}` : "Add New Supplier"}
        primaryAction={{ content: "Save", onAction: save, loading: saving }}
        secondaryActions={[{ content: "Cancel", onAction: () => setModal(null) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {formError && <Banner tone="critical" title={formError} onDismiss={() => setFormError(null)} />}
            <TextField label="Company name" {...f("name")} placeholder="e.g. Acme Widgets Co." />
            <TextField label="Email address" type="email" {...f("email")} placeholder="orders@supplier.com" />
            <TextField label="Lead time (days)" type="number" {...f("lead_time_days")} helpText="Average days from PO to delivery" placeholder="14" />
            <TextField label="Notes" {...f("notes")} multiline={3} placeholder="Any notes about this supplier..." />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
