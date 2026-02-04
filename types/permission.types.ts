// Permission API Types
export interface Permission {
  id: string;
  name: string;
  guard_name: string;
}

export interface CreatePermissionRequest {
  name: string;
  guard_name: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  guard_name?: string;
}