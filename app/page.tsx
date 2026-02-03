'use client';

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, LayoutDashboard, LogOut, User,
  Package, TrendingUp, Building2, Laptop, ShoppingCart,
  Warehouse, CheckCircle, Target, BarChart3, Globe,
  Shield, Zap, RefreshCw, Database, Users, FileText
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";


export default function Home() {
  const { user } = useAuthStore();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = !!user;

  const { logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuth();
      router.push('/login');
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-indigo-600 mr-2" />
              <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Universal IMS
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
                  >
                    <User className="h-4 w-4" />
                    <span>{user.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Universal Inventory
              </span>
              <br />
              Management System
            </h1>
            <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
              A centralized, automated platform for tracking inventory across multiple locations, monitoring stock movements, and optimizing replenishment.
            </p>
            <p className="text-lg text-gray-500 mb-8 max-w-3xl mx-auto">
              Eliminate manual inefficiencies, reduce errors, and gain real-time visibility into your entire inventory ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={isAuthenticated ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            The Challenge We Solve
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              <strong>Universal Inventory management</strong> is a critical component of operational efficiency for businesses that handle physical goods, whether in retail, manufacturing, distribution, or warehousing. Traditionally, inventory control relied heavily on manual processes, spreadsheets, or basic software, which often led to <span className="text-red-600 font-semibold">inaccuracies, stockouts, overstocking, and inefficient use of resources</span>.
            </p>
            <p>
              An <strong>Universal Inventory Management System (UIMS)</strong> is designed to address these challenges by providing a centralized, automated platform for tracking inventory across multiple locations, monitoring stock movements, and optimizing replenishment. Advanced IMS solutions can integrate with other business systems such as <strong>Enterprise Resource Planning (ERP)</strong>, <strong>Customer Relationship Management (CRM)</strong>, and <strong>e-commerce platforms</strong>, enabling seamless data flow and reducing the risk of errors.
            </p>
          </div>
        </div>

        {/* Objectives Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Our Objectives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Eliminate Manual Inefficiencies", desc: "Replace spreadsheets with centralized automation to reduce errors and stockouts" },
              { icon: Target, title: "Real-Time Visibility", desc: "Track inventory levels, movements, and status across all locations instantly" },
              { icon: RefreshCw, title: "Automate Replenishment", desc: "Implement smart reordering to maintain ideal stock levels automatically" },
              { icon: Database, title: "Seamless Integration", desc: "Connect with ERP, CRM, e-commerce, and supplier systems effortlessly" },
              { icon: BarChart3, title: "Enhanced Decision-Making", desc: "Robust analytics for data-driven purchasing and forecasting" },
              { icon: Globe, title: "Support Scalability", desc: "Manage global supply chains and multi-channel sales complexity" },
              { icon: CheckCircle, title: "Customer Satisfaction", desc: "Ensure product availability and timely order fulfillment" },
              { icon: TrendingUp, title: "Reduce Costs", desc: "Minimize carrying costs, wastage, and optimize resources" },
              { icon: Shield, title: "Accuracy & Reliability", desc: "System controls that eliminate human errors in operations" },
              { icon: FileText, title: "Future-Proof Operations", desc: "Flexible system adapting to new business models and demands" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition border border-gray-100">
                <item.icon className="h-10 w-10 text-indigo-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Business Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Supports All Business Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "💊", title: "Pharmacy & Drug Stores", desc: "Medicine tracking, expiry management, prescription handling" },
              { icon: "🛒", title: "Grocery & Supermarkets", desc: "Perishable goods, bulk items, weight-based inventory" },
              { icon: "🏢", title: "Real Estate Agencies", desc: "Property listings, equipment inventory, office supplies" },
              { icon: "💻", title: "Electronics & Computer Shops", desc: "Serialized items, warranty tracking, accessories" },
              { icon: "👕", title: "General Retail", desc: "Apparel, hardware, bookstore, stationery management" },
              { icon: "🏪", title: "Multi-Store Chains", desc: "Centralized inventory across multiple locations" },
              { icon: "📦", title: "Warehouse Operations", desc: "Bulk storage, bin management, third-party logistics" },
              { icon: "🏭", title: "Manufacturing", desc: "Raw materials, work-in-progress, finished goods tracking" },
            ].map((item, idx) => (
              <div key={idx} className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-lg p-6 hover:shadow-lg transition border border-indigo-100">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Core Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Core Features
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                title: "Inventory Tracking & Management",
                features: [
                  "Multi-tenant SaaS architecture with data isolation",
                  "Real-time stock monitoring across all business types",
                  "Multi-location inventory (warehouse, store, online)",
                  "Batch/Lot tracking for pharmacy and grocery",
                  "Serial number tracking for electronics",
                  "Expiry date management with automated alerts",
                  "Min/max stock level configuration",
                  "ABC analysis and categorization"
                ]
              },
              {
                title: "Product Master Management",
                features: [
                  "Flexible product attributes for all business types",
                  "Multiple units of measure (pcs, kg, liter, sq.ft)",
                  "Category and sub-category with inheritance",
                  "Barcode/QR code generation and scanning",
                  "Product variants (size, color, model)",
                  "Image and document management",
                  "Custom fields per product type"
                ]
              },
              {
                title: "Purchase & Receiving",
                features: [
                  "Purchase order creation and management",
                  "Goods receipt with batch/expiry capture",
                  "Supplier management and performance tracking",
                  "Return to supplier processing",
                  "Automated reordering based on stock levels",
                  "Purchase price history",
                  "Multi-currency support"
                ]
              },
              {
                title: "Sales & Distribution",
                features: [
                  "Point of Sale (POS) integration",
                  "Sales order processing",
                  "Invoice generation with tax calculations",
                  "Customer management with credit limits",
                  "Sales return and exchange handling",
                  "Delivery management for large items",
                  "Multi-channel sales support"
                ]
              },
              {
                title: "Stock Movement & Transfers",
                features: [
                  "Inter-store/warehouse transfers",
                  "Stock adjustment (write-off, damage, loss)",
                  "Physical stock counting and reconciliation",
                  "Consignment stock management",
                  "Assembly and disassembly (kitting)",
                  "Automated stock movement tracking",
                  "Audit trail for all movements"
                ]
              },
              {
                title: "Reporting & Analytics",
                features: [
                  "Inventory valuation reports",
                  "Stock aging analysis",
                  "Fast/slow moving item reports",
                  "Profit margin analysis",
                  "Supplier performance reports",
                  "Customer purchase patterns",
                  "Expiry and obsolescence reports",
                  "Custom report builder"
                ]
              },
              {
                title: "Integration Capabilities",
                features: [
                  "Accounting system integration (QuickBooks, Xero)",
                  "E-commerce platform connectivity",
                  "Payment gateway integration",
                  "Barcode scanner and label printer support",
                  "Mobile app for stock taking",
                  "Email/SMS notification system",
                  "REST API for custom integrations"
                ]
              },
              {
                title: "Security & Compliance",
                features: [
                  "Role-based access control",
                  "Multi-store access permissions",
                  "Audit trail of all transactions",
                  "Data backup and recovery",
                  "Multi-language support (English, Bengali)",
                  "GDPR compliance",
                  "SSL encryption and security updates"
                ]
              }
            ].map((section, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-indigo-600 mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Highlights */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Technical Excellence
          </h2>
          <div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-xl shadow-xl p-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <Globe className="h-12 w-12 mx-auto mb-3" />
                <h4 className="font-bold mb-2">Web-Based</h4>
                <p className="text-sm text-indigo-100">Responsive design with PWA support</p>
              </div>
              <div className="text-center">
                <Database className="h-12 w-12 mx-auto mb-3" />
                <h4 className="font-bold mb-2">MySQL</h4>
                <p className="text-sm text-indigo-100">Robust relational database</p>
              </div>
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-3" />
                <h4 className="font-bold mb-2">Secure</h4>
                <p className="text-sm text-indigo-100">SSL encryption & regular updates</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-3" />
                <h4 className="font-bold mb-2">Multi-Tenant</h4>
                <p className="text-sm text-indigo-100">SaaS architecture with data isolation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Support */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Bangladesh-Specific Features
          </h2>
          <div className="bg-green-50 rounded-lg p-8 border-2 border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-700">Bangladesh tax structures (VAT, TIN, BIN)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-700">Local measurement units (pcs, kg, bigha)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-700">Regional pricing variations</span>
                </li>
              </ul>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-700">BSTI & drug regulations compliance</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-700">Local payment methods (bKash, Nagad, Rocket)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-700">Bengali language interface option</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Inventory Management?
          </h2>
          <p className="text-xl mb-8 text-indigo-100">
            Join businesses that have eliminated inefficiencies and gained complete control over their inventory.
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-lg font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition shadow-lg"
          >
            {isAuthenticated ? "Go to Dashboard" : "Start Your Journey"}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Package className="h-8 w-8 text-indigo-400 mr-2" />
                  <h3 className="text-xl font-bold">UIMS</h3>
                </div>
                <p className="text-sm text-gray-400">Universal Inventory Management System</p>
              </div>
              <p className="text-gray-400">
                Empowering businesses with intelligent inventory management solutions.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Multi-Location Tracking</li>
                <li>Real-Time Analytics</li>
                <li>Automated Replenishment</li>
                <li>Multi-Tenant SaaS</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Bangladesh: +880 XXX XXXXX</li>
                <li>Email: support@universalims.com</li>
                <li>Multi-language Support</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} UIMS. All rights reserved. Mustafizur Rahman</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
