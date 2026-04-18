// Permission API Types
export interface Permission {
  id: string;
  name: string;
  module_id?: string;
  module?: {
    id: string;
    name: string;
  };
}

export interface CreatePermissionRequest {
  name: string;
  module_id?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  module_id?: string;
}

export interface Module {
  id: string;
  name: string;
}
