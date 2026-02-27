/**
 * API Type Definitions
 * Defines request and response types for all API endpoints
 */

export interface Tenant {
  id: string;
  business_name: string;
  slug: string;
  email: string;
  business_type?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  subscription_plan?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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
  is_active: boolean;
  tenant?: Tenant;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  tenant_id?: string;
  tenant?: Tenant;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  name: string;
  short_name: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Attribute {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'date' | 'boolean' | 'color' | 'size';
  data_type: 'string' | 'integer' | 'decimal' | 'date' | 'boolean';
  measurement_unit?: string;
  is_global: boolean;
  is_system: boolean;
  description?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TenantAttribute {
  id: string;
  uuid: string;
  tenant_id: string;
  attribute_id?: string;
  name: string;
  slug: string;
  type: 'text' | 'select' | 'number' | 'date' | 'boolean' | 'color' | 'file';
  data_type?: 'string' | 'integer' | 'decimal' | 'date' | 'boolean';
  measurement_unit?: string;
  is_required: boolean;
  is_filterable: boolean;
  is_variation_attribute: boolean;
  is_visible: boolean;
  sort_order?: number;
  validation_rules?: any;
  attribute?: Attribute;
  values?: TenantAttributeValue[];
  created_at?: string;
  updated_at?: string;
}

export interface TenantAttributeValue {
  id: string;
  uuid: string;
  tenant_attribute_id: string;
  value: string;
  display_value?: string;
  hex_code?: string;
  sort_order?: number;
  tenant_attribute?: TenantAttribute; // Laravel returns snake_case in JSON
  created_at?: string;
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
  role: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
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
