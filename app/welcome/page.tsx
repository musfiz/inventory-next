'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu, X, ChevronDown, LogOut, User, LayoutDashboard,
  Package, TrendingUp, Building2, ShoppingCart,
  CheckCircle, Target, BarChart3, Globe, Shield,
  Zap, RefreshCw, Database, ArrowRight, Star,
  ChevronRight, Layers, Truck, FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const FEATURES = [
  {
    title: 'Inventory Tracking & Management',
    icon: Package,
    features: [
      'Multi-tenant SaaS with data isolation',
      'Real-time stock across all business types',
      'Multi-location inventory management',
      'Batch/Lot tracking for pharmacy & grocery',
      'Serial number tracking for electronics',
      'Expiry date management with alerts',
      'Min/max stock level configuration',
      'ABC analysis and categorization',
    ],
  },
  {
    title: 'Product Master Management',
    icon: Layers,
    features: [
      'Flexible product attributes for all types',
      'Multiple units of measure (pcs, kg, liter)',
      'Category & sub-category with inheritance',
      'Barcode/QR code generation & scanning',
      'Product variants (size, color, model)',
      'Image and document management',
      'Custom fields per product type',
    ],
  },
  {
    title: 'Purchase & Receiving',
    icon: Truck,
    features: [
      'Purchase order creation & management',
      'Goods receipt with batch/expiry capture',
      'Supplier management & performance tracking',
      'Return to supplier processing',
      'Automated reordering based on stock levels',
      'Purchase price history',
      'Multi-currency support',
    ],
  },
  {
    title: 'Sales & Distribution',
    icon: ShoppingCart,
    features: [
      'Point of Sale (POS) integration',
      'Sales order processing',
      'Invoice generation with tax calculations',
      'Customer management with credit limits',
      'Sales return & exchange handling',
      'Delivery management for large items',
      'Multi-channel sales support',
    ],
  },
  {
    title: 'Stock Movement & Transfers',
    icon: RefreshCw,
    features: [
      'Inter-store/warehouse transfers',
      'Stock adjustment (write-off, damage, loss)',
      'Physical stock counting & reconciliation',
      'Consignment stock management',
      'Assembly and disassembly (kitting)',
      'Automated stock movement tracking',
      'Audit trail for all movements',
    ],
  },
  {
    title: 'Reporting & Analytics',
    icon: BarChart3,
    features: [
      'Inventory valuation reports',
      'Stock aging analysis',
      'Fast/slow moving item reports',
      'Profit margin analysis',
      'Supplier performance reports',
      'Customer purchase patterns',
      'Expiry & obsolescence reports',
    ],
  },
  {
    title: 'Integration Capabilities',
    icon: Globe,
    features: [
      'Accounting system integration',
      'E-commerce platform connectivity',
      'Payment gateway integration',
      'Barcode scanner & label printer support',
      'Mobile app for stock taking',
      'Email/SMS notification system',
      'REST API for custom integrations',
    ],
  },
  {
    title: 'Security & Compliance',
    icon: Shield,
    features: [
      'Role-based access control',
      'Multi-store access permissions',
      'Audit trail of all transactions',
      'Data backup and recovery',
      'Multi-language support (English, Bengali)',
      'GDPR compliance',
      'SSL encryption & security',
    ],
  },
];

const BUSINESS_TYPES = [
  { emoji: '\uD83D\uDC8A', title: 'Pharmacy & Drug Stores', desc: 'Medicine tracking, expiry management, prescription handling' },
  { emoji: '\uD83D\uDED2', title: 'Grocery & Supermarkets', desc: 'Perishable goods, bulk items, weight-based inventory' },
  { emoji: '\uD83C\uDFE2', title: 'Real Estate Agencies', desc: 'Property listings, equipment inventory, office supplies' },
  { emoji: '\uD83D\uDCBB', title: 'Electronics & Computer', desc: 'Serialized items, warranty tracking, accessories' },
  { emoji: '\uD83D\uDC55', title: 'Apparel & Fashion Retail', desc: 'Size/color matrix, seasonal inventory, returns' },
  { emoji: '\uD83C\uDFEA', title: 'Multi-Store Chains', desc: 'Centralized inventory across multiple locations' },
  { emoji: '\uD83D\uDCE6', title: 'Warehouse Operations', desc: 'Bulk storage, bin management, 3PL logistics' },
  { emoji: '\uD83C\uDFED', title: 'Manufacturing', desc: 'Raw materials, WIP, finished goods tracking' },
];

const OBJECTIVES = [
  { icon: Zap, title: 'Eliminate Manual Work', desc: 'Replace spreadsheets with centralized automation to reduce errors and stockouts' },
  { icon: Target, title: 'Real-Time Visibility', desc: 'Track inventory levels, movements, and status across all locations instantly' },
  { icon: RefreshCw, title: 'Automate Replenishment', desc: 'Smart reordering to maintain ideal stock levels automatically' },
  { icon: Database, title: 'Seamless Integration', desc: 'Connect with ERP, CRM, e-commerce, and supplier systems' },
  { icon: TrendingUp, title: 'Data-Driven Decisions', desc: 'Robust analytics for purchasing, forecasting, and strategy' },
  { icon: Globe, title: 'Global Scalability', desc: 'Manage complex supply chains and multi-channel sales' },
];

export default function Home() {
  const { user } = useAuthStore();
  const clearAuth = useAuthStore(state => state.clearAuth);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = !!user;
  const { logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    router.push('/login');
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navigation ───────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Universal IMS
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#solutions" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Solutions</a>
              <a href="#objectives" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Why Us</a>
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <User className="w-4 h-4" />
                    <span>{user.name?.split(' ')[0] || user.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 overflow-hidden">
                      <Link href="/dashboard" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                        Dashboard
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md">
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Features</a>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Solutions</a>
              <a href="#objectives" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Why Us</a>
              <hr className="border-gray-100" />
              {isAuthenticated && user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-indigo-600 rounded-lg hover:bg-indigo-50">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
                  Get Started
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center pt-20 lg:pt-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-indigo-100/40 to-transparent hidden lg:block" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-sm font-medium text-indigo-700">
                <Zap className="w-4 h-4" />
                Now available — v2.0 with multi-tenant support
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                Universal{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Inventory
                </span>
                <br />
                Management System
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed">
                A centralized, automated platform for tracking inventory across multiple locations,
                monitoring stock movements, and optimizing replenishment in real time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={isAuthenticated ? '/dashboard' : '/login'}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Explore Features
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br ${
                      ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-emerald-400 to-emerald-600', 'from-amber-400 to-amber-600'][i-1]
                    }`} />
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Trusted by <span className="font-semibold text-gray-900">500+</span> businesses
                </p>
              </div>
            </div>

            {/* Hero right — preview mockup */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />

                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-3 text-xs text-gray-400 font-medium">Dashboard Preview</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Today\'s Sales', value: '৳48,250', color: 'from-green-500 to-emerald-600' },
                        { label: 'Low Stock', value: '12 items', color: 'from-orange-500 to-red-500' },
                        { label: 'Pending Orders', value: '8', color: 'from-blue-500 to-indigo-600' },
                        { label: 'Monthly Revenue', value: '৳1.2M', color: 'from-purple-500 to-pink-600' },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                          <p className={`text-lg font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="h-24 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-indigo-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────── */}
      <section className="relative -mt-8 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Businesses Served' },
              { value: '50K+', label: 'Products Tracked' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Objectives ───────────────────────────────────────────── */}
      <section id="objectives" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Universal IMS?
            </h2>
            <p className="text-lg text-gray-600">
              We solve the real challenges businesses face every day in managing inventory.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {OBJECTIVES.map((item, idx) => (
              <div
                key={idx}
                className="group relative p-6 rounded-2xl bg-white border border-gray-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solutions / Business Types ───────────────────────────── */}
      <section id="solutions" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Supports Every Business Type
            </h2>
            <p className="text-lg text-gray-600">
              From pharmacy to manufacturing — we&apos;ve got you covered.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BUSINESS_TYPES.map((item, idx) => (
              <div
                key={idx}
                className="group p-5 rounded-xl bg-white border border-gray-200 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="text-2xl block mb-3">{item.emoji}</span>
                <h3 className="font-bold text-gray-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600">
              Comprehensive features designed for modern inventory management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((section, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-gray-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {section.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Regional Support ─────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-100 p-8 sm:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-sm font-medium text-emerald-700 mb-4">
                  <Globe className="w-4 h-4" /> Bangladesh Focused
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Built for the Bangladeshi Market
                </h2>
                <p className="text-gray-600 mb-6">
                  Fully compliant with local regulations, tax structures, and payment systems.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    'VAT, TIN, BIN compliance',
                    'Local units (pcs, kg, bigha)',
                    'bKash, Nagad, Rocket',
                    'BSTI & drug regulations',
                    'Bengali language support',
                    'Regional pricing',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 sm:p-16 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Inventory?
              </h2>
              <p className="text-lg text-indigo-100 mb-8 max-w-xl mx-auto">
                Join hundreds of businesses that have eliminated inefficiencies and gained complete
                control over their inventory.
              </p>
              <Link
                href={isAuthenticated ? '/dashboard' : '/login'}
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-indigo-700 bg-white rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Your Journey'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">UIMS</span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Universal Inventory Management System — empowering businesses with intelligent
                inventory solutions.
              </p>
              <div className="flex gap-3">
                {[Building2, BarChart3, Shield].map((Icon, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-3">
                {['Features', 'Solutions', 'Integrations', 'Pricing', 'API'].map(item => (
                  <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact', 'Partners'].map(item => (
                  <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-3">
                {['Documentation', 'Help Center', 'Status', 'Privacy', 'Terms'].map(item => (
                  <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} UIMS. All rights reserved. <a target="_blank" className="text-white" href="https://www.musfiz.com/">Mustafizur Rahman</a>
            </p>
            <div className="flex items-center gap-6">
              {['Privacy', 'Terms', 'Cookies'].map(item => (
                <a key={item} href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
