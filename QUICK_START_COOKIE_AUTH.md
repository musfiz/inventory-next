# 🚀 Quick Start - Cookie-Based Authentication

##  Summary of Changes

We've successfully implemented **professional, industry-standard cookie-based authentication** between Next.js 16 and Laravel 12 using Sanctum's stateful authentication.

---

## ✅ What Was Changed

### **Backend (Laravel)**

1. **Environment Variables** (`.env`)
   - Set `SESSION_LIFETIME=43200` (30 days)
   - Added `SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost`
   - Added `FRONTEND_URL=http://localhost:3000`
   - Configured session domain and security settings

2. **Configuration Files**
   - `config/sanctum.php` - Updated stateful domains for Next.js
   - `config/session.php` - Extended session lifetime
   - `config/cors.php` - **NEW** - CORS configuration with credentials support
   - `bootstrap/app.php` - Added `EnsureFrontendRequestsAreStateful` middleware

3. **AuthController** (`app/Http/Controllers/Api/AuthController.php`)
   - **Changed from** token-based (`createToken()`) **to** session-based (`Auth::login()`)
   - Login now creates HTTP-only session cookie
   - Logout properly destroys session

4. **Routes** (`routes/api.php`)
   - Using `auth:sanctum` middleware (works with both cookies and tokens)

### **Frontend (Next.js)**

1. **API Client** (`lib/apiClient.ts`)
   - **Changed from** `/api/proxy` **to** direct Laravel connection
   - Added `withCredentials: true` for cookie support
   - Added CSRF token handling (`X-XSRF-TOKEN` header)
   - Removed token refresh logic (no longer needed)

2. **Auth Service** (`services/authService.ts`)
   - **Completely rewritten** for cookie-based auth
   - Added `initCsrfProtection()` to get CSRF cookie
   - Removed localStorage token management
   - Simplified flow: CSRF → Login → Session cookie

3. **Auth Store** (`stores/authStore.ts`)
   - **Removed** localStorage persistence
   - **Changed to** in-memory state only
   - User data fetched fresh from API on page load

4. **Auth Hook** (`hooks/useAuth.ts`)
   - Updated to use new auth service API
   - Removed manual token management
   - Simplified checkAuth flow

5. **Proxy/Middleware** (`proxy.ts`)
   - Updated to check for Laravel session cookies
   - Removed `auth_token` cookie check
   - Added session cookie pattern detection

6. **Environment** (`.env.local`)
   - Added `NEXT_PUBLIC_LARAVEL_API_URL=http://localhost:8000/api`

---

## 🎯 How It Works Now

### **Login Flow**
```
1. User visits /login
2. Next.js calls Laravel: GET /sanctum/csrf-cookie
   → Laravel returns XSRF-TOKEN cookie
3. User submits credentials
4. Next.js posts to Laravel: POST /api/v1/login
   → Laravel validates credentials
   → Laravel creates session via Auth::login()
   → Laravel returns HTTP-only session cookie
5. User redirected to /admin
```

### **Authenticated Requests**
```
1. User navigates to /admin/users
2. Next.js proxy.ts checks for session cookie
   → If present, allows access
   → If missing, redirects to /login
3. Page makes API call: GET /api/v1/user
   → Browser automatically sends session cookie
   → Laravel validates session
   → Returns data
```

### **Logout Flow**
```
1. User clicks logout
2. Next.js calls: POST /api/v1/logout
   → Laravel destroys session
   → Laravel clears cookies
3. Next.js clears local state
4. User redirected to /login
```

---

## 🔧 Testing Steps

### 1. Start Both Servers

**Laravel (Terminal 1)**
```bash
cd d:/inventory/inventory-api
php artisan serve
# Running on: http://localhost:8000
```

**Next.js (Terminal 2)**
```bash
cd d:/inventory/inventory-ui
npm run dev
# Running on: http://localhost:3000
```

### 2. Test Login
1. Open browser: `http://localhost:3000/login`
2. Enter credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Click "Sign in"
4. ✅ Should redirect to `/admin`

### 3. Check Browser Cookies
```
DevTools → Application → Cookies → http://localhost:8000

You should see:
- laravel_session (HTTP-only, Secure: false, SameSite: Lax)
- XSRF-TOKEN (readable by JS)
```

### 4. Test Protected Routes
1. Visit: `http://localhost:3000/admin/users`
2. ✅ Should show users list (if logged in)
3. ✅ Should redirect to login (if not logged in)

### 5. Test Logout
1. Click the logout button
2. ✅ Should redirect to `/login`
3. Check cookies - should be cleared

### 6. Test Session Persistence
1. Login successfully
2. Close browser tab
3. Open new tab and visit: `http://localhost:3000/admin`
4. ✅ Should still be logged in (session persists)

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized" on all API calls

**Solution**: Check Laravel session configuration
```bash
# Check .env
SESSION_DRIVER=database
SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost

# Run migration if needed
php artisan migrate
```

### Issue: CORS errors in console

**Solution**: Verify CORS configuration
```php
// config/cors.php
'allowed_origins' => ['http://localhost:3000'],
'supports_credentials' => true,
```

### Issue: Session not persisting

**Solution**: Check session table exists
```bash
php artisan session:table
php artisan migrate
```

### Issue: Middleware error about proxy.ts and middleware.ts

**Solution**: We've already removed middleware.ts - only use proxy.ts

### Issue: Can't connect to Laravel API

**Solution**: Check if Laravel is running
```bash
php artisan serve
# Should see: "Server running on http://127.0.0.1:8000"
```

---

## 📚 Key Differences from Previous Implementation

| Feature | Before (Token-based) | After (Cookie-based) |
|---------|---------------------|----------------------|
| **Auth Method** | localStorage tokens | HTTP-only cookies |
| **Login** | Returns token to store | Sets session cookie |
| **API Calls** | Manual Authorization header | Automatic cookie |
| **Token Refresh** | Manual refresh logic | Automatic by Laravel |
| **Security** | Vulnerable to XSS | Protected from XSS |
| **Logout** | Delete token from localStorage | Destroy server session |
| **Persistence** | localStorage (client-side) | Database (server-side) |
| **Revocation** | Cannot revoke | Can revoke anytime |

---

## 🎉 Benefits Achieved

### **Security** ✅
- XSS-proof authentication (HTTP-only cookies)
- CSRF protection (Sanctum CSRF tokens)
- Server-side session control

### **User Experience** ✅
- Seamless authentication flow
- No manual token management
- Persistent sessions (30 days)

### **Developer Experience** ✅
- Standard Laravel Sanctum patterns
- No complex token refresh logic
- Type-safe TypeScript implementation

### **Industry Standard** ✅
- Follows Laravel documentation
- Matches Next.js best practices
- Used by major SaaS applications

---

## 📖 Related Documentation

- [COOKIE_AUTH_IMPLEMENTATION.md](./COOKIE_AUTH_IMPLEMENTATION.md) - Complete technical documentation
- [Laravel Sanctum Docs](https://laravel.com/docs/11.x/sanctum#spa-authentication)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)

---

## ✨ What's Next?

Your authentication system is now production-ready! Consider:

1. **Add Password Reset** - Implement forgot password flow
2. **Add Email Verification** - Verify user emails on registration
3. **Add 2FA** - Two-factor authentication for extra security
4. **Add Remember Me** - Extended session options
5. **Production Deployment** - Configure for HTTPS and production domains

---

**Questions?** Check the detailed documentation in `COOKIE_AUTH_IMPLEMENTATION.md`
