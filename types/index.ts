// Re-export all API types
export * from './api';

// Legacy interface kept for backward compatibility
// Use types from api.ts for new code
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
}

export interface User {
  id: string;
  email: string;
  name: string;
  user_type: string;
  tenant_id?: string;
  phone?: string;
  is_active: boolean;
  tenant?: Tenant;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}
