import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; embedded?: string; host?: string; hmac?: string }>;
}) {
  const params = await searchParams;
  const shop = params?.shop;
  const embedded = params?.embedded;
  const host = params?.host;

  // Already embedded — send to real dashboard
  if (embedded === "1" && shop) {
    const query = host ? `?host=${host}&shop=${shop}` : `?shop=${shop}`;
    redirect(`/dashboard${query}`);
  }

  // Not installed yet — kick off OAuth (break out of iframe via JS)
  if (shop) {
    const authUrl = `/api/auth?shop=${encodeURIComponent(shop)}`;
    return (
      <html>
        <head>
          <script dangerouslySetInnerHTML={{ __html: `window.top.location.href = ${JSON.stringify(authUrl)};` }} />
        </head>
        <body style={{ fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", margin: 0 }}>
          <p style={{ color: "#6b7280" }}>Redirecting to install…</p>
        </body>
      </html>
    );
  }

  // Direct visit with no shop — marketing landing page
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 440, textAlign: "center", padding: "40px 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "#4f46e5", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Replenish</h1>
        <p style={{ color: "#6b7280", marginBottom: 32 }}>Inventory forecasting &amp; purchase orders for Shopify. Install from your Shopify admin.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[["Free", "$0", "100 SKUs"], ["Starter", "$15/mo", "500 SKUs"], ["Growth", "$29/mo", "Unlimited"]].map(([name, price, limit]) => (
            <div key={name} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "white" }}>
              <p style={{ fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>{name}</p>
              <p style={{ color: "#4f46e5", fontWeight: 700, margin: "0 0 4px" }}>{price}</p>
              <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>{limit}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 32, fontSize: 12, color: "#9ca3af" }}>
          <a href="/privacy" style={{ color: "#9ca3af" }}>Privacy Policy</a>
        </p>
      </div>
    </main>
  );
}
