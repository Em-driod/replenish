"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Page, Card, IndexTable, useIndexResourceState, Button, EmptyState,
  BlockStack, InlineStack, Text, Modal, TextField, Spinner, Banner,
  Badge, Box, Divider,
} from "@shopify/polaris";

interface Supplier {
  id: string; name: string; email: string;
  default_lead_time_days?: number | null; notes?: string | null;
}

const EMPTY = { name: "", email: "", notes: "", lead_time_days: "" };

export default function SuppliersPage() {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setSuppliers(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

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
    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
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
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setDeleting(null);
    setSuccess("Supplier removed.");
    load();
  };

  const f = (key: keyof typeof EMPTY) => ({
    value: form[key], onChange: (v: string) => setForm(p => ({ ...p, [key]: v })), autoComplete: "off" as const,
  });

  return (
    <Page title="Suppliers" primaryAction={{ content: "Add supplier", onAction: openAdd }}>
      <BlockStack gap="400">
        {success && <Banner tone="success" title={success} onDismiss={() => setSuccess(null)} />}
        {error && <Banner tone="critical" title={`Error: ${error}`} action={{ content: "Retry", onAction: load }} />}

        <Card>
          {loading ? (
            <Box padding="1600"><InlineStack align="center"><Spinner /></InlineStack></Box>
          ) : suppliers.length === 0 ? (
            <EmptyState
              heading="No suppliers yet"
              image=""
              action={{ content: "Add your first supplier", onAction: openAdd }}
            >
              <p>Add suppliers with their email addresses so you can send purchase orders directly from Replenish.</p>
            </EmptyState>
          ) : (
            <BlockStack gap="0">
              {suppliers.map((s, i) => (
                <Box key={s.id}>
                  {i > 0 && <Divider />}
                  <Box padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold" as="span">{s.name}</Text>
                        <Text variant="bodySm" tone="subdued" as="span">{s.email}</Text>
                        {s.default_lead_time_days && (
                          <Text variant="bodySm" tone="subdued" as="span">Lead time: {s.default_lead_time_days} days</Text>
                        )}
                        {s.notes && <Text variant="bodySm" tone="subdued" as="span">{s.notes}</Text>}
                      </BlockStack>
                      <InlineStack gap="200">
                        <Button size="slim" onClick={() => openEdit(s)}>Edit</Button>
                        <Button size="slim" tone="critical" loading={deleting === s.id} onClick={() => del(s.id)}>Delete</Button>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                </Box>
              ))}
            </BlockStack>
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
