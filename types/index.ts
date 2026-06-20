// Re-export all API types
export * from './api.types';
export * from './permission.types';
import type { BusinessType } from './api.types';

// Legacy interface kept for backward compatibility
// Use types from api.ts for new code
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
  user_type: 'super_admin' | 'tenant_admin' | 'tenant_user';
  tenant_id?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  permissions?: string[];
  tenant?: Tenant;
  business_type?: string;
  business_type_id?: number;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}
