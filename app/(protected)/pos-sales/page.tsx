'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
import Image from 'next/image';
import { notify } from '@/lib/notifications';
import { productService, customerService, commonService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import Swal from 'sweetalert2';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price?: number;
  image?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customer, setCustomer] = useState<Customer>({ name: 'Walk-in Customer' });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProducts();
    generateOrderNumber();
  }, []);

  useEffect(() => {
    // Filter products based on search and category
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  // ── Data Loading ────────────────────────────────────────────────────────────

  const loadProducts = async () => {
    try {
      const response: any = await productService.getProducts({ per_page: 100 });
      const productList = response?.data || [];
      setProducts(
        productList.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: parseFloat(p.price || 0),
          sale_price: p.sale_price ? parseFloat(p.sale_price) : undefined,
          image: p.image,
          stock: p.stock || 0,
          category: p.category?.name || 'Uncategorized',
          barcode: p.barcode,
        }))
      );
      setFilteredProducts(productList);
    } catch (error: any) {
      notify.error('Failed to load products');
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
    const price = product.sale_price || product.price;

    if (existingItem) {
      // Check stock
      if (product.stock && existingItem.quantity >= product.stock) {
        notify.warning(`Cannot add more. Only ${product.stock} in stock`);
        return;
      }
      updateCartItem(existingItem.id, { quantity: existingItem.quantity + 1 });
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product_name: product.name,
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
    notify.success(`${product.name} added to cart`, { duration: 1000 });
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
    notify.info('Printing receipt...', { duration: 2000 });
    // Implement thermal printer integration here
  };

  // ── Categories ──────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-1">
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
              onClick={() => notify.info('View held orders')}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Save className="w-4 h-4 inline mr-1" />
              Held Orders
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product List (40%) */}
        <div className="w-[40%] flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {/* Search Bar */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-800">
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
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Category Chips */}
          <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
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
                    className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Stock Badge */}
                    <div className="absolute top-2 right-2 z-10">
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
                    <div className="aspect-square mb-2 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="text-left">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.sku}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ৳{(product.sale_price || product.price).toFixed(2)}
                        </span>
                        <Plus className="w-4 h-4 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          </div>
        </div>

        {/* MIDDLE: Current Order (35%) */}
        <div className="w-[35%] flex flex-col bg-white dark:bg-gray-900">
          {/* Cart Header */}
          <div className="px-3 py-1 border-b border-gray-200 dark:border-gray-800">
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
                onClick={() => notify.info('Customer search modal')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-16 h-16 mb-3" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Add products to start</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.product_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                      </div>
                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
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

          {/* Cart Actions */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <button
                onClick={() => notify.info('Discount modal')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Tag className="w-4 h-4" />
                Apply Discount
              </button>
              <button
                onClick={() => notify.info('Note modal')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <FileText className="w-4 h-4" />
                Add Note
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Order Summary & Payment (25%) */}
        <div className="w-[25%] flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Price Breakdown */}
            <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-800">
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
              <div className="mt-0.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="px-2 pb-1 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Payment Method
              </h3>
              <div className="grid grid-cols-2 gap-2">
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
                <div className="mt-3 space-y-2">
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

          {/* Action Buttons - Fixed at Bottom */}
          <div className="p-2 space-y-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={handlePayment}
              disabled={cart.length === 0 || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              {isLoading ? 'Processing...' : 'PAY NOW'}
            </button>

            <button
              onClick={holdOrder}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              HOLD
            </button>

            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 text-sm"
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
                onClick={() => notify.info('Email receipt')}
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
    </div>
  );
}
