inventory-ui/
├── 📁 app/ # Next.js 16+ App Router directory
│ ├── layout.tsx # Root layout wrapper
│ ├── page.tsx # Home/landing page
│ ├── loading.tsx # Global loading state
│ ├── error.tsx # Global error boundary
│ ├── not-found.tsx # 404 page
│ ├── favicon.ico # Site favicon
│ ├── globals.css # Global styles and Tailwind imports
│ │
│ ├── 📁 (auth)/ # Authentication route group (no layout impact)
│ │ ├── layout.tsx # Auth pages layout
│ │ └── 📁 login/
│ │ └── page.tsx # Login page
│ │
│ └── 📁 (protected)/ # Protected routes (requires authentication)
│ ├── layout.tsx # Protected pages layout with sidebar/header
│ │
│ ├── 📁 dashboard/
│ │ └── page.tsx # Dashboard/analytics overview
│ │
│ ├── 📁 products/ # Product management
│ │ ├── page.tsx # Products listing with DataTable
│ │ ├── 📁 add/
│ │ │ └── page.tsx # Add/Edit product form
│ │ └── 📁 images/ # Product images folder (empty)
│ │
│ ├── 📁 product-variations/ # Product variations management
│ │ ├── page.tsx # Variations listing
│ │ └── 📁 add/
│ │ └── page.tsx # Add/Edit variation form
│ │
│ ├── 📁 product-barcodes/ # Barcode management
│ │ └── page.tsx # Barcode generation & listing
│ │
│ ├── 📁 attributes/ # Product attributes (Color, Size, etc.)
│ │ ├── page.tsx # Attributes listing
│ │ └── 📁 values/
│ │ └── page.tsx # Attribute values management
│ │
│ ├── 📁 categories/ # Product categories
│ │ └── page.tsx # Categories CRUD
│ │
│ ├── 📁 brands/ # Product brands
│ │ └── page.tsx # Brands CRUD
│ │
│ ├── 📁 units/ # Measurement units
│ │ └── page.tsx # Units CRUD (kg, pcs, etc.)
│ │
│ ├── 📁 warehouse/ # Warehouse management
│ │ └── page.tsx # Warehouse listing & management
│ │
│ ├── 📁 users/ # User management
│ │ └── page.tsx # Users CRUD
│ │
│ ├── 📁 permissions/ # Role permissions
│ │ └── page.tsx # Permissions management
│ │
│ ├── 📁 user-permissions/ # User-specific permissions
│ │ └── page.tsx # Assign permissions to users
│ │
│ ├── 📁 tenants/ # Multi-tenant management
│ │ ├── page.tsx # Tenants listing
│ │ └── 📁 register/
│ │ └── page.tsx # Register new tenant
│ │
│ ├── 📁 analytics/ # Analytics & reports
│ │ └── page.tsx # Analytics dashboard
│ │
│ └── 📁 access-denied/ # Access denied page
│ └── page.tsx # Shown when user lacks permissions
│
├── 📁 components/ # Reusable React components
│ ├── 📁 layout/ # Layout components
│ │ ├── header.tsx # Top navigation header
│ │ └── sidebar.tsx # Sidebar navigation menu
│ │
│ └── 📁 ui/ # UI components
│ ├── datatable.tsx # Reusable data table with pagination
│ └── custom-select.tsx # Custom select/dropdown component
│
├── 📁 services/ # API service layer
│ ├── index.ts # Service exports
│ ├── attributeService.ts # Attribute CRUD operations
│ ├── attributeValueService.ts # Attribute value operations
│ ├── barcodeService.ts # Barcode generation & management
│ ├── brandService.ts # Brand CRUD operations
│ ├── categoryService.ts # Category CRUD operations
│ ├── commonService.ts # Common/shared API calls
│ ├── permissionService.ts # Permission management
│ ├── productService.ts # Product CRUD operations
│ ├── productVariationService.ts # Product variation operations
│ ├── tenantService.ts # Tenant management
│ ├── unitService.ts # Unit CRUD operations
│ ├── userService.ts # User management
│ ├── userPermissionService.ts # User permission assignment
│ └── warehouseService.ts # Warehouse management
│
├── 📁 lib/ # Utility libraries
│ ├── constants.ts # App-wide constants
│ ├── notifications.ts # SweetAlert2 notification wrapper
│ │
│ ├── 📁 api/
│ │ └── axios.ts # Axios HTTP client configuration
│ │
│ └── 📁 utils/
│ ├── date.ts # Date formatting utilities
│ └── validation.ts # Form validation helpers
│
├── 📁 contexts/ # React Context providers
│ └── ThemeContext.tsx # Theme (dark/light mode) context
│
├── 📁 hooks/ # Custom React hooks
│ ├── use-auth.ts # Authentication hook
│ └── use-permissions.ts # Permission checking hook
│
├── 📁 stores/ # State management (Zustand)
│ └── auth-store.ts # Authentication state store
│
├── 📁 types/ # TypeScript type definitions
│ ├── index.ts # Type exports
│ ├── api.types.ts # API response types
│ ├── permission.types.ts # Permission-related types
│ └── user.types.ts # User-related types
│
├── 📁 public/ # Static assets
│ ├── file.svg # SVG icons
│ ├── globe.svg
│ ├── next.svg
│ ├── vercel.svg
│ ├── window.svg
│ └── 📁 locale/ # Internationalization files
│ ├── bn.json # Bengali translations
│ └── en.json # English translations
│
└── 📁 Generated/Build Folders
│ ├── .git/ # Git version control
│ ├── .next/ # Next.js build output
│ └── node_modules/ # NPM dependencies
│
├── 📄 Configuration Files
├── .env.example # Environment variables template
├── .env.local # Local environment variables (API keys, URLs)
├── .gitignore # Git ignore rules
├── .prettierignore # Prettier formatting ignore rules
├── .prettierrc # Prettier code formatting configuration
├── eslint.config.mjs # ESLint configuration for code linting
├── next-env.d.ts # Next.js TypeScript declarations
├── next.config.ts # Next.js configuration
├── package.json # NPM dependencies and scripts
├── package-lock.json # NPM dependency lock file
├── postcss.config.mjs # PostCSS configuration for Tailwind CSS
├── tsconfig.json # TypeScript configuration
├── tsconfig.tsbuildinfo # TypeScript build cache
└── README.md # Project documentation
