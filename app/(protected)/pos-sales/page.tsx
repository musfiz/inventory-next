'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Tag,
  FileText,
  Printer,
  Mail,
  Save,
  XCircle,
  CreditCard,
  Wallet,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { notify } from '@/lib/notifications';
import { posService } from '@/services';
import customerService from '@/services/customerService';
import { useAuthStore } from '@/stores/auth-store';
import Swal from 'sweetalert2';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PosCategory {
  id: number;
  name: string;
  image_url?: string;
}

interface Product {
  id: string;
  product_name: string;
  variant_name: string;
  name: string; // Combined display name
  sku: string;
  price: number;
  selling_price: number;
  image?: string;
  images?: string[];
  stock?: number;
  category?: string;
  barcode?: string;
}

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
  stock?: number;
}

interface Customer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
}

type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'credit';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Wallet },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'credit', label: 'Credit', icon: FileText },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function POSSalesPage() {
  const authUser = useAuthStore(s => s.user);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── State ───────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: 'Walk-in Customer' });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Customer Dialog State ────────────────────────────────────────────────────
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [customerCreateLoading, setCustomerCreateLoading] = useState(false);
  const customerSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Hide parent scrollbar for full-screen POS
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.style.overflow = 'hidden';
      mainElement.style.padding = '0';
    }
    return () => {
      if (mainElement) {
        mainElement.style.overflow = '';
        mainElement.style.padding = '';
      }
    };
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
    generateOrderNumber();
  }, []);

  // Debounced server-side search: fires 400ms after the user stops typing
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const catId = selectedCategory === 'all' ? undefined : selectedCategory;
      loadProducts(catId, searchQuery);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ── Data Loading ────────────────────────────────────────────────────────────

  const loadCategories = async () => {
    try {
      const cats = await posService.getCategories();
      setCategories(cats || []);
    } catch {
      // categories are non-critical, fail silently
    }
  };

  const loadProducts = async (categoryId?: number, search?: string) => {
    setProductsLoading(true);
    try {
      const params: { per_page: number; category_id?: number; search?: string } = { per_page: 100 };
      if (categoryId) params.category_id = categoryId;
      if (search && search.trim()) params.search = search.trim();
      const variations: any[] = await posService.getProducts(params);
      const productList = variations || [];
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      
      // Helper function to construct full image URL
      const getImageUrl = (path: string | undefined) => {
        if (!path) return undefined;
        // If already a full URL, return as is
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return path;
        }
        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        // Construct full URL
        return `${backendUrl}/${cleanPath}`;
      };
      
      const mapped = productList.map((v: any) => {
        const productName = v.product?.name || 'Unknown Product';
        const variantName = v.name || 'Default';
        const sellingPrice = parseFloat(v.selling_price ?? 0);
        
        // Get first image URL
        const firstImage = v.images && v.images.length > 0 
          ? getImageUrl(v.images[0].file_url) 
          : getImageUrl(v.product?.image);
        
        // Get all image URLs
        const allImages = (v.images || [])
          .map((img: any) => getImageUrl(img.file_url))
          .filter((url: any) => url);
        
        return {
          id: v.id,
          product_name: productName,
          variant_name: variantName,
          name: `${productName} - ${variantName}`, // Combined for search
          sku: v.sku,
          price: parseFloat(v.selling_price ?? 0),
          selling_price: sellingPrice,
          image: firstImage,
          images: allImages,
          stock: v.stock?.quantity ?? 0,
          category: v.product?.category?.name || 'Uncategorized',
          barcode: v.barcodes?.[0]?.barcode ?? v.barcode,
        };
      });

      setProducts(mapped);
      setFilteredProducts(mapped);
    } catch (error: any) {
      notify.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  // ── Customer Dialog Logic ────────────────────────────────────────────────────

  const openCustomerDialog = () => {
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCreateForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowCustomerDialog(true);
    // Preload top customers
    searchCustomerApi('');
  };

  const searchCustomerApi = async (q: string) => {
    setCustomerSearchLoading(true);
    try {
      const results = await customerService.getCustomersDropdown({ search: q, per_page: 20 });
      setCustomerResults(results || []);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const handleCustomerSearchChange = (val: string) => {
    setCustomerSearch(val);
    if (customerSearchDebounceRef.current) clearTimeout(customerSearchDebounceRef.current);
    customerSearchDebounceRef.current = setTimeout(() => searchCustomerApi(val), 350);
  };

  const selectCustomer = (c: any) => {
    setCustomer({
      id: c.id,
      name: c.phone ? `${c.name} (${c.phone})` : c.name,
      phone: c.phone,
      email: c.email,
    });
    setShowCustomerDialog(false);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      notify.error('Customer name is required');
      return;
    }
    setCustomerCreateLoading(true);
    try {
      const res = await customerService.storeCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      const created = res?.data || res;
      selectCustomer(created);
      notify.success('Customer created and selected');
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to create customer');
    } finally {
      setCustomerCreateLoading(false);
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    setOrderNumber(`POS${date.getTime()}${random}`);
  };

  // ── Cart Operations ─────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    const price = product.selling_price;

    if (existingItem) {
      // Check stock
      if (product.stock && existingItem.quantity >= product.stock) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock Limit',
          text: `Cannot add more. Only ${product.stock} in stock`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      updateCartItem(existingItem.id, { quantity: existingItem.quantity + 1 });
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product_name: `${product.product_name} - ${product.variant_name}`,
        sku: product.sku,
        quantity: 1,
        unit_price: price,
        discount: 0,
        tax_rate: 0,
        line_total: price,
        stock: product.stock,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartItem = (itemId: string, updates: Partial<CartItem>) => {
    setCart(
      cart.map(item => {
        if (item.id !== itemId) return item;

        const updated = { ...item, ...updates };

        // Recalculate line total
        const subtotal = updated.quantity * updated.unit_price;
        const discountAmount = (subtotal * updated.discount) / 100;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = (afterDiscount * updated.tax_rate) / 100;
        updated.line_total = afterDiscount + taxAmount;

        return updated;
      })
    );
  };

  const removeCartItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    Swal.fire({
      title: 'Clear Cart?',
      text: 'This will remove all items from the cart',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, clear it',
    }).then(result => {
      if (result.isConfirmed) {
        setCart([]);
        setCustomer({ name: 'Walk-in Customer' });
        setDiscount(0);
        setNote('');
        setAmountTendered('');
        notify.success('Cart cleared');
      }
    });
  };

  // ── Calculations ────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const itemDiscounts = cart.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price * item.discount) / 100;
  }, 0);

  const orderDiscount = discountType === 'percent' ? (subtotal * discount) / 100 : discount;
  const totalDiscount = itemDiscounts + orderDiscount;

  const afterDiscount = subtotal - totalDiscount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const grandTotal = afterDiscount + taxAmount;

  const changeAmount = amountTendered ? parseFloat(amountTendered) - grandTotal : 0;

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handlePayment = async () => {
    if (cart.length === 0) {
      notify.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash' && (!amountTendered || parseFloat(amountTendered) < grandTotal)) {
      notify.error('Amount tendered is less than grand total');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      notify.success('Payment successful!');

      // Print receipt
      printReceipt();

      // Reset
      setCart([]);
      setCustomer({ name: 'Walk-in Customer' });
      setDiscount(0);
      setNote('');
      setAmountTendered('');
      generateOrderNumber();
    } catch (error: any) {
      notify.error('Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const holdOrder = () => {
    if (cart.length === 0) {
      notify.error('Cart is empty');
      return;
    }

    // Save to localStorage
    const heldOrders = JSON.parse(localStorage.getItem('heldOrders') || '[]');
    heldOrders.push({
      id: Date.now().toString(),
      orderNumber,
      cart,
      customer,
      discount,
      discountType,
      note,
      date: new Date().toISOString(),
    });
    localStorage.setItem('heldOrders', JSON.stringify(heldOrders));

    setCart([]);
    setCustomer({ name: 'Walk-in Customer' });
    setDiscount(0);
    setNote('');
    generateOrderNumber();

    notify.success('Order held successfully');
  };

  const printReceipt = () => {
    Swal.fire({
      icon: 'info',
      title: 'Printing Receipt',
      text: 'Sending to printer...',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
    });
    // Implement thermal printer integration here
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-white dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700 px-4 py-2 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">POS Sales</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Order #{orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                Swal.fire({
                  icon: 'info',
                  title: 'Held Orders',
                  text: 'View held orders feature coming soon',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 2000,
                });
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Save className="w-4 h-4 inline mr-1" />
              Held Orders
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - No Page Scroll */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: Product List (40%) - Independent Scroll */}
        <div className="w-[40%] flex flex-col border-r-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Search Bar - Fixed */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {productsLoading ? (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : searchQuery ? (
                <button
                  onClick={() => { setSearchQuery(''); const catId = selectedCategory === 'all' ? undefined : selectedCategory; loadProducts(catId); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="Clear search"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              ) : (
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Category Chips - Fixed */}
          <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
              {/* All button */}
              <button
                onClick={() => { setSelectedCategory('all'); loadProducts(undefined, searchQuery || undefined); }}
                className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); loadProducts(cat.id, searchQuery || undefined); }}
                  className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0 overscroll-contain scrollbar-thin">
            {productsLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 animate-pulse">
                    <div className="aspect-square mb-1.5 bg-gray-200 dark:bg-gray-700 rounded-md" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {filteredProducts.map(product => {
                const stockStatus =
                  !product.stock || product.stock === 0
                    ? 'out'
                    : product.stock < 10
                      ? 'low'
                      : 'in';

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={stockStatus === 'out'}
                    className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Stock Badge */}
                    <div className="absolute top-1 right-1 z-10">
                      {stockStatus === 'in' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="In Stock" />
                      )}
                      {stockStatus === 'low' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                          <AlertCircle className="w-3 h-3" />
                          Low
                        </div>
                      )}
                      {stockStatus === 'out' && (
                        <div className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                          Out
                        </div>
                      )}
                    </div>

                    {/* Product Image */}
                    <div className="aspect-square mb-1.5 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden relative">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Thumbnails (if multiple images) */}
                    {product.images && product.images.length > 1 && (
                      <div className="flex items-center gap-0.5 mb-1">
                        {product.images.slice(0, 4).map((img, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden border border-gray-200 dark:border-gray-700"
                          >
                            <img 
                              src={img} 
                              alt={`${product.product_name} ${i}`} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="text-left">
                      <h3 title={product.product_name } className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">
                        {product.product_name}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium line-clamp-1 mb-0.5">
                        {product.variant_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        SKU: {product.sku}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          ৳{product.selling_price.toFixed(2)}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>
                );
              })}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Package className="w-16 h-16 mb-3" />
                    <p className="text-sm">No products found</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* MIDDLE: Current Order (35%) - Independent Scroll */}
        <div className="w-[35%] flex flex-col bg-white dark:bg-gray-900 border-r-2 border-gray-300 dark:border-gray-700 overflow-hidden">
          {/* Cart Header - Fixed */}
          <div className="px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Current Order</h2>
                {cart.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                    {cart.length}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer */}
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{customer.name}</span>
              </div>
              <button
                onClick={openCustomerDialog}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change
              </button>
            </div>
          </div>

          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0 overscroll-contain scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-16 h-16 mb-3" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Add products to start</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.product_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                      </div>
                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-0.5 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateCartItem(item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e =>
                            updateCartItem(item.id, {
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-12 text-center py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded"
                        />
                        <button
                          onClick={() =>
                            updateCartItem(item.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          disabled={item.stock !== undefined && item.quantity >= item.stock}
                          className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ৳{item.unit_price.toFixed(2)} × {item.quantity}
                        </div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          ৳{item.line_total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Actions - Always Visible */}
          <div className="p-2 border-t-2 border-gray-300 dark:border-gray-700 space-y-1.5 flex-shrink-0 bg-white dark:bg-gray-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <button
                onClick={() => {
                  Swal.fire({
                    icon: 'info',
                    title: 'Add Note',
                    text: 'Note modal coming soon',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                  });
                }}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                Add Note
              </button>
            </div>
        </div>

        {/* RIGHT: Order Summary & Payment (25%) - Independent Scroll */}
        <div className="w-[25%] flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
          {/* Payment Details - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain scrollbar-thin">
            {/* Price Breakdown */}
            <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subtotal</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Discount</span>
                    <span>-৳{totalDiscount.toFixed(2)}</span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Tax ({taxRate}%)</span>
                    <span>৳{taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-1 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-gray-100">Grand Total</span>
                  <span className="text-blue-600 dark:text-blue-400">৳{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Discount Input */}
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Discount
                </label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as 'percent' | 'amount')}
                    className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded"
                  >
                    <option value="percent">%</option>
                    <option value="amount">৳</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    onFocus={e => (e.target as HTMLInputElement).select()}
                    className="flex-1 px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Tax Input */}
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  onFocus={e => (e.target as HTMLInputElement).select()}
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="px-2 py-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Payment Method
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                      className={`flex flex-col items-center justify-center p-1 rounded-md border-2 transition-colors ${paymentMethod === method.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <Icon className="w-5 h-5 mb-1 text-gray-700 dark:text-gray-300" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Payment */}
              {paymentMethod === 'cash' && (
                <div className="mt-2 space-y-2 pb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount Tendered
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountTendered}
                      onChange={e => setAmountTendered(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  {amountTendered && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Change:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ৳{Math.max(0, changeAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Always Visible at Bottom */}
          <div className="p-2 space-y-1.5 border-t-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <button
              onClick={handlePayment}
              disabled={cart.length === 0 || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              {isLoading ? 'Processing...' : 'PAY NOW'}
            </button>

            <button
              onClick={holdOrder}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm shadow-md"
            >
              <Save className="w-4 h-4" />
              HOLD
            </button>

            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm shadow-md"
            >
              <XCircle className="w-4 h-4" />
              VOID
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={printReceipt}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                onClick={() => {
                  Swal.fire({
                    icon: 'info',
                    title: 'Email Receipt',
                    text: 'Email feature coming soon',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                  });
                }}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Search & Quick-Create Dialog */}
      {showCustomerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCustomerDialog(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Select Customer</h2>
              <button onClick={() => setShowCustomerDialog(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by name or mobile no..."
                  value={customerSearch}
                  onChange={e => handleCustomerSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customerSearchLoading && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto px-4 min-h-0">
              {customerResults.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {customerResults.map((c: any) => (
                    <li key={c.id}>
                      <button
                        onClick={() => selectCustomer(c)}
                        className="w-full flex items-center gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-1 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                          {c.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</p>}
                          {c.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.email}</p>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !customerSearchLoading ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No customers found</p>
              ) : null}
            </div>

            {/* Quick Create Toggle */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Customer
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Quick Create Customer</p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Customer name *"
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateCustomer(); }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile no (optional)"
                    value={newCustomerPhone}
                    onChange={e => setNewCustomerPhone(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateCustomer(); }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCreateForm(false); setNewCustomerName(''); setNewCustomerPhone(''); }}
                      className="flex-1 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCustomer}
                      disabled={customerCreateLoading || !newCustomerName.trim()}
                      className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {customerCreateLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : <Plus className="w-4 h-4" />}
                      Save &amp; Select
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
