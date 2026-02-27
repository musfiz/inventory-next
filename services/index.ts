/**
 * API Services Index
 * Central export point for all API services
 */

export { tenantService } from './tenantService';
export { userService } from './userService';
export { default as brandService } from './brandService';
export { default as unitService } from './unitService';
export { default as attributeService } from './attributeService';
export { default as tenantAttributeService } from './tenantAttributeService';
export { default as tenantAttributeValueService } from './tenantAttributeValueService';
export { default as permissionService } from './permissionService';
export { default as userPermissionService } from './userPermissionService';

// Re-export types for convenience
export type {
  User,
  Tenant,
  Brand,
  Unit,
  Attribute,
  TenantAttribute,
  TenantAttributeValue,
  RegisterUserRequest,
  RegisterUserResponse,
  RegisterTenantRequest,
  RegisterTenantResponse,
  UserProfileResponse,
  UserListParams,
  UserListResponse,
  ApiResponse,
  ApiError,
} from '@/types/api.types';