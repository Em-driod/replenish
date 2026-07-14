"use client";

import { Suspense, useEffect, useState } from "react";
import { Page, Card, Button, BlockStack, InlineStack, Text, Banner, Spinner, Box } from "@shopify/polaris";
import PageHeader from "@/components/ui/PageHeader";
import StampBadge from "@/components/ui/StampBadge";
import { authFetch } from "@/lib/authFetch";
import { PLANS, PlanId } from "@/lib/billing";

interface ShopInfo {
  plan_id: PlanId;
  tracked_count: number;
}

const PLAN_ORDER: PlanId[] = ["free", "starter", "growth"];

export default function SettingsPage() {
  return (
    <Suspense fallback={<Page title="Settings"><Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Page>}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const [info, setInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/billing/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setInfo(data); setLoading(false); });
  }, []);

  const upgrade = async (plan: Exclude<PlanId, "free">) => {
    setUpgrading(plan);
    setError(null);
    const res = await authFetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setUpgrading(null);
    if (!res.ok) { setError(data.error ?? "Failed to start upgrade."); return; }
    // Billing confirmation must happen in a top-level (non-iframe) page
    window.open(data.confirmationUrl, "_top");
  };

  if (loading) {
    return (
      <Page title="Settings">
        <Box padding="1600"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box>
      </Page>
    );
  }

  const currentPlan = info?.plan_id ?? "free";

  return (
    <Page title="">
      <BlockStack gap="500">
        <PageHeader index="05" title="Billing" subtitle="Manage your Replenish plan" />
        {error && <Banner tone="critical" title={error} onDismiss={() => setError(null)} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = planId === currentPlan;
            return (
              <Card key={planId}>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd" as="h2">{plan.name}</Text>
                    {isCurrent && <StampBadge tone="good">Current Plan</StampBadge>}
                  </InlineStack>
                  <Text variant="heading2xl" as="p">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                    {plan.price > 0 && <Text as="span" variant="bodySm" tone="subdued">/mo</Text>}
                  </Text>
                  <Text tone="subdued" as="p">
                    {plan.skuLimit == null ? "Unlimited tracked SKUs" : `Up to ${plan.skuLimit} tracked SKUs`}
                  </Text>
                  {planId !== "free" && !isCurrent && (
                    <Button
                      variant="primary"
                      fullWidth
                      loading={upgrading === planId}
                      onClick={() => upgrade(planId as Exclude<PlanId, "free">)}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            );
          })}
        </div>

        {info && (
          <Text tone="subdued" as="p">
            Currently tracking {info.tracked_count} product{info.tracked_count === 1 ? "" : "s"}
            {PLANS[currentPlan].skuLimit != null ? ` of ${PLANS[currentPlan].skuLimit} allowed on your plan.` : "."}
          </Text>
        )}
      </BlockStack>
    </Page>
  );
}
