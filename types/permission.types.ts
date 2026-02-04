// Permission API Types
export interface Permission {
  id: string;
  name: string;
  guard_name?: string;
  display_name?: string;
  description?: string;
  module?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionListParams {
  page?: number;
  per_page?: number;
  search?: string;
  guard_name?: string;
  module?: string;
}

export interface PermissionListResponse {
  permissions: Permission[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreatePermissionRequest {
  name: string;
  guard_name?: string;
  display_name?: string;
  description?: string;
  module?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  guard_name?: string;
  display_name?: string;
  description?: string;
  module?: string;
}