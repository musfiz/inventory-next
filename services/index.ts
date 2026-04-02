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
export { default as userPermissionService } from './userPermissionService';
export { default as productService } from './productService';
export { default as productVariationService } from './productVariationService';
export { default as categoryService } from './categoryService';
export { default as barcodeService } from './barcodeService';
export { default as warehouseService } from './warehouseService';
export { default as commonService } from './commonService';
export { default as binService } from './binService';

// Re-export types for convenience
export type {
  User,
  Tenant,
  Brand,
  Unit,
  Category,
  Product,
  ProductVariation,
  ProductImage,
  Attribute,
  RegisterUserRequest,
  RegisterUserResponse,
  RegisterTenantRequest,
  RegisterTenantResponse,
  UserProfileResponse,
  UserListParams,
  UserListResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateProductVariationRequest,
  UpdateProductVariationRequest,
  CreateProductImageRequest,
  ProductListResponse,
  ProductVariationListResponse,
  ProductImageListResponse,
  ApiResponse,
  ApiError,
} from '@/types/api.types';