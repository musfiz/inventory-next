/**
 * API Type Definitions
 * Defines request and response types for all API endpoints
 */

// Business Type - can be string (name) or object with id and name
export type BusinessType = {
  id: number;
  name: string
};

export interface TenantSettings {
  default_printer_type?: 'a4' | 'thermal';
  thermal_paper_size?: '80mm' | '53mm' | '58mm';
  default_printer_enabled?: boolean;
  pos_type?: '80mm' | '53mm';
  pos_receipt_header?: string;
  pos_receipt_footer?: string;
  pos_logo_position?: 'top' | 'bottom';
  pos_show_tax_breakdown?: boolean;
  store_notification_email?: string | null;
  business_short_name?: string;
  store_date_format?: string;
  store_time_format?: string;
  store_currency_position?: 'before' | 'after';
  store_tax_included?: boolean;
  logo_url?: string | null;
  barcode_print_type?: 'a4' | 'thermal';
  barcode_columns?: number;
  barcode_label_width?: string;
  barcode_label_height?: string;
  barcode_paper_size?: '80mm' | '50mm';
}

export interface Tenant {
  id: string;
  business_name: string;
  slug: string;
  business_type?: BusinessType;
  business_type_id?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  trade_license?: string;
  tin_number?: string;
  bin_number?: string;
  vat_number?: string;
  currency?: string;
  timezone?: string;
  theme_color?: string;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_ends_at?: string;
  max_users?: number;
  max_products?: number;
  max_warehouses?: number;
  is_active?: boolean;
  storefront_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  trial_ends_at?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  email_verified_at?: string | null;
  role: string;
  user_type: 'super_admin' | 'tenant_admin' | 'tenant_user';
  tenant_id?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  tenant?: Tenant;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface Product {
  id: string;
  uuid?: string;
  tenant_id?: string;
  business_type?: BusinessType;
  business_type_id?: number;
  sku?: string;
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  isbn?: string;
  mpn?: string;
  manufacturer?: string;
  manufacturer_sku?: string;
  category_id?: string;
  brand_id?: string;
  unit_id?: string;
  type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
  status?: 'draft' | 'active' | 'inactive' | 'discontinued' | 'archived';
  tax_rate?: number;
  is_taxable?: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  track_inventory?: boolean;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  low_stock_threshold?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  is_on_sale?: boolean;
  available_from?: string;
  available_until?: string;
  display_order?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  custom_fields?: Record<string, any>;
  images?: ProductImage[];
  variations?: ProductVariation[];
  brand?: Brand;
  category?: Category;
  unit?: Unit;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  name?: string;
  cost_price: number;
  selling_price: number;
  dp?: number;
  mrp?: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  custom_fields?: Record<string, any>;
  product?: Product;
  variation_attributes?: ProductVariationAttribute[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariationAttribute {
  id: string;
  variation_id: string;
  attribute_id: string;
  attribute_value_id: string;
  display_order: number;
  attribute?: Attribute;
  attribute_value?: AttributeValue;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variation_id?: string;
  file_path: string;
  file_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  product?: {
    id: string;
    name: string;
  };
  variation?: {
    id: string;
    name?: string;
    sku?: string;
  };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  logo_url?: string;
  logo_path?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  business_type?: BusinessType;
  business_types?: BusinessType[];
  parent?: Category;
  children?: Category[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductRequest {
  // Required fields
  name: string;
  business_type: BusinessType;
  business_type_id?: number;
  category_id: string;
  brand_id: string;
  // pricing fields removed for product table (kept in product variations)

  // Optional fields
  description?: string;
  unit_id?: string;
  type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
  status?: 'draft' | 'active' | 'inactive' | 'discontinued' | 'archived';
  tax_rate?: number;
  is_taxable?: boolean;
  track_inventory?: boolean;
  allow_backorder?: boolean;
  low_stock_threshold?: number;
  reorder_point?: number;
  has_expiry?: boolean;
  has_batch?: boolean;
  has_serial?: boolean;
  is_featured?: boolean;
  display_order?: number;
  custom_fields?: Record<string, any>;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_id?: string;
  business_types?: BusinessType[];
  business_type_ids: number[];
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

export interface UpdateProductVariationRequest extends Partial<CreateProductVariationRequest> {
  id: string;
}

export interface CreateProductImageRequest {
  product_id: string;
  variation_id?: string;
  image: File;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface ProductListResponse {
  data: Product[];
  meta: PaginationMeta;
}

export interface ProductVariationListResponse {
  data: ProductVariation[];
  meta: PaginationMeta;
}

export interface ProductImageListResponse {
  data: ProductImage[];
  meta: PaginationMeta;
}

export interface Brand {
  id: string;
  name: string;
  business_type?: BusinessType;
  business_type_id?: number;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  name: string;
  short_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Attribute {
  id: string;
  name: string;
  type: 'select' | 'text' | 'number' | 'color';
  description?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  values?: AttributeValue[];
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_value?: string;
  hex_code?: string;
  sort_order?: number;
  attribute?: Attribute;
  created_at?: string;
}

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
  device_name?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  token_type: string;
  switched_from?: User;
  is_switched_user?: boolean;
  is_switched_back?: boolean;
}

export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  tenant_id: string;
  role: 'admin' | 'manager' | 'cashier' | 'warehouse' | 'accountant' | 'sales';
}

export interface RegisterUserResponse {
  user: User;
  token: string;
  token_type: string;
}

export interface UserProfileResponse {
  user: User;
  permissions: string[];
  tenant: Tenant;
}

// Tenant API Types
export interface RegisterTenantRequest {
  business_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  name: string;
  phone: string;
  business_type: string;
  business_type_id?: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface RegisterTenantResponse {
  user: User;
  tenant: Tenant;
  token: string;
  token_type: string;
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  per_page: number;
}

export interface TenantDetailsResponse {
  tenant: Tenant;
  users_count: number;
  active_users: number;
}

// User Management API Types
export interface UserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  user_type: 'tenant_admin' | 'tenant_user';
  tenant_id?: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  user_type?: 'tenant_admin' | 'tenant_user';
  is_active?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  password_confirmation?: string;
  avatar?: File | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface StockMovement {
  id: number;
  uuid: string;
  tenant_id: number;
  product_id: number;
  variation_id?: number;
  warehouse_id: number;
  batch_id?: number;
  movement_type: 'purchase' | 'sales' | 'return' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'production' | 'consumption' | 'damage' | 'expiry';
  reference_type?: string;
  reference_id?: number;
  reference_number?: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  unit_cost?: number;
  total_cost?: number;
  reason?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  product?: { id: number; name: string; sku?: string };
  variation?: { id: number; name?: string; sku?: string };
  warehouse?: { id: number; name: string; code?: string };
  creator?: { id: number; name: string };
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Pagination
export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Product Variation Requests
export interface CreateProductVariationRequest {
  product_id: string;
  sku: string;
  name?: string;
  cost_price: number;
  selling_price: number;
  dp?: number;
  mrp?: number;
  is_active?: boolean;
  is_default?: boolean;
  display_order?: number;
  custom_fields?: Record<string, any>;
  attributes?: VariationAttributeInput[];
}

export interface UpdateProductVariationRequest extends Partial<CreateProductVariationRequest> {
  id: string;
}

export interface VariationAttributeInput {
  attribute_id: string;
  attribute_value_id: string;
  display_order?: number;
}

export interface ProductVariationListResponse {
  data: ProductVariation[];
  meta: PaginationMeta;
}

// ─── Bulk Variation Add Types ─────────────────────────────────────────────────

export interface SimpleProduct {
  id: string;
  name: string;
  category_id?: string;
  brand_id?: string;
  category?: Category;
  brand?: Brand;
}

export interface SimpleProductListResponse {
  data: SimpleProduct[];
  meta?: PaginationMeta;
}

export interface BulkVariationItem {
  product_id: string;
  sku: string;
  name?: string;
  cost_price: number;
  selling_price: number;
}

export interface BulkVariationRequest {
  variations: BulkVariationItem[];
}

export interface BulkVariationResponseData {
  created: number;
  failed: number;
  errors: BulkVariationError[];
}

export interface BulkVariationError {
  row: number;
  product_id: string;
  sku?: string;
  message: string;
}

// ─── Payment Types ────────────────────────────────────────────────────────────

// (Payment / PaymentMethod / PaymentStatus / PaymentReferenceType are
// defined at the bottom of this file in the unified-payments block.)

/** Fields sent to POST /api/v1/pos/orders for payment */
export interface PosPaymentFields {
  payment_method: PaymentMethod;
  payment_date?: string;
  payment_notes?: string;
  // Cash
  tendered_amount?: number;
  is_partial?: boolean;
  payment_due_date?: string;
  // Card
  card_last_four?: string;
  processing_fee?: number;
  transaction_reference?: string;
  // Mobile money (bKash / Nagad / Rocket)
  mobile_number?: string;
  mobile_transaction_id?: string;
  // Bank transfer
  bank_name?: string;
  bank_account?: string;
  // Check
  check_number?: string;
  check_date?: string;
}

/** Payload for saving a hold order */
export interface PosHoldPayload {
  session_id: string | number;
  register_id: string | number;
  tenant_id?: string | number;
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
  order_data: {
    cart: unknown[];
    customer: { id?: string; name: string; phone?: string; email?: string };
    discount: number;
    discountType: 'percent' | 'amount';
    note: string;
  };
}

/** A held order returned from GET /api/v1/pos/hold-orders */
export interface PosHeldOrder {
  id: number;
  uuid: string;
  hold_number: string;
  customer_name?: string;
  customer_phone?: string;
  order_data: PosHoldPayload['order_data'];
  expires_at?: string;
  created_at?: string;
}

/** A POS order returned from GET /api/v1/pos/orders */
export interface PosOrderListItem {
  id: number;
  uuid: string;
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  order_date: string;
  payment_method: PaymentMethod;
  payment_status: 'paid' | 'partial' | 'pending' | 'failed';
  // Order lifecycle: 'draft' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded' | 'partially_refunded'
  status?: string;
  grand_total: number;
  paid_amount?: number;
  returned_amount?: number;
  due_amount?: number;
  is_paid: boolean;
  session?: { id: number; session_number: string };
  register?: { id: number; name: string };
  created_at: string;
}

export interface PosOrderDetailItem {
  id: number;
  product_id: number;
  variation_id?: number;
  item_name: string;
  quantity: number;
  returned_quantity?: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  line_total: number;
  product?: { id: number; name: string; code?: string };
  variation?: { id: number; name?: string; sku?: string };
}

export interface PosOrderDetail {
  id: number;
  uuid: string;
  invoice_number: string;
  tenant_id?: number;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  order_date: string;
  status: string;
  type?: string;
  sub_total: number;
  discount_type?: string;
  discount_value?: number;
  discount_amount: number;
  tax_amount: number;
  rounding_adjustment?: number;
  grand_total: number;
  paid_amount: number;
  returned_amount?: number;
  due_amount: number;
  change_amount?: number;
  tendered_amount?: number;
  payment_status: 'paid' | 'partial' | 'pending' | 'failed';
  payment_method: PaymentMethod;
  is_paid: boolean;
  payment_due_date?: string;
  notes?: string;
  paid_at?: string;
  created_at: string;
  session?: { id: number; session_number: string };
  register?: { id: number; name: string };
  customer?: { id: number; name: string; phone?: string; email?: string };
  tenant?: { id: number; business_name: string };
  items: PosOrderDetailItem[];
  payments: {
    id: number;
    receipt_number: string;
    payment_method: string;
    amount: number;
    status: string;
    payment_date?: string;
    notes?: string;
  }[];
}

// ─── Sales Return Types ───────────────────────────────────────────────────────

export type SalesReturnStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export type SalesReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'not_as_described'
  | 'damaged_in_transit'
  | 'customer_changed_mind'
  | 'overcharged'
  | 'other';

export type SalesReturnRefundMethod =
  | 'cash'
  | 'card'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'bank_transfer'
  | 'store_credit'
  | 'exchange'
  // F-9 FIX: backend settleReturnPayment accepts `check` and
  // `other` (used when the cashier pays the customer by cheque
  // or an unlisted method).
  | 'check'
  | 'other';

export type SalesReturnItemCondition = 'good' | 'damaged' | 'defective';

export interface SalesReturnItem {
  id: number;
  uuid?: string;
  tenant_id?: number;
  sales_return_id: number;
  sales_order_item_id: number;
  product_id?: number;
  variation_id?: number;
  quantity_returned: number;
  unit_price: number;
  condition: SalesReturnItemCondition;
  batch_id?: number | null;
  reason?: string | null;
  line_total?: number;
  product?: { id: number; name: string; code?: string };
  variation?: { id: number; name?: string; sku?: string };
  sales_order_item?: { id: number; quantity: number; quantity_returned?: number };
}

export interface SalesReturnSettlementPayment {
  id: number;
  tenant_id?: number;
  sales_return_id: number;
  sales_order_id: number;
  action: 'refund' | 'collect';
  amount: number;
  payment_method: string;
  notes?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  creator?: { id: number; name: string } | null;
}

export interface SalesReturn {
  id: number;
  uuid?: string;
  tenant_id?: number | string;
  return_number: string;
  return_date?: string;
  sales_order_id: number | string;
  customer_id?: number | string;
  warehouse_id?: number | string;
  reason: SalesReturnReason;
  notes?: string | null;
  total_amount: number;
  refund_amount: number;
  refund_method: SalesReturnRefundMethod;
  status: SalesReturnStatus;
  approved_by?: number | string | null;
  created_by?: number | string | null;
  created_at?: string;
  updated_at?: string;
  items?: SalesReturnItem[];
  sales_order?: {
    id: number;
    invoice_number: string;
    order_number?: string;
    grand_total?: number;
    paid_amount?: number;
    returned_amount?: number;
    payment_status?: string;
  };
  customer?: { id: number; name: string; phone?: string; email?: string };
  approver?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  settlement_payments?: SalesReturnSettlementPayment[];
}

/** Item row returned from GET /api/v1/pos/orders/{id}/items */
export interface PosOrderItemForRefund {
  id: number;
  product_id: number;
  variation_id: number;
  item_name: string;
  item_code?: string;
  barcode?: string;
  unit_type?: string;
  quantity: number;
  returned_quantity: number;
  max_returnable: number;
  unit_price: number;
  product?: { id: number; name: string; code?: string };
  variation?: { id: number; name?: string; sku?: string };
  /**
   * P0-6: server-side snapshot of refunds-in-flight (status pending or
   * approved) on this order line. Present when the caller passes
   * `?include=current_refunds`. Used to recompute `max_returnable`
   * authoritatively so two concurrent cashiers can't both pass the
   * local check and double-refund the same line.
   */
  current_pending_refunds?: number;
}

/** Individual item row stored in a POS refund */
export interface PosRefundItem {
  id: number;
  uuid?: string;
  pos_refund_id: number;
  pos_order_item_id?: number | null;
  product_id?: number | null;
  variation_id?: number | null;
  quantity_returned: number;
  unit_price: number;
  batch_id?: number | null;
  product?: { id: number; name: string } | null;
  variation?: { id: number; name?: string; sku?: string } | null;
}

// ── Payments (unified `payments` table) ────────────────────────────────────

export type PaymentMethod =
  | 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket'
  | 'bank_transfer' | 'check' | 'credit' | 'other';

export type PaymentStatus =
  | 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export type PaymentReferenceType =
  | 'purchase' | 'sales' | 'pos' | 'expense' | 'refund' | 'other';

export interface Payment {
  id: number;
  uuid?: string;
  tenant_id?: number | string;
  receipt_number: string;
  payment_date?: string;
  payment_method: PaymentMethod;

  reference_type?: PaymentReferenceType | null;
  sales_order_id?: number | null;
  pos_order_id?: number | null;
  session_id?: number | null;

  amount: number;
  tax_amount?: number;
  tendered_amount?: number;
  change_amount?: number;
  processing_fee?: number;
  total_amount: number;

  transaction_id?: string | null;
  transaction_reference?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  check_number?: string | null;
  check_date?: string | null;
  card_last_four?: string | null;
  mobile_number?: string | null;
  mobile_transaction_id?: string | null;

  status: PaymentStatus;
  notes?: string | null;
  created_by?: number | string | null;
  approved_by?: number | string | null;
  created_at?: string;
  updated_at?: string;

  tenant?: { id: number; business_name: string; logo_url?: string; address?: string; city?: string; country?: string; phone?: string; email?: string; tin_number?: string; bin_number?: string; vat_number?: string } | null;
  salesOrder?: {
    id: number;
    invoice_number: string;
    grand_total?: number;
    paid_amount?: number;
    returned_amount?: number;
    payment_status?: string;
    customer_id?: number;
    sub_total?: number;
    discount_amount?: number;
    discount_type?: string;
    discount_value?: number;
    tax_amount?: number;
    items?: ReceiptOrderItem[];
  } | null;
  posOrder?: {
    id: number;
    uuid?: string;
    order_number?: string;
    invoice_number?: string;
    grand_total?: number;
    paid_amount?: number;
    returned_amount?: number;
    payment_status?: string;
    customer_name?: string;
    sub_total?: number;
    discount_amount?: number;
    discount_type?: string;
    discount_value?: number;
    tax_amount?: number;
    items?: ReceiptOrderItem[];
  } | null;
  creator?: { id: number; name: string } | null;
  approver?: { id: number; name: string } | null;
}

/**
 * Line item shape returned by the receipt endpoint. Backed by the
 * backend's eager-loaded `salesOrder.items` / `posOrder.items` relations.
 * Both orders populate the same fields; the receipt mapper turns this
 * into a `PrintOrderItem`.
 */
export interface ReceiptOrderItem {
  id: number;
  product_id?: number;
  variation_id?: number;
  item_name?: string;
  quantity: number;
  unit_price: number;
  /** POS orders use `discount_amount`; sales orders use `discount_amount` too. */
  discount_amount?: number;
  /** Some legacy rows may carry `discount` instead. */
  discount?: number;
  tax_rate?: number;
  line_total: number;
  product?: { id: number; name?: string; code?: string; sku?: string };
  variation?: { id: number; name?: string; sku?: string };
}

export interface HeroSliderImage {
  id: string;
  tenant_id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_path: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHeroSliderRequest {
  title?: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  alt_text?: string;
  sort_order?: number;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
}

export interface BrandingResponse {
  header_logo_url: string | null;
  footer_logo_url: string | null;
  favicon_url: string | null;
  favicon_16_url: string | null;
}

export interface NavLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  open_in_new_tab: boolean;
  is_active: boolean;
}

export interface HeaderMenuConfig {
  utility_bar_enabled: boolean;
  utility_bar_text_free_shipping: string;
  utility_bar_text_discount: string;
  utility_bar_phone: string;
  utility_bar_bg_color: string;
  utility_bar_text_color: string;

  nav_links: NavLink[];

  show_search_bar: boolean;
  show_wishlist_icon: boolean;
  show_account_icon: boolean;
  show_cart_icon: boolean;
  sticky_header: boolean;
}

export interface FooterLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  open_in_new_tab: boolean;
  is_active: boolean;
}

export interface ProductFlagsItem {
  id: number | null;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_status: string;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  image: { url: string; thumb_url: string } | null;
  is_visible_on_storefront: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_on_sale: boolean;
  hide_when_out_of_stock: boolean;
  available_from: string | null;
  available_until: string | null;
}

export interface CategoryContent {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  banner_image: string | null;
  updated_at: string;
}

export interface ProductMediaItem {
  id: number;
  product_id: number;
  variation_id: number | null;
  file_path_thumb: string;
  file_url_thumb: string;
  file_path_medium: string;
  file_url_medium: string;
  file_path_magnify: string;
  file_url_magnify: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FooterColumn {
  id: string;
  title: string;
  sort_order: number;
  links: FooterLink[];
}

export interface ValuePropItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  is_active: boolean;
}

export interface PaymentBadge {
  id: string;
  name: string;
  is_active: boolean;
}

export interface FooterConfig {
  value_props_enabled: boolean;
  value_props: ValuePropItem[];

  newsletter_enabled: boolean;
  newsletter_title: string;
  newsletter_subtitle: string;

  columns: FooterColumn[];

  contact_address: string;
  contact_phone: string;
  contact_email: string;
  about_text: string;

  social_links: SocialLink[];

  copyright_text: string;
  show_payment_badges: boolean;
  payment_badges: PaymentBadge[];
}

// --- Static Page CMS ---

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaticPageRequest {
  slug: string;
  title: string;
  body?: string;
  meta_title?: string;
  meta_description?: string;
  is_published?: boolean;
  sort_order?: number;
}
