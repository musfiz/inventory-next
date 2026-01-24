# Nexus Dashboard - Folder Structure

This document provides a detailed overview of the project's folder architecture.

## Complete Folder Structure

```
nexus-dashboard-site/
│
├── app/                          # Next.js App Router directory
│   │
│   ├── api/                      # API Routes
│   │   └── auth/                 # Authentication endpoints
│   │       ├── login/
│   │       │   └── route.ts      # POST /api/auth/login
│   │       ├── logout/
│   │       │   └── route.ts      # POST /api/auth/logout
│   │       └── me/
│   │           └── route.ts      # GET /api/auth/me
│   │
│   ├── admin/                    # Protected admin routes
│   │   ├── analytics/
│   │   │   └── page.tsx          # /admin/analytics
│   │   ├── settings/
│   │   │   └── page.tsx          # /admin/settings
│   │   ├── users/
│   │   │   └── page.tsx          # /admin/users
│   │   ├── layout.tsx            # Admin layout (sidebar + nav)
│   │   └── page.tsx              # /admin (dashboard)
│   │
│   ├── login/
│   │   └── page.tsx              # /login
│   │
│   ├── web/
│   │   └── page.tsx              # /web (public)
│   │
│   ├── layout.tsx                # Root layout (AuthProvider)
│   ├── page.tsx                  # / (home page)
│   └── globals.css               # Global styles
│
├── contexts/                     # React Context providers
│   └── AuthContext.tsx           # Authentication context
│
├── lib/                          # Utility functions
│   ├── auth.ts                   # Auth helpers (validate, token gen/verify)
│   └── utils.ts                  # Common utilities (cn, etc.)
│
├── types/                        # TypeScript definitions
│   └── index.ts                  # User, AuthContext types
│
├── proxy.ts                      # Edge proxy (route protection)
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
├── postcss.config.mjs            # PostCSS config
├── eslint.config.mjs             # ESLint config
└── README.md                     # Project documentation
```

## Route Organization

### Public Routes (No Authentication Required)

- `/` - Landing page
- `/web` - Public web with features
- `/login` - Login page (redirects to /admin if authenticated)

### Protected Routes (Admin Only)

- `/admin` - Dashboard with stats
- `/admin/users` - User management table
- `/admin/settings` - Application settings
- `/admin/analytics` - Analytics and reports

### API Routes

- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Get current user

## File Responsibilities

### Core Files

**`proxy.ts`**

- Runs on every request (edge runtime)
- Protects `/admin/*` routes
- Redirects based on auth status
- Verifies user role

**`app/layout.tsx`**

- Root layout component
- Wraps app with AuthProvider
- Sets up fonts and metadata
- Applies global styles

### Authentication

**`contexts/AuthContext.tsx`**

- Client-side auth state management
- Login/logout methods
- User data persistence
- Auth status checking

**`lib/auth.ts`**

- Server-side auth utilities
- Credential validation
- Token generation/verification
- Demo user data (replace in production)

### Admin Section

**`app/admin/layout.tsx`**

- Admin-specific layout
- Sidebar navigation
- Top nav bar with user info
- Logout button

**`app/admin/page.tsx`**

- Main dashboard
- Statistics cards
- Recent activity feed
- Welcome message

## Best Practices Implemented

### 1. Separation of Concerns

- Routes in `app/`
- Business logic in `lib/`
- Type definitions in `types/`
- Contexts in `contexts/`

### 2. Type Safety

- All files use TypeScript
- Centralized type definitions
- Proper interface exports

### 3. Code Organization

- Colocation of related files
- Clear folder naming
- Consistent file naming (`page.tsx`, `layout.tsx`, `route.ts`)

### 4. Security

- HTTP-only cookies
- Proxy-based protection
- Role-based access control
- Server/client separation

### 5. Scalability

- Modular structure
- Easy to add new routes
- Reusable contexts and utilities
- Ready for component library expansion

## Future Enhancements

### Recommended Additions

1. **components/** - Reusable UI components

   - `ui/` - Button, Input, Card, etc.
   - `forms/` - Form components
   - `layout/` - Layout components

2. **hooks/** - Custom React hooks

   - `useUser.ts`
   - `usePermissions.ts`

3. **services/** - API service layers

   - `userService.ts`
   - `analyticsService.ts`

4. **constants/** - Application constants

   - `routes.ts`
   - `config.ts`

5. **utils/** - More utility functions

   - `validation.ts`
   - `formatting.ts`

6. **config/** - Configuration files
   - `auth.config.ts`
   - `app.config.ts`

## Route Groups (Optional Future Enhancement)

```
app/
├── (public)/          # Public routes group
│   ├── web/
│   └── layout.tsx     # Public-specific layout
├── (auth)/            # Auth routes group
│   └── login/
└── (dashboard)/       # Dashboard routes group
    └── admin/
```

Route groups allow you to:

- Organize routes without affecting URLs
- Apply different layouts to different sections
- Better visual organization in codebase
