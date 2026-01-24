# Nexus Dashboard

A modern, industrial-level dashboard application built with Next.js 15 App Router, featuring secure authentication and protected routes.

## Features

- 🔐 **Secure Authentication** - Cookie-based authentication with proxy protection
- 🚀 **Next.js 15 App Router** - Using the latest App Router architecture
- 🎨 **Modern UI** - Built with Tailwind CSS
- 📱 **Responsive Design** - Works seamlessly on all devices
- 🛡️ **Protected Routes** - Proxy-based route protection
- 📊 **Admin Dashboard** - Complete admin panel with analytics, user management, and settings

## Project Structure

```
nexus-dashboard-site/
├── app/
│   ├── admin/              # Protected admin routes
│   │   ├── analytics/      # Analytics page
│   │   ├── settings/       # Settings page
│   │   ├── users/          # User management
│   │   ├── layout.tsx      # Admin layout with sidebar
│   │   └── page.tsx        # Admin dashboard
│   ├── api/
│   │   └── auth/           # Authentication API routes
│   │       ├── login/      # Login endpoint
│   │       ├── logout/     # Logout endpoint
│   │       └── me/         # Current user endpoint
│   ├── login/              # Login page
│   ├── web/            # Public web route
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── contexts/
│   └── AuthContext.tsx     # Authentication context provider
├── lib/
│   ├── auth.ts            # Authentication utilities
│   └── utils.ts           # Utility functions
├── types/
│   └── index.ts           # TypeScript type definitions
├── proxy.ts               # Route protection proxy
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Demo Credentials

- **Email**: admin@example.com
- **Password**: admin123

### Installation

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Routes

### Public Routes

- `/` - Home page
- `/web` - Public web with features
- `/login` - Login page

### Protected Routes (Admin Only)

- `/admin` - Admin dashboard with statistics
- `/admin/users` - User management
- `/admin/settings` - Application settings
- `/admin/analytics` - Analytics and reports

## Authentication Flow

1. User navigates to `/login`
2. Enters credentials (demo: admin@example.com / admin123)
3. Credentials validated via `/api/auth/login`
4. HTTP-only cookie is set
5. User redirected to `/admin` dashboard
6. Proxy protects all `/admin/*` routes
7. Logout clears cookie and redirects to login

## Proxy Protection

The `proxy.ts` file provides edge-level route protection:

- Redirects unauthenticated users from `/admin` to `/login`
- Redirects authenticated admin users from `/login` to `/admin`
- Verifies user role for admin access
- Runs on all routes except static assets

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Cookie-based (HTTP-only cookies)
- **State Management**: React Context API

## Production Considerations

This demo uses simplified authentication. For production, consider:

- **NextAuth.js** - Full-featured authentication
- **Clerk** - Modern user management
- **Auth0** - Enterprise authentication
- **Supabase Auth** - Open source authentication
- Database integration (PostgreSQL, MongoDB)
- JWT tokens with refresh mechanism
- Rate limiting and CSRF protection
- Session management
- Password hashing (bcrypt, argon2)

## Folder Architecture

This project follows Next.js App Router best practices:

1. **Colocation**: Keep related files together
2. **Route Groups**: Use `(group)` for organization (ready to implement)
3. **API Routes**: Separate in `app/api/`
4. **Layouts**: Shared UI in `layout.tsx` files
5. **Server/Client**: Explicit `'use client'` directives
6. **Type Safety**: Centralized in `types/`
7. **Utilities**: Organized in `lib/`
8. **Contexts**: React contexts in `contexts/`

## Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com/new):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nexus-dashboard-site)

## License

MIT
