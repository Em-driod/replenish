export const PLANS = {
  free: { name: "Free", price: 0, skuLimit: 100 },
  starter: { name: "Starter", price: 15, skuLimit: 500 },
  growth: { name: "Growth", price: 29, skuLimit: null as number | null },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "free" || value === "starter" || value === "growth";
}

async function shopifyGraphql<T>(shop: string, accessToken: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

interface AppSubscriptionCreateResponse {
  appSubscriptionCreate: {
    userErrors: { field: string[]; message: string }[];
    confirmationUrl: string | null;
    appSubscription: { id: string } | null;
  };
}

/**
 * Creates a recurring Shopify app charge and returns the URL the merchant
 * must approve it at. Dev/test stores are charged in test mode (no real
 * money moves) unless NODE_ENV=production.
 */
export async function createSubscription(
  shop: string,
  accessToken: string,
  plan: Exclude<PlanId, "free">,
  returnUrl: string
) {
  const details = PLANS[plan];

  const data = await shopifyGraphql<AppSubscriptionCreateResponse>(
    shop,
    accessToken,
    `mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean!, $price: Decimal!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: $test
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $price, currencyCode: USD }
              interval: EVERY_30_DAYS
            }
          }
        }]
      ) {
        userErrors { field message }
        confirmationUrl
        appSubscription { id }
      }
    }`,
    {
      name: `Replenish ${details.name}`,
      returnUrl,
      test: process.env.NODE_ENV !== "production",
      price: details.price,
    }
  );

  const result = data.appSubscriptionCreate;
  if (result.userErrors.length > 0) {
    throw new Error(result.userErrors.map((e) => e.message).join(", "));
  }
  if (!result.confirmationUrl) {
    throw new Error("Shopify did not return a confirmation URL");
  }

  return { confirmationUrl: result.confirmationUrl };
}

interface ActiveSubscriptionsResponse {
  currentAppInstallation: {
    activeSubscriptions: { id: string; name: string; status: string }[];
  };
}

export async function getActiveSubscriptions(shop: string, accessToken: string) {
  const data = await shopifyGraphql<ActiveSubscriptionsResponse>(
    shop,
    accessToken,
    `query { currentAppInstallation { activeSubscriptions { id name status } } }`,
    {}
  );
  return data.currentAppInstallation.activeSubscriptions;
}

/** Maps a Shopify subscription name (e.g. "Replenish Growth") back to a plan id. */
export function planFromSubscriptionName(name: string): PlanId {
  if (name.includes("Growth")) return "growth";
  if (name.includes("Starter")) return "starter";
  return "free";
}
