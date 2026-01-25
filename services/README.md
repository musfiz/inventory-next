# API Client Services Documentation

This directory contains the client-side API service layer for communicating with the Laravel backend API.

## Overview

The API services are organized into modular, type-safe services that handle all backend communication through Next.js. Each service is responsible for a specific domain (authentication, users, tenants, etc.).

## Architecture

```
lib/
  └── apiClient.ts         # Axios instance with interceptors
services/
  ├── index.ts            # Central export point
  ├── authService.ts      # Authentication operations
  ├── tenantService.ts    # Tenant management
  └── userService.ts      # User management
types/
  ├── api.ts             # API request/response types
  └── index.ts           # Type exports
```

## Core Components

### API Client (`lib/apiClient.ts`)

The base Axios client with:
- **Request Interceptor**: Automatically adds auth token to all requests
- **Response Interceptor**: Handles errors, 401 redirects, and validation errors
- **Token Management**: Helper functions for managing auth tokens
- **Error Handling**: Standardized error messages and handling

```typescript
import { apiClient, setAuthToken, clearAuthToken, getAuthToken } from '@/lib/apiClient';
```

### Services

#### Authentication Service (`authService.ts`)

Handles all authentication operations:

```typescript
import { authService } from '@/services';

// Login
const loginData = await authService.login('user@example.com', 'password');

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();

// Get full profile
const profile = await authService.getProfile();

// Change password
await authService.changePassword('oldPass', 'newPass', 'newPass');

// Forgot password
await authService.forgotPassword('user@example.com');

// Reset password
await authService.resetPassword('token', 'email', 'newPass', 'newPass');

// Update profile
const updatedUser = await authService.updateProfile({
  name: 'New Name',
  phone: '+1234567890'
});

// Check authentication
const isAuth = authService.isAuthenticated();
```

#### Tenant Service (`tenantService.ts`)

Manages tenant operations:

```typescript
import { tenantService } from '@/services';

// Register new tenant
const tenantData = await tenantService.registerTenant({
  business_name: 'My Business',
  email: 'admin@business.com',
  password: 'password123',
  password_confirmation: 'password123',
  name: 'Admin Name',
  phone: '+1234567890',
  business_type: 'retail',
  address: '123 Main St',
  city: 'New York',
  country: 'USA'
});

// Get all tenants (Super Admin)
const tenants = await tenantService.getTenants(1, 10);

// Get tenant by ID
const tenant = await tenantService.getTenantById('tenant-uuid');

// Get current tenant
const currentTenant = await tenantService.getCurrentTenant();

// Update tenant
const updated = await tenantService.updateTenant('tenant-uuid', {
  business_name: 'Updated Name'
});

// Toggle tenant status
await tenantService.toggleTenantStatus('tenant-uuid', false);

// Delete tenant
await tenantService.deleteTenant('tenant-uuid');

// Get tenant statistics
const stats = await tenantService.getTenantStats('tenant-uuid');
```

#### User Service (`userService.ts`)

Manages user operations within a tenant:

```typescript
import { userService } from '@/services';

// Register new user
const userData = await userService.registerUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  password_confirmation: 'password123',
  phone: '+1234567890',
  tenant_id: 'tenant-uuid',
  role: 'cashier'
});

// Get users list
const users = await userService.getUsers({
  page: 1,
  per_page: 20,
  search: 'john',
  role: 'cashier',
  status: 'active'
});

// Get user by ID
const user = await userService.getUserById('user-uuid');

// Create user (Admin)
const newUser = await userService.createUser({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
  password_confirmation: 'password123',
  role: 'manager'
});

// Update user
const updated = await userService.updateUser('user-uuid', {
  name: 'Updated Name',
  role: 'admin'
});

// Toggle user status
await userService.toggleUserStatus('user-uuid', false);

// Delete user
await userService.deleteUser('user-uuid');

// Change password
await userService.changePassword({
  current_password: 'oldPass',
  password: 'newPass',
  password_confirmation: 'newPass'
});

// Get users by role
const managers = await userService.getUsersByRole('manager');

// Bulk update users
await userService.bulkUpdateUsers(['uuid1', 'uuid2'], {
  is_active: true
});

// Export users
const csvBlob = await userService.exportUsers({ status: 'active' });
```

## Usage in Components

### Example: Login Component

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await authService.login(email, password);
      console.log('Logged in:', data.user);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Example: User Management Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { userService } from '@/services';
import type { User } from '@/types/api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers({ page: 1, per_page: 20 });
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await userService.toggleUserStatus(userId, !currentStatus);
      loadUsers(); // Refresh list
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Users</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.is_active ? 'Active' : 'Inactive'}</td>
              <td>
                <button onClick={() => handleToggleStatus(user.id, user.is_active)}>
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Type Safety

All services are fully typed with TypeScript. Import types from `@/types/api`:

```typescript
import type {
  User,
  Tenant,
  LoginRequest,
  LoginResponse,
  RegisterTenantRequest,
  UserListParams,
  ApiResponse,
  ApiError,
} from '@/types/api';
```

## Error Handling

All services throw errors that can be caught with try-catch:

```typescript
try {
  await authService.login(email, password);
} catch (error: any) {
  // Error message is already formatted
  console.error(error.message);
  
  // For validation errors (422), multiple field errors are combined
  // Example: "The email field is required, The password must be at least 8 characters"
}
```

## Authentication Flow

1. **Login**: Call `authService.login()` - token is automatically stored
2. **API Requests**: Token is automatically added to all requests via interceptor
3. **401 Handling**: Automatically redirects to login and clears token
4. **Logout**: Call `authService.logout()` - token is automatically cleared

## Environment Variables

Set the API URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Best Practices

1. **Always use try-catch** when calling API services
2. **Use TypeScript types** imported from `@/types/api`
3. **Import from index**: `import { authService } from '@/services'`
4. **Check authentication**: Use `authService.isAuthenticated()` in components
5. **Handle errors gracefully**: Display user-friendly error messages
6. **Loading states**: Show loading indicators during API calls

## Extending Services

To add new endpoints:

1. Add request/response types in `types/api.ts`
2. Add method to appropriate service or create new service
3. Export from `services/index.ts`
4. Document in this README

Example:

```typescript
// types/api.ts
export interface ProductListResponse {
  products: Product[];
  total: number;
}

// services/productService.ts
class ProductService {
  async getProducts(): Promise<ProductListResponse> {
    const response = await apiClient.get<ApiResponse<ProductListResponse>>('/products');
    return response.data.data;
  }
}

export const productService = new ProductService();

// services/index.ts
export { productService } from './productService';
```

## Testing

Test services in isolation:

```typescript
import { authService } from '@/services';

// Mock API calls for testing
jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

test('login stores token', async () => {
  const mockResponse = {
    data: {
      data: {
        user: { id: '1', name: 'Test User' },
        token: 'test-token',
      },
    },
  };
  
  (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);
  
  await authService.login('test@example.com', 'password');
  expect(localStorage.getItem('auth_token')).toBe('test-token');
});
```

## API Endpoints Summary

### Public Endpoints
- `POST /tenant/register` - Register new tenant
- `POST /register` - Register new user
- `POST /login` - User login

### Protected Endpoints (require auth token)
- `POST /logout` - Logout
- `GET /user` - Get current user
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `GET /users` - List users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /tenants` - List tenants
- `GET /tenants/:id` - Get tenant details
- `PUT /tenants/:id` - Update tenant

For complete API documentation, see `POSTMAN_API_GUIDE.md` in the backend repository.
