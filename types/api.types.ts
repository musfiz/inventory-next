/**
 * API Type Definitions
 * Defines request and response types for all API endpoints
 */

export interface Tenant {
  id: string;
  business_name: string;
  slug: string;
  business_type?: string;
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
  business_type?: string;
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
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  business_type?:
  | 'pharmacy'
  | 'electric'
  | 'electronics'
  | 'fashion'
  | 'furniture'
  | 'bookshop'
  | 'departmental'
  | 'computer'
  | 'clothing'
  | 'footwear'
  | 'cosmetics'
  | 'stationery'
  | 'grocery'
  | 'hardware'
  | 'restaurant'
  | 'cafe'
  | 'supermarket'
  | 'other';
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
  business_type: string;
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
  business_type?:
  | 'pharmacy'
  | 'electric'
  | 'electronics'
  | 'fashion'
  | 'furniture'
  | 'bookshop'
  | 'departmental'
  | 'computer'
  | 'clothing'
  | 'footwear'
  | 'cosmetics'
  | 'stationery'
  | 'grocery'
  | 'hardware'
  | 'restaurant'
  | 'cafe'
  | 'supermarket'
  | 'other';
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
  business_type?:
  | 'pharmacy'
  | 'electric'
  | 'electronics'
  | 'fashion'
  | 'furniture'
  | 'bookshop'
  | 'departmental'
  | 'computer'
  | 'clothing'
  | 'footwear'
  | 'cosmetics'
  | 'stationery'
  | 'grocery'
  | 'hardware'
  | 'restaurant'
  | 'cafe'
  | 'supermarket'
  | 'other';
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

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
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
