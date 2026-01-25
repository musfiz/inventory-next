# Cookie-Based Authentication Guide

## Overview

The application now uses **HTTP-only cookie-based authentication** instead of localStorage for enhanced security. Tokens are stored in HTTP-only cookies that cannot be accessed by JavaScript, protecting against XSS attacks.

## Architecture

```
Client (Browser)
    ↓ POST /api/auth/login
Next.js API Route (/app/api/auth/login/route.ts)
    ↓ Forwards request
Laravel Backend (localhost:8000/api/v1/login)
    ↓ Returns token
Next.js API Route
    ↓ Sets HTTP-only cookie + Returns user data
Client (Browser)
```

## How It Works

### 1. Authentication Flow

**Login:**
```typescript
// Client calls Next.js API route
const response = await authService.login('user@example.com', 'password');

// Next.js API route:
// 1. Forwards request to Laravel
// 2. Receives token from Laravel
// 3. Sets HTTP-only cookie with token
// 4. Returns user data (without token) to client
```

**Subsequent Requests:**
```typescript
// Client makes API request
const users = await userService.getUsers();

// Next.js proxy route:
// 1. Reads token from HTTP-only cookie
// 2. Adds Authorization header
// 3. Forwards to Laravel
// 4. Returns response to client
```

**Logout:**
```typescript
// Client calls logout
await authService.logout();

// Next.js API route:
// 1. Reads token from cookie
// 2. Calls Laravel logout endpoint
// 3. Clears cookie
// 4. Returns success
```

### 2. Security Benefits

✅ **Protection against XSS attacks** - JavaScript cannot access HTTP-only cookies
✅ **Automatic CSRF protection** - SameSite cookie attribute
✅ **Secure transmission** - Cookies are encrypted in production (HTTPS)
✅ **Controlled expiration** - Server-side token management
✅ **No token exposure** - Tokens never visible in client-side code

## API Routes

### Authentication Routes

#### POST /api/auth/login
Login and set authentication cookie.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "device_name": "inventory-ui"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "...", "email": "..." }
  }
}
```

**Cookie Set:** `auth_token` (HTTP-only, SameSite=Lax, 7 days)

#### POST /api/auth/logout
Logout and clear authentication cookie.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookie Cleared:** `auth_token`

#### POST /api/auth/register-tenant
Register new tenant and set authentication cookie.

**Request:**
```json
{
  "business_name": "My Business",
  "email": "admin@business.com",
  "password": "password123",
  "password_confirmation": "password123",
  "name": "Admin Name",
  "phone": "+1234567890",
  "business_type": "retail"
}
```

#### POST /api/auth/register
Register new user and set authentication cookie.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "tenant_id": "tenant-uuid",
  "role": "cashier"
}
```

### Proxy Routes

#### /api/proxy/[...path]
Proxies all API requests to Laravel backend with authentication.

**Supported Methods:** GET, POST, PUT, PATCH, DELETE

**Example:**
- Client calls: `GET /api/proxy/users`
- Proxies to: `GET http://localhost:8000/api/v1/users` (with auth token)

## Usage in Services

### Authentication Service

```typescript
import { authService } from '@/services';

// Login (sets cookie automatically)
const loginData = await authService.login('user@example.com', 'password');
console.log(loginData.user);

// Check if authenticated
const isAuth = authService.isAuthenticated();

// Get current user (uses cookie automatically)
const user = await authService.getCurrentUser();

// Logout (clears cookie automatically)
await authService.logout();
```

### Other Services

All other services automatically use the cookie for authentication:

```typescript
import { userService, tenantService } from '@/services';

// These calls automatically include auth cookie
const users = await userService.getUsers();
const tenants = await tenantService.getTenants();
```

## Client-Side Usage

### React Component Example

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
      // Login - cookie is set automatically
      const data = await authService.login(email, password);
      console.log('Logged in:', data.user);
      
      // Redirect to dashboard
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
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Protected Route Example

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import type { User } from '@/types/api';

export default function ProtectedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Cookie is sent automatically
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      // Not authenticated - redirect to login
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={() => authService.logout().then(() => router.push('/login'))}>
        Logout
      </button>
    </div>
  );
}
```

## Cookie Configuration

Cookies are configured with these settings:

```typescript
{
  name: 'auth_token',
  httpOnly: true,              // Cannot be accessed by JavaScript
  secure: true,                // HTTPS only (production)
  sameSite: 'lax',            // CSRF protection
  maxAge: 60 * 60 * 24 * 7,  // 7 days
  path: '/',                   // Available to all routes
}
```

## Environment Variables

**Required:**
```env
# Backend API URL (used by Next.js API routes)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Optional:**
```env
# Node environment (affects cookie security)
NODE_ENV=production
```

## Development vs Production

### Development
- Cookies work over HTTP
- `secure: false` (local development)
- Both frontend and backend on localhost

### Production
- Cookies require HTTPS
- `secure: true` (enforced)
- Proper domain configuration needed

## Middleware (Optional)

Create middleware to protect routes:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');

  // Redirect to login if no token
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if already logged in
  if (token && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
```

## Debugging

### Check Cookie in Browser

1. Open DevTools → Application → Cookies
2. Look for `auth_token` cookie
3. Verify `HttpOnly` and `Secure` flags

### Common Issues

**Issue:** Cookie not being set
- Check API route is returning the response correctly
- Verify `withCredentials: true` in axios config
- Ensure no CORS issues

**Issue:** Cookie not being sent
- Verify `withCredentials: true` in apiClient
- Check cookie domain and path settings
- Ensure cookie hasn't expired

**Issue:** 401 errors after login
- Check cookie is being set correctly
- Verify proxy route is reading cookie
- Check Laravel backend accepts Bearer token

## Migration from localStorage

If migrating from localStorage:

1. ✅ All services updated to use cookies
2. ✅ API routes created for auth operations
3. ✅ Proxy route handles authenticated requests
4. ❌ Remove any old localStorage token code
5. ❌ Update AuthContext if using one
6. ❌ Test all authentication flows

### Clean Up Old Storage

```typescript
// Run once to clean up old tokens
if (typeof window !== 'undefined') {
  localStorage.removeItem('auth_token');
}
```

## Best Practices

1. ✅ **Always use HTTPS in production**
2. ✅ **Set appropriate cookie expiration**
3. ✅ **Implement token refresh if needed**
4. ✅ **Handle cookie expiration gracefully**
5. ✅ **Log security events (login/logout)**
6. ✅ **Monitor for suspicious activity**
7. ✅ **Use middleware for route protection**
8. ✅ **Test authentication flows thoroughly**

## Testing

### Manual Testing

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  -c cookies.txt

# Use cookie in request
curl -X GET http://localhost:3000/api/proxy/users \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

## Summary

✨ **Cookie-based authentication is now implemented!**

- 🔐 Tokens stored securely in HTTP-only cookies
- 🛡️ Protected against XSS attacks
- 🚀 Automatic token handling in all requests
- ✅ No client-side token management needed
- 📝 Comprehensive API routes for auth operations

For any issues, check the browser console and Network tab for cookie headers.
