export const metadata = {
  title: "Privacy Policy — Replenish",
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "sans-serif", padding: "48px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "white", borderRadius: 16, padding: "40px 44px", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e6bff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>R</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>Replenish</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", marginTop: 24, marginBottom: 4 }}>Privacy Policy</h1>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 32 }}>Last updated July 14, 2026</p>

        <Section title="What Replenish is">
          Replenish is a Shopify app that syncs your store&apos;s product and order data to forecast
          inventory demand, flag low stock, and help you create and send purchase orders to your
          suppliers. This policy explains exactly what data we collect through the app, why, and
          how it&apos;s handled.
        </Section>

        <Section title="Data we collect">
          <ul style={ulStyle}>
            <li><strong>Store identity:</strong> your shop&apos;s myshopify.com domain and the OAuth access token Shopify issues when you install the app, used to make API calls on your behalf.</li>
            <li><strong>Product &amp; inventory data:</strong> product titles, SKUs, variant IDs, current stock levels, cost, and product images — synced from your Shopify admin so we can track and forecast stock.</li>
            <li><strong>Order line items (aggregated only):</strong> quantities and product/variant IDs from your orders, used to calculate sales velocity and days-of-stock-remaining. We do not store customer names, emails, addresses, or any other order content.</li>
            <li><strong>Supplier &amp; purchase order records:</strong> supplier names, email addresses, and lead times you enter yourself, plus the purchase orders and line items you create in the app.</li>
            <li><strong>Inventory history:</strong> periodic stock-level snapshots, used only to make demand forecasting more accurate around stockout periods.</li>
          </ul>
        </Section>

        <Section title="What we don't collect">
          <p style={pStyle}>
            Replenish never collects or stores your customers&apos; names, emails, addresses, phone
            numbers, or payment information. We don&apos;t access your storefront&apos;s visitor or
            checkout data. Subscription billing is handled entirely by Shopify&apos;s own Billing
            API — we never see or store payment card details.
          </p>
        </Section>

        <Section title="How your data is used">
          <p style={pStyle}>
            Data is used solely to operate the app for your store: syncing inventory, computing
            reorder suggestions and sales velocity, generating purchase orders, and — if you opt
            in — sending you a daily low-stock summary email. We do not sell, rent, or share your
            data with third parties for advertising or marketing purposes.
          </p>
        </Section>

        <Section title="Third-party services we use">
          <ul style={ulStyle}>
            <li><strong>Shopify</strong> — the platform and Admin API this app runs on.</li>
            <li><strong>Supabase</strong> — our database host, where the data listed above is stored.</li>
            <li><strong>Resend</strong> — our email provider, used only to deliver purchase order emails and low-stock digest emails you request.</li>
          </ul>
        </Section>

        <Section title="Data retention & deletion">
          <p style={pStyle}>
            Your data is retained for as long as the app is installed. When you uninstall
            Replenish, Shopify notifies us automatically, and all of your store&apos;s data —
            products, suppliers, purchase orders, and history — is permanently deleted from our
            database within 48 hours, per Shopify&apos;s standard app uninstall process.
          </p>
        </Section>

        <Section title="Your rights">
          <p style={pStyle}>
            You can request a copy of your data or ask us to delete it at any time by contacting
            us below. If you have questions about how a specific piece of data is used, we&apos;re
            happy to explain.
          </p>
        </Section>

        <Section title="Contact">
          <p style={pStyle}>
            Questions about this policy or your data? Email{" "}
            <a href="mailto:sheenleen2@gmail.com" style={{ color: "#1e6bff" }}>sheenleen2@gmail.com</a>.
          </p>
        </Section>
      </div>
    </main>
  );
}

const pStyle: React.CSSProperties = { color: "#374151", fontSize: 14.5, lineHeight: 1.65, margin: 0 };
const ulStyle: React.CSSProperties = { color: "#374151", fontSize: 14.5, lineHeight: 1.7, margin: 0, paddingLeft: 20 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}
