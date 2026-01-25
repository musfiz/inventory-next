// Re-export all API types
export * from './api';

// Legacy interface kept for backward compatibility
// Use types from api.ts for new code
export interface Tenant {
  id: number;
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
  id: number;
  email: string;
  name: string;
  role: string;
  user_type: string;
  tenant_id?: number;
  phone?: string;
  is_active: boolean;
  tenant?: Tenant;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}
