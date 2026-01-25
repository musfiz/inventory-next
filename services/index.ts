/**
 * API Services Index
 * Central export point for all API services
 */

export { authService } from './authService';
export { tenantService } from './tenantService';
export { userService } from './userService';

// Re-export types for convenience
export type {
  User,
  Tenant,
  LoginRequest,
  LoginResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  RegisterTenantRequest,
  RegisterTenantResponse,
  UserProfileResponse,
  UserListParams,
  UserListResponse,
  ApiResponse,
  ApiError,
} from '@/types/api';

// Re-export API client utilities
export {
  apiClient,
  getCookie,
  deleteCookie,
  isAuthenticated,
} from '@/lib/apiClient';
