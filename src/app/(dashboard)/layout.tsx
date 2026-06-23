import ShopifyAppProvider from "@/components/layout/AppProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ShopifyAppProvider>{children}</ShopifyAppProvider>;
}
