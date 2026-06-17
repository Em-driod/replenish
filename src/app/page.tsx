// Root route: if ?shop= is present, kick off OAuth. Otherwise show install landing.
export default function Home({
  searchParams,
}: {
  searchParams: { shop?: string };
}) {
  const shop = searchParams?.shop;

  if (shop) {
    // Can't use redirect() here safely with searchParams in server component
    // The /api/auth route handles the OAuth redirect
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center px-6 py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Replenish</h1>
        <p className="text-gray-500 mb-2 text-lg">
          Inventory forecasting &amp; purchase orders for Shopify.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          The simplest Stocky replacement — reorder alerts, demand forecasting,
          and one-click POs to your suppliers.
        </p>

        {shop ? (
          <a
            href={`/api/auth?shop=${shop}`}
            className="inline-block bg-indigo-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Install Replenish
          </a>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Plans</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { name: "Free", price: "$0", limit: "100 SKUs" },
                { name: "Starter", price: "$15/mo", limit: "500 SKUs" },
                { name: "Growth", price: "$29/mo", limit: "Unlimited" },
              ].map((plan) => (
                <div key={plan.name} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-indigo-600 font-bold">{plan.price}</p>
                  <p className="text-gray-400 text-xs mt-1">{plan.limit}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 pt-2">
              Install from the Shopify App Store to connect your store.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
