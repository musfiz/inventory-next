# 🔐 Professional Cookie-Based Authentication

## Industry-Standard Authentication Flow: Next.js 16 + Laravel 12 Sanctum

This implementation follows the **professional and industrial standard** for secure SPA authentication using HTTP-only cookies.

---

## 🎯 Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Next.js 16    │         │  Laravel Sanctum │         │    Database     │
│   (Frontend)    │────────▶│   (Backend API)  │────────▶│   (Sessions)    │
│                 │         │                  │         │                 │
│ • Cookie-based  │         │ • Stateful Auth  │         │ • Session Store │
│ • No localStorage│        │ • HTTP-only      │         │ • User Data     │
│ • CSRF Protected│         │ • CSRF Tokens    │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## ✨ Key Benefits

### 🛡️ Security
- **XSS Protection**: Tokens stored in HTTP-only cookies (not accessible via JavaScript)
- **CSRF Protection**: Laravel Sanctum's built-in CSRF token mechanism
- **Session-based**: Server-side session management, revocable at any time
- **Secure by default**: No sensitive data in localStorage or client-side storage

### 🚀 User Experience
- **Seamless**: Cookies automatically sent with every request
- **No manual token management**: Browser handles cookie lifecycle
- **Auto-renewal**: Session extended automatically on activity
- **Persistent sessions**: 30-day session lifetime (configurable)

### 👨‍💻 Developer Experience
- **Simple integration**: No complex token refresh logic needed
- **Standard practices**: Industry-standard patterns
- **Framework support**: Native Sanctum features, no custom JWT
- **Type-safe**: Full TypeScript support

---

## 🔄 Authentication Flow

### 1. **Initial Setup**
```typescript
// Client calls CSRF endpoint to get CSRF cookie
await fetch('http://localhost:8000/sanctum/csrf-cookie', {
  credentials: 'include'
});
```

### 2. **Login Process**
```typescript
// Client sends credentials
POST http://localhost:8000/api/v1/login
{
  "email": "admin@example.com",
  "password": "password123"
}

// Laravel:
// - Validates credentials
// - Creates session via Auth::login()
// - Sets HTTP-only session cookie
// - Returns user data
```

### 3. **Authenticated Requests**
```typescript
// All subsequent requests automatically include:
// - Session cookie (HTTP-only, secure)
// - CSRF token (X-XSRF-TOKEN header)

GET http://localhost:8000/api/v1/profile
// Laravel middleware validates session
// Returns user data
```

### 4. **Logout**
```typescript
POST http://localhost:8000/api/v1/logout

// Laravel:
// - Destroys session
// - Clears cookies
// - Client redirects to login
```

---

## 📁 Implementation Structure

### Backend (Laravel)

#### **Configuration Files**

**`config/sanctum.php`**
```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000'
)),
'guard' => ['web'],
```

**`config/session.php`**
```php
'driver' => env('SESSION_DRIVER', 'database'),
'lifetime' => 43200, // 30 days
'http_only' => true,
'same_site' => 'lax',
```

**`config/cors.php`**
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],
'supports_credentials' => true,
```

**`.env`**
```env
SESSION_DRIVER=database
SESSION_LIFETIME=43200
SESSION_DOMAIN=localhost
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax

SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost
FRONTEND_URL=http://localhost:3000
```

#### **AuthController**

```php
use Illuminate\Support\Facades\Auth;

public function login(Request $request)
{
    // Validate credentials
    $user = User::where('email', $request->email)->first();
    
    if (!$user || !Hash::check($request->password, $user->password)) {
        return $this->error('Invalid credentials', null, 401);
    }
    
    // Create session (sets HTTP-only cookie)
    Auth::login($user, true); // true = remember
    $request->session()->regenerate();
    
    return $this->success([
        'user' => $user->load('tenant'),
        'message' => 'Login successful',
    ]);
}

public function logout(Request $request)
{
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    
    return $this->success(null, 'Logged out successfully');
}
```

#### **Middleware Configuration**

**`bootstrap/app.php`**
```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
    
    $middleware->api(prepend: [
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    ]);
})
```

---

### Frontend (Next.js)

#### **API Client Configuration**

**`lib/apiClient.ts`**
```typescript
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true, // Critical for cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add CSRF token to requests
apiClient.interceptors.request.use((config) => {
  const token = getCookie('XSRF-TOKEN');
  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }
  return config;
});
```

#### **Authentication Service**

**`services/authService.ts`**
```typescript
class AuthService {
  async initCsrfProtection(): Promise<void> {
    await fetch(`${LARAVEL_URL}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Get CSRF cookie first
    await this.initCsrfProtection();
    
    // Login (session cookie set automatically)
    const response = await apiClient.post('/api/v1/login', credentials);
    return response.data.data;
  }

  async getCurrentUser(): Promise<User | null> {
    const response = await apiClient.get('/api/v1/profile');
    return response.data.data.user;
  }
}
```

#### **Route Protection Middleware**

**`middleware.ts`**
```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith('/admin');
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Check for Laravel session cookie
  const hasSession = request.cookies.has('laravel_session');
  
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}
```

#### **Authentication Hook**

**`hooks/useAuth.ts`**
```typescript
export const useAuth = () => {
  const { setUser, clearAuth } = useAuthStore();

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    setUser(data.user);
    return true;
  };

  const logout = async () => {
    await authService.logout();
    clearAuth();
  };

  const checkAuth = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setUser(user);
      return true;
    }
    return false;
  };

  return { login, logout, checkAuth };
};
```

#### **State Management**

**`stores/authStore.ts`**
```typescript
// In-memory only - no persistence
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  
  setUser: (user) => set({ user }),
  clearAuth: () => set({ user: null }),
}));
```

---

## 🚀 Setup Instructions

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd inventory-api
   composer install
   ```

2. **Configure Environment**
   ```bash
   # Already configured in .env
   SESSION_DRIVER=database
   SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost
   FRONTEND_URL=http://localhost:3000
   ```

3. **Create Session Table**
   ```bash
   php artisan session:table
   php artisan migrate
   ```

4. **Start Laravel Server**
   ```bash
   php artisan serve
   # Runs on http://localhost:8000
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd inventory-ui
   npm install
   ```

2. **Configure Environment**
   ```bash
   # .env.local
   NEXT_PUBLIC_LARAVEL_API_URL=http://localhost:8000/api
   ```

3. **Start Next.js Dev Server**
   ```bash
   npm run dev
   # Runs on http://localhost:3000
   ```

---

## 🧪 Testing the Flow

### 1. Test Login
```bash
# Browser: http://localhost:3000/login
# Enter credentials and login
# ✅ Check browser cookies for session cookie
# ✅ User should be redirected to /admin
```

### 2. Test Protected Routes
```bash
# Browser: http://localhost:3000/admin
# ✅ Should show admin dashboard if logged in
# ✅ Should redirect to login if not authenticated
```

### 3. Test API Calls
```typescript
// All API calls automatically include cookies
const users = await apiClient.get('/api/v1/user');
// ✅ Session cookie sent automatically
// ✅ No manual Authorization header needed
```

### 4. Test Logout
```bash
# Click logout button
# ✅ Session destroyed on server
# ✅ Cookies cleared
# ✅ Redirected to login page
```

---

## 🔍 Debugging

### Check Cookies in Browser
```
DevTools → Application → Cookies → http://localhost:8000
- laravel_session (HTTP-only)
- XSRF-TOKEN (readable by JS)
```

### Laravel Logs
```bash
tail -f storage/logs/laravel.log
```

### Network Tab
```
Check request headers:
- Cookie: laravel_session=...
- X-XSRF-TOKEN: ...
```

---

## 📊 Cookie Security Comparison

| Feature | localStorage Token | HTTP-only Cookie (Our Approach) |
|---------|-------------------|--------------------------------|
| XSS Protection | ❌ Vulnerable | ✅ Protected |
| CSRF Protection | ✅ Not needed | ✅ Built-in |
| Session Revocation | ❌ Client-side | ✅ Server-side |
| Auto-refresh | ❌ Manual | ✅ Automatic |
| Mobile Apps | ✅ Easy | ⚠️ Requires setup |
| Industry Standard | ⚠️ Common | ✅ Recommended |

---

## 🎓 Why This Approach?

### Recommended by:
- **Laravel Documentation**: Official Sanctum SPA authentication method
- **Next.js Documentation**: Supports cookie-based auth patterns
- **OWASP**: Recommends HTTP-only cookies for web apps
- **MDN**: Security best practices for session management

### Used by:
- GitHub
- Stripe Dashboard
- Vercel Dashboard
- Most modern SaaS applications

---

## 🔐 Production Considerations

### Environment Variables
```env
# Production .env
SESSION_SECURE_COOKIE=true  # HTTPS only
SESSION_DOMAIN=.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,app.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

### HTTPS Required
- Cookies must be sent over HTTPS in production
- Use `SESSION_SECURE_COOKIE=true`
- Configure proper SSL certificates

### Domain Configuration
- Set `SESSION_DOMAIN` to your root domain
- Include all subdomains in `SANCTUM_STATEFUL_DOMAINS`
- Configure CORS properly

### Session Storage
- Use `redis` driver for better performance
- Configure session cleanup
- Monitor session table size

---

## ✅ Conclusion

This implementation provides:
- ✅ **Professional-grade security** (HTTP-only cookies, CSRF protection)
- ✅ **Industry-standard practices** (Sanctum stateful auth)
- ✅ **Simple developer experience** (no complex token management)
- ✅ **Production-ready** (scalable, secure, maintainable)

**No localStorage. No manual token refresh. Just secure, professional authentication.**
