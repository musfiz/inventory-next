/**
 * API Services Index
 * Central export point for all API services
 */

export { tenantService } from './tenantService';
export { userService } from './userService';
export { default as brandService } from './brandService';
export { default as unitService } from './unitService';
export { default as attributeService } from './attributeService';
export { default as permissionService } from './permissionService';

// Re-export types for convenience
export type {
  User,
  Tenant,
  Brand,
  Unit,
  Attribute,
  Permission,
  RegisterUserRequest,
  RegisterUserResponse,
  RegisterTenantRequest,
  RegisterTenantResponse,
  UserProfileResponse,
  UserListParams,
  UserListResponse,
  PermissionListParams,
  PermissionListResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  ApiResponse,
  ApiError,
} from '@/types/api.types';