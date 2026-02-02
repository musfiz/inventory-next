# Inventory Management System - Frontend

A modern, enterprise-level inventory management dashboard built with Next.js 15 App Router, featuring secure Laravel Sanctum authentication and role-based access control.

## Features

- 🔐 **Secure Authentication** - Laravel Sanctum cookie-based authentication with CSRF protection
- 🚀 **Next.js 15 App Router** - Using the latest App Router architecture
- 🎨 **Modern UI** - Built with Tailwind CSS and dark mode support
- 📱 **Responsive Design** - Works seamlessly on all devices
- 🛡️ **Protected Routes** - Proxy-based route protection with session validation
- 👥 **Role-Based Access** - Super admin, admin, and user roles
- 🔄 **User Switching** - Super admin can debug as other users
- 📊 **Data Tables** - TanStack React Table with server-side pagination
- 🎯 **State Management** - Zustand with persistence
- 🌙 **Theme Support** - Light and dark mode with system preference detection

## Project Structure

```
inventory-ui/
├── app/
│   ├── (auth)/                    # Authentication route group
│   │   ├── login/
│   │   │   └── page.tsx           # Login page with redirect support
│   │   ├── actions.ts             # Server actions for cookie management
│   │   └── layout.tsx             # Auth layout (no redirect logic)
│   ├── (protected)/               # Protected routes requiring authentication
│   │   ├── analytics/
│   │   │   └── page.tsx           # Analytics dashboard
│   │   ├── brands/
│   │   │   └── page.tsx           # Brand management
│   │   ├── components/
│   │   │   ├── CustomSelect.tsx   # Custom select component
│   │   │   ├── DataTable.tsx      # Reusable data table
│   │   │   ├── Header.tsx         # Dashboard header
│   │   │   └── Sidebar.tsx        # Navigation sidebar with role filtering
│   │   ├── datatable/
│   │   │   └── page.tsx           # DataTable demo page
│   │   ├── settings/
│   │   │   └── page.tsx           # Settings page
│   │   ├── tenants/
│   │   │   └── page.tsx           # Tenant management (super admin only)
│   │   ├── users/
│   │   │   └── page.tsx           # User management
│   │   └── layout.tsx             # Protected layout with auth verification
│   ├── (public)/                  # Public routes (if any)
│   │   └── layout.tsx
│   ├── api/
│   │   └── proxy/
│   │       └── [...path]/
│   │           └── route.ts       # API proxy to Laravel backend
│   ├── error.tsx                  # Error boundary
│   ├── layout.tsx                 # Root layout with providers
│   ├── loading.tsx                # Loading state
│   ├── not-found.tsx              # 404 page
│   ├── page.tsx                   # Landing page
│   ├── globals.css                # Global styles
│   └── providers.tsx              # Combined providers wrapper
├── components/
│   ├── layout/
│   │   ├── header.tsx             # Header component
│   │   └── sidebar.tsx            # Sidebar component
│   └── ui/
│       └── datatable.tsx          # DataTable component
├── contexts/
│   └── ThemeContext.tsx           # Theme context provider
├── hooks/
│   └── use-theme.ts               # Theme hook
├── lib/
│   ├── api/
│   │   ├── auth.ts                # Authentication API functions
│   │   ├── axios.ts               # Axios instance with interceptors
│   │   └── index.ts               # API exports
│   ├── utils/
│   │   ├── date.ts                # Date utilities
│   │   └── validation.ts         # Validation utilities
│   └── notifications.ts           # SweetAlert2 notification wrapper
├── services/
│   ├── brandService.ts            # Brand API service
│   ├── tenantService.ts           # Tenant API service
│   ├── userService.ts             # User API service
│   ├── index.ts                   # Service exports
│   └── README.md                  # Service documentation
├── stores/
│   └── auth-store.ts              # Zustand auth store with persistence
├── types/
│   ├── api.types.ts               # API response types
│   ├── index.ts                   # Main type exports
│   └── user.types.ts              # User-related types
├── public/
│   └── locale/
│       ├── en.json                # English translations
│       └── bn.json                # Bengali translations
├── proxy.ts                       # Route protection middleware
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Laravel backend API running (default: http://localhost:8000)

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or use `npm run dev -- -p 9000` for port 9000)

### Demo Credentials

Contact your backend administrator for credentials. Example:
- **Email**: admin@example.com
- **Password**: admin123

## Routes

### Public Routes

- `/` - Landing page
- `/login` - Login page with redirect support

### Protected Routes

- `/dashboard` - Main dashboard (redirected to analytics)
- `/analytics` - Analytics and statistics
- `/users` - User management with CRUD operations
- `/brands` - Brand management
- `/tenants` - Tenant management (super admin only)
- `/settings` - Application settings
- `/datatable` - DataTable demo page

## Authentication Flow

1. User navigates to protected route (e.g., `/dashboard`)
2. Proxy checks for Laravel session cookie
3. No cookie → Redirect to `/login?redirect=/dashboard`
4. User enters credentials
5. Frontend calls Laravel Sanctum `/api/v1/login`
6. Backend validates and sets HTTP-only session cookie
7. User data stored in Zustand with localStorage persistence
8. Redirect to originally requested page
9. Protected layout verifies session via `/api/v1/user/profile`
10. Logout calls `/api/v1/logout` and clears cookies via Server Actions

## Proxy Protection

The `proxy.ts` file provides edge-level route protection:

- ✅ Checks for Laravel session cookies (`laravel_session`, `inventory_session`)
- ✅ Redirects unauthenticated users to `/login` with redirect parameter
- ✅ Always allows auth routes (login/register) to pass through
- ✅ Allows public routes (home page)
- ✅ Protects all other routes by default

## API Integration

### Axios Configuration

All API calls use a centralized Axios instance with:

- **Base URL**: Configured via `NEXT_PUBLIC_API_URL`
- **Credentials**: `withCredentials: true` for cookie handling
- **CSRF Protection**: Automatic `X-XSRF-TOKEN` header injection
- **Error Handling**: Global 401/419 interceptors
  - Clears auth state
  - Deletes cookies via Server Actions
  - Redirects to login

### API Endpoints

#### Authentication
- `POST /sanctum/csrf-cookie` - Initialize CSRF protection
- `POST /api/v1/login` - User login
- `POST /api/v1/logout` - User logout
- `GET /api/v1/user/profile` - Get authenticated user

#### Resources
- `GET /api/v1/users` - List users (paginated)
- `GET /api/v1/brands` - List brands (paginated)
- `GET /api/v1/tenants` - List tenants (super admin only)

## State Management

### Zustand Auth Store

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  loading: boolean;
  isSwitchedUser: boolean;
  originalSuperAdmin: User | null;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  switchUser: (targetUser: User, originalAdmin: User) => void;
  switchBack: () => void;
}
```

- **Persistence**: localStorage with `auth-storage` key
- **Hydration**: `isHydrated` flag prevents SSR mismatches
- **User Switching**: Super admin debug feature

## Server Actions

Located in `app/(auth)/actions.ts`:

### `clearAuthCookies()`
Deletes HTTP-only cookies that client-side JavaScript cannot access:
- `laravel_session`
- `inventory_session`
- `XSRF-TOKEN`
- `remember_web`

### `hasSessionCookies()`
Checks if valid session cookies exist.

### `getAllCookies()`
Debug utility to list all cookies.

## Components

### DataTable
Reusable table component with:
- Server-side pagination
- Sorting
- Column configuration
- Action buttons
- Loading states

### Sidebar
Dynamic navigation with:
- Role-based menu filtering
- Active route highlighting
- Mobile responsive drawer
- User switching indicator

### Header
Top bar with:
- Search functionality
- User menu dropdown
- Logout button
- Theme toggle
- Notifications (coming soon)

## Role-Based Access Control

### User Types
- `super_admin` - Full system access including tenant management
- `admin` - Organization management
- `user` - Limited access

### Implementation
```typescript
// Sidebar filters menu items
if (item.name === 'Tenant Management' && user?.user_type !== 'super_admin') {
  return false;
}
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Laravel Sanctum (Cookie-based SPA)
- **State Management**: Zustand with persistence
- **HTTP Client**: Axios with interceptors
- **Tables**: TanStack React Table
- **Notifications**: SweetAlert2
- **Icons**: Lucide React
- **Data Fetching**: SWR (optional)

## Production Considerations

✅ **Current Implementation:**
- Laravel Sanctum authentication
- HTTP-only cookies
- CSRF protection
- Role-based access control
- Server-side session validation
- Cookie cleanup on logout

🔄 **Future Enhancements:**
- Database integration documentation
- Email verification flow
- Password reset functionality
- Two-factor authentication
- Activity logging
- File upload handling
- Real-time notifications
- Internationalization (i18n)
- API rate limiting documentation

## Folder Architecture

This project follows Next.js App Router best practices:

1. **Route Groups**: `(auth)` and `(protected)` for organization
2. **Colocation**: Components near their usage
3. **Server Actions**: Cookie management in auth route group
4. **API Proxy**: Client-side API calls proxied through Next.js
5. **Layouts**: Nested layouts for auth and protected routes
6. **Type Safety**: Centralized type definitions
7. **Services**: Organized API service layer
8. **Stores**: Zustand stores with persistence

## Development Tips

### Running on Custom Port
```bash
npm run dev -- -p 9000
```

### Clearing Auth State
If stuck in auth loop:
1. Open DevTools → Application → Storage
2. Delete `auth-storage` from localStorage
3. Clear all cookies
4. Refresh page

### Debugging Auth Issues
1. Check Network tab for API calls
2. Verify cookies are set (Application → Cookies)
3. Check Zustand DevTools for state
4. Review console for error logs

## Deploy on Vercel

1. Connect your repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL`
3. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## License

MIT
