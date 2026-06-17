export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PlanName = "free" | "starter" | "growth";
export type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";
export type EmailStatus = "sent" | "failed" | "bounced";

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          shopify_domain: string;
          access_token: string;
          plan_id: string | null;
          installed_at: string;
          uninstalled_at: string | null;
          settings: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shops"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
      };
      suppliers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          email: string | null;
          default_lead_time_days: number;
          default_currency: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          shopify_product_id: string;
          shopify_variant_id: string;
          title: string;
          sku: string | null;
          current_inventory: number;
          cost_per_unit: number | null;
          supplier_id: string | null;
          reorder_point: number | null;
          reorder_qty: number | null;
          is_tracked: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      sales_velocity: {
        Row: {
          id: string;
          product_id: string;
          period_days: number;
          units_sold: number;
          avg_daily_sales: number;
          days_of_stock_remaining: number | null;
          computed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sales_velocity"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["sales_velocity"]["Insert"]>;
      };
      purchase_orders: {
        Row: {
          id: string;
          shop_id: string;
          supplier_id: string;
          po_number: string;
          status: POStatus;
          expected_delivery_date: string | null;
          notes: string | null;
          created_at: string;
          sent_at: string | null;
          received_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["purchase_orders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Insert"]>;
      };
      po_line_items: {
        Row: {
          id: string;
          po_id: string;
          product_id: string;
          qty_ordered: number;
          qty_received: number;
          unit_cost: number | null;
          notes: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["po_line_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["po_line_items"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      po_status: POStatus;
      plan_name: PlanName;
    };
  };
}
