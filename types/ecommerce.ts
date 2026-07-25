export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  description: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string;
  body: string;
  is_approved: boolean;
  is_verified_purchase: boolean;
  helpful_count: number;
  images: string[];
  admin_response: string | null;
  created_at: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  rate: number;
  estimated_days: string;
  is_free: boolean;
  is_active: boolean;
  created_at: string;
}

export interface EcommerceSettings {
  storefront_active: boolean;
  store_name: string;
  store_tagline: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  currency_code: string;
  currency_symbol: string;
  free_shipping_threshold: number;
  default_delivery_days: number;
  tax_rate: number;
  meta_title: string;
  meta_description: string;
  show_similar_products: boolean;
  created_at: string;
  updated_at: string;
}

export interface EcommerceOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items_count: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string;
  shipping_method: string;
  shipping_address: string;
  billing_address?: string;
  tracking_number: string | null;
  courier: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EcommerceDashboardStats {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  total_products: number;
  pending_orders: number;
  pending_reviews: number;
  active_coupons: number;
  conversion_rate: number;
  recent_orders: EcommerceOrder[];
  revenue_overview: { label: string; value: number }[];
  order_status_counts: { status: string; count: number }[];
}

// ── Flash Sale Campaign Types ──────────────────────────────────────────────

export type CampaignStatus = 'scheduled' | 'active' | 'ended' | 'paused';

export interface FlashSaleCampaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_paused: boolean;
  banner_image_url?: string | null;
  banner_image_path?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Computed client-side from start_date/end_date/is_paused */
  computed_status?: CampaignStatus;
  /** Associated products (populated on detail fetch) */
  products?: FlashSaleCampaignProduct[];
}

export interface FlashSaleCampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_image?: string;
  discount_value?: number | null;
  created_at: string;
}

/** Lightweight product shape for the async search picker */
export interface ProductSearchResult {
  id: string;
  name: string;
  sku?: string;
  image_url?: string;
}

/** Category shape for the campaign category filter dropdown */
export interface CampaignCategory {
  id: string;
  name: string;
}

// ── Storefront Order Types ────────────────────────────────────────────────

export interface OrderStatusHistory {
  status: EcommerceOrder['status'];
  timestamp: string;
  note?: string;
  updated_by?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount?: number;
  total: number;
}

export interface OrderPayment {
  id: string;
  method: string;
  transaction_id?: string;
  amount: number;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  paid_at?: string;
}

export interface OrderTimeline {
  status: EcommerceOrder['status'];
  label: string;
  timestamp: string | null;
  is_completed: boolean;
  is_current: boolean;
  note?: string;
}

export interface OrderDetail extends EcommerceOrder {
  items: OrderItem[];
  payments: OrderPayment[];
  status_history: OrderStatusHistory[];
  timeline: OrderTimeline[];
  notes?: string;
  gift_message?: string;
  is_gift?: boolean;
  billing_address?: string;
  delivery_instructions?: string;
  estimated_delivery?: string;
}

export interface OrderKPIs {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  processing_orders: number;
  shipped_today: number;
  delivered_today: number;
  cancelled_orders: number;
  returned_orders: number;
  average_order_value: number;
  orders_by_status: { status: string; count: number; percentage: number }[];
  revenue_today: number;
  revenue_this_month: number;
  revenue_last_month: number;
}

export type BulkActionType = 'update_status' | 'print' | 'export_csv' | 'export_pdf';

export interface BulkActionResult {
  success: number;
  failed: number;
  errors?: { id: string; error: string }[];
}

export interface StatusTransition {
  from: EcommerceOrder['status'];
  to: EcommerceOrder['status'];
  label: string;
  requires_tracking?: boolean;
  requires_note?: boolean;
  requires_payment?: boolean;
}

export interface StatusConfig {
  status: EcommerceOrder['status'];
  label: string;
  icon: string;
  color: string;
  order: number;
  description: string;
  allowed_transitions: StatusTransition[];
  requires_tracking?: boolean;
  auto_notify?: boolean;
}
