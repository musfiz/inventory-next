'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Tag,
  Printer,
  Mail,
  XCircle,
  Package,
  AlertCircle,
  CheckCircle,
  Building2,
  Settings,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import posService from '@/services/posService';
import { posSessionService, posRegisterService, commonService } from '@/services';
import customerService from '@/services/customerService';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import CustomSelect from '@/components/ui/custom-select';
import PaymentModal from '@/components/pos/PaymentModal';
import HeldOrdersDialog from '@/components/pos/HeldOrdersDialog';
import PosOrderPrintMenu from '@/components/invoices/pos/PosOrderPrintMenu';
import type { Payment, PosOrderDetail } from '@/types/api.types';
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function POSSalesPage() {
  const authUser = useAuthStore(s => s.user);
  const { isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── State ───────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: 'Walk-in Customer' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldOrdersDialog, setShowHeldOrdersDialog] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

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

  // ── Session / Context State ──────────────────────────────────────────────────
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeTenant, setActiveTenant] = useState<{ id: string | number; name: string } | null>(null);
  const [activeRegister, setActiveRegister] = useState<{ id: string | number; name: string } | null>(null);
  const [showContextDialog, setShowContextDialog] = useState(false);
  // ── Print State ──────────────────────────────────────────────────────────────
  // Holds the just-paid order so the industrial POS receipt can be printed.
  const [printOrder, setPrintOrder] = useState<PosOrderDetail | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  // Super admin dialog state
  const [dialogTenant, setDialogTenant] = useState<any>(null);
  const [dialogRegister, setDialogRegister] = useState<any>(null);
  const [dialogSession, setDialogSession] = useState<any>(null);
  const [dialogTenantOptions, setDialogTenantOptions] = useState<any[]>([]);
  const [dialogRegisterOptions, setDialogRegisterOptions] = useState<any[]>([]);
  const [dialogSessionOptions, setDialogSessionOptions] = useState<any[]>([]);
  const [dialogRegisterLoading, setDialogRegisterLoading] = useState(false);
  const [dialogSessionLoading, setDialogSessionLoading] = useState(false);

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
    generateOrderNumber();
    loadCategories();
  }, []);

  // Session gate — runs after auth is hydrated
  useEffect(() => {
    if (!isHydrated) return;

    if (isSuperAdmin) {
      // Always load tenant options for the dialog
      commonService.getTenantsForDropdown({})
        .then((list: any[]) => setDialogTenantOptions((list || []).map((t: any) => ({ value: t.id, label: t.business_name }))))
        .catch(() => { });

      // Try to restore last-used context from localStorage
      const saved = (() => {
        try { return JSON.parse(localStorage.getItem('pos_context') || ''); } catch { return null; }
      })();

      if (saved?.tenantId && saved?.registerId) {
        posSessionService.current({ tenant_id: saved.tenantId, register_id: saved.registerId })
          .then((session: any) => {
            if (session && session.id) {
              // Auto-confirm — skip the dialog entirely
              setActiveSession(session);
              setActiveTenant({ id: saved.tenantId, name: saved.tenantName });
              setActiveRegister({ id: saved.registerId, name: saved.registerName });
              loadProducts(undefined, undefined, saved.tenantId);
            } else {
              // Session expired/closed — pre-fill dialog with last tenant & register
              setDialogTenant({ value: saved.tenantId, label: saved.tenantName });
              setDialogRegister({ value: saved.registerId, label: saved.registerName });
              posRegisterService.dropdown(saved.tenantId)
                .then((list: any[]) => setDialogRegisterOptions((list || []).map((r: any) => ({ value: r.id, label: r.name }))))
                .catch(() => { });
              setShowContextDialog(true);
            }
          })
          .catch(() => setShowContextDialog(true))
          .finally(() => setSessionLoading(false));
      } else {
        setSessionLoading(false);
        setShowContextDialog(true);
      }
    } else {
      // Regular user: must have any open session (not restricted to today)
      posSessionService.current({})
        .then((session: any) => {
          if (session && session.id) {
            setActiveSession(session);
            setActiveTenant({ id: authUser?.tenant_id ?? '', name: '' });
            setActiveRegister(session.register ?? null);
            loadProducts(undefined, undefined, authUser?.tenant_id);
          } else {
            router.replace('/pos-session');
          }
        })
        .catch(() => router.replace('/pos-session'))
        .finally(() => setSessionLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isSuperAdmin]);

  // Debounced server-side search: fires 400ms after the user stops typing
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

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

  const loadProducts = async (categoryId?: number, search?: string, tenantId?: string | number) => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const tid = tenantId ?? activeTenant?.id ?? (isSuperAdmin ? undefined : authUser?.tenant_id);
      const params: { per_page: number; category_id?: number; search?: string; tenant_id?: string | number } = { per_page: 100 };
      if (categoryId) params.category_id = categoryId;
      if (search && search.trim()) params.search = search.trim();
      if (tid) params.tenant_id = tid;
      const variations: any = await posService.getProducts(params);
      const productList: any[] = Array.isArray(variations)
        ? variations
        : Array.isArray(variations?.data)
          ? variations.data
          : [];
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
        const productName = v.product_name || v.product?.name || 'Unknown Product';
        const variantName = v.variant_name || v.name || 'Default';
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
      const msg = error?.response?.data?.message || error?.message || 'Failed to load products';
      setProductsError(msg);
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
      const resolvedTenantId = activeTenant?.id || authUser?.tenant_id;
      const res = await customerService.storeCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        tenant_id: String(resolvedTenantId),
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

  // ── Super Admin Context Dialog Handlers ──────────────────────────────────────

  const handleDialogTenantChange = (opt: any) => {
    setDialogTenant(opt);
    setDialogRegister(null);
    setDialogSession(null);
    setDialogRegisterOptions([]);
    setDialogSessionOptions([]);
    if (opt?.value) {
      setDialogRegisterLoading(true);
      posRegisterService.dropdown(opt.value)
        .then((list: any[]) => setDialogRegisterOptions((list || []).map((r: any) => ({ value: r.id, label: r.name }))))
        .catch(() => { })
        .finally(() => setDialogRegisterLoading(false));
    }
  };

  const handleDialogRegisterChange = (opt: any) => {
    setDialogRegister(opt);
    setDialogSession(null);
    setDialogSessionOptions([]);
    if (opt?.value && dialogTenant?.value) {
      setDialogSessionLoading(true);
      posSessionService.list({ tenant_id: dialogTenant.value, register_id: opt.value, not_closed: 1, per_page: 20 })
        .then((res: any) => {
          const items: any[] = res?.data?.data ?? res?.data ?? [];
          setDialogSessionOptions(items.map((s: any) => ({
            value: s.id,
            label: `${s.session_number} (${s.register?.name ?? 'Register'})`,
            session: s,
          })));
        })
        .catch(() => { })
        .finally(() => setDialogSessionLoading(false));
    }
  };

  const handleConfirmContext = () => {
    if (!dialogTenant || !dialogRegister || !dialogSession) return;
    const session = dialogSession.session ?? { id: dialogSession.value };
    setActiveSession(session);
    setActiveTenant({ id: dialogTenant.value, name: dialogTenant.label });
    setActiveRegister({ id: dialogRegister.value, name: dialogRegister.label });
    setShowContextDialog(false);
    setCart([]);
    loadProducts(undefined, undefined, dialogTenant.value);
    // Persist context so it auto-restores on next page load / browser refresh
    try {
      localStorage.setItem('pos_context', JSON.stringify({
        tenantId: dialogTenant.value,
        tenantName: dialogTenant.label,
        registerId: dialogRegister.value,
        registerName: dialogRegister.label,
      }));
    } catch { }
  };

  const handleChangeContext = () => {
    // Reset all dialog selections so the user picks tenant → register → session from scratch
    setDialogTenant(null);
    setDialogRegister(null);
    setDialogSession(null);
    setDialogRegisterOptions([]);
    setDialogSessionOptions([]);
    setShowContextDialog(true);
    setCart([]);
  };

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

  const changeAmount = 0; // kept for any lingering references; actual change calc is in PaymentModal

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handlePayment = () => {
    if (cart.length === 0) {
      notify.error('Cart is empty');
      return;
    }
    if (!activeSession?.id) {
      notify.error('No active session. Please select a session first.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (payment: Payment, order: { id: string; uuid?: string; invoice_number?: string }) => {
    setShowPaymentModal(false);
    // Reset cart first so the till is ready for the next customer.
    setCart([]);
    setCustomer({ name: 'Walk-in Customer' });
    setDiscount(0);
    setNote('');
    generateOrderNumber();
    // Fire-and-forget — load the full order detail, then print.
    void loadAndPrintOrder(order);
  };

  /**
   * Fetch the full PosOrderDetail for the just-paid order, then mount
   * the PosOrderPrintMenu so the cashier can pick A4 / 80mm / 58mm and
   * print. If the order can't be loaded we fall back to a toast.
   */
  const loadAndPrintOrder = async (order: { id: string; uuid?: string; invoice_number?: string }) => {
    const id = order.uuid || order.id;
    if (!id) {
      notify.error('Could not load order for printing — missing id');
      return;
    }
    setPrintLoading(true);
    try {
      const detail = await posService.getPosOrder(String(id));
      setPrintOrder(detail);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Failed to load order for printing';
      notify.error(String(msg));
    } finally {
      setPrintLoading(false);
    }
  };

  const holdOrder = async () => {
    if (cart.length === 0) {
      notify.error('Cart is empty');
      return;
    }
    if (!activeSession?.id) {
      notify.error('No active session. Please select a session first.');
      return;
    }

    try {
      await posService.holdOrder({
        session_id: activeSession.id,
        register_id: activeRegister?.id ?? activeSession?.register_id,
        tenant_id: activeTenant?.id || undefined,
        customer_id: customer.id ? customer.id : undefined,
        customer_name: customer.name !== 'Walk-in Customer' ? customer.name : undefined,
        customer_phone: customer.phone,
        order_data: { cart, customer, discount, discountType, note },
      });

      setCart([]);
      setCustomer({ name: 'Walk-in Customer' });
      setDiscount(0);
      setNote('');
      generateOrderNumber();
      notify.success('Order held successfully');
    } catch {
      notify.error('Failed to hold order. Please try again.');
    }
  };

  const handleRestoreHeldOrder = (orderData: { cart: any[]; customer: any; discount: number; discountType: 'percent' | 'amount'; note: string }) => {
    setCart(orderData.cart ?? []);
    setCustomer(orderData.customer ?? { name: 'Walk-in Customer' });
    setDiscount(orderData.discount ?? 0);
    setDiscountType(orderData.discountType ?? 'amount');
    setNote(orderData.note ?? '');
    generateOrderNumber();
  };

  /**
   * Toolbar "Print" button — the receipt is shown automatically after a
   * successful payment, so this is only useful for re-printing the most
   * recent order. It hides the menu if a previous order is already on
   * screen, or shows a hint if there's nothing to reprint.
   */
  const printReceipt = () => {
    if (printOrder) {
      // Toggle — clicking the toolbar Print again hides the menu.
      setPrintOrder(null);
      return;
    }
    if (printLoading) return;
    notify.info('No recent order to reprint. Complete a payment to print a receipt.');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Session loading spinner
  if (sessionLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <svg className="w-10 h-10 text-blue-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Super Admin Context Dialog (non-dismissable until confirmed) */}
      {showContextDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Select POS Context</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose tenant, register, and session to proceed</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Tenant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={dialogTenant}
                  onChange={handleDialogTenantChange}
                  defaultOptions={dialogTenantOptions}
                  loadOptions={async (input: string) => {
                    const list = await commonService.getTenantsForDropdown({ search: input }).catch(() => []);
                    return (list || []).map((t: any) => ({ value: t.id, label: t.business_name }));
                  }}
                  placeholder="Select tenant"
                  className="text-sm"
                />
              </div>

              {/* Register */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Register <span className="text-red-500">*</span></label>
                <CustomSelect
                  key={`reg-${dialogTenant?.value ?? 'none'}`}
                  value={dialogRegister}
                  onChange={handleDialogRegisterChange}
                  defaultOptions={dialogRegisterOptions}
                  loadOptions={async (input: string) => {
                    if (!dialogTenant?.value) return [];
                    const list = await posRegisterService.dropdown(dialogTenant.value).catch(() => []);
                    return (list || []).map((r: any) => ({ value: r.id, label: r.name }));
                  }}
                  placeholder={dialogTenant ? (dialogRegisterLoading ? 'Loading...' : 'Select register') : 'Select tenant first'}
                  isDisabled={!dialogTenant}
                  className="text-sm"
                />
              </div>

              {/* Session */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session <span className="text-red-500">*</span></label>
                <CustomSelect
                  key={`ses-${dialogRegister?.value ?? 'none'}`}
                  value={dialogSession}
                  onChange={(opt: any) => setDialogSession(opt)}
                  options={dialogSessionOptions}
                  isLoading={dialogSessionLoading}
                  placeholder={dialogRegister ? (dialogSessionLoading ? 'Loading sessions...' : 'Select open session') : 'Select register first'}
                  isDisabled={!dialogRegister || dialogSessionLoading}
                  className="text-sm"
                />
                {dialogRegister && !dialogSessionLoading && dialogSessionOptions.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No active sessions found for this register.{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/pos-session')}
                      className="underline font-semibold hover:text-amber-700 dark:hover:text-amber-300"
                    >
                      Open a session →
                    </button>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // Close the context dialog and take the user back to
                  // the POS session list so they can pick a different
                  // tenant / register / session, or back out entirely.
                  setShowContextDialog(false);
                  router.push('/pos-orders');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmContext}
                disabled={!dialogTenant || !dialogRegister || !dialogSession}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                Start POS Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Fixed */}
      <div className="bg-white dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700 px-4 py-2 shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">POS Sales</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Order #{orderNumber}</p>
            </div>
            {/* Context info bar */}
            {activeSession && (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200 dark:border-gray-700">
                {isSuperAdmin && activeTenant && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">
                    <Building2 className="w-3 h-3" />{activeTenant.name}
                  </span>
                )}
                {activeRegister && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                    {activeRegister.name}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                  {activeSession.session_number ?? `Session #${activeSession.id}`}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && activeSession && (
              <button
                onClick={handleChangeContext}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Change
              </button>
            )}
            <button
              onClick={() => setShowHeldOrdersDialog(true)}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 border border-amber-500 dark:border-amber-400 rounded-md shadow-sm transition-colors"
            >
              <GiSave className="w-4 h-4 inline mr-1" />
              Held Orders
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - No Page Scroll */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: Product List (40%) - Independent Scroll */}
        <div className="w-[45%] flex flex-col border-r-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Search Bar - Fixed */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
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
          <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto shrink-0 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
              {/* All button */}
              <button
                onClick={() => { setSelectedCategory('all'); loadProducts(undefined, searchQuery || undefined); }}
                className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${selectedCategory === 'all'
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
                  className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat.id
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
            {productsError && !productsLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500 dark:text-red-400">
                <AlertCircle className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium mb-1">Failed to load products</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center px-4">{productsError}</p>
                <button
                  onClick={() => { const catId = selectedCategory === 'all' ? undefined : selectedCategory; loadProducts(catId, searchQuery || undefined); }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : productsLoading ? (
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
                          <h3 title={product.product_name} className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-0.5">
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
          <div className="px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
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
          <div className="flex-1 overflow-y-auto p-1 min-h-0 overscroll-contain scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-16 h-16 mb-3" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Add products to start</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {cart.map((item, idx) => (
                  <div
                    key={item.id}
                    className="px-1.5 py-1 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-1 flex items-start gap-1">
                        <span className="shrink-0 text-[10px] font-bold text-gray-400 dark:text-gray-500 w-4 pt-px">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                            {item.product_name}
                          </h4>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.sku}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-0.5 rounded shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() =>
                            updateCartItem(item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                        >
                          <Minus className="w-2.5 h-2.5" />
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
                          className="w-8 text-center py-0.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded"
                        />
                        <button
                          onClick={() =>
                            updateCartItem(item.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          disabled={item.stock !== undefined && item.quantity >= item.stock}
                          className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          ৳{item.unit_price.toFixed(2)} × {item.quantity}
                        </div>
                        <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          ৳{item.line_total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Order Summary & Payment (25%) - Independent Scroll */}
        <div className="w-[20%] flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
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

            {/* Order Notes */}
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Notes
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note to this order..."
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Action Buttons - Always Visible at Bottom */}
          <div className="p-2 space-y-1.5 border-t-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <button
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              PAY NOW
            </button>

            <button
              onClick={holdOrder}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-sm transition-colors disabled:opacity-50 text-sm shadow-md"
            >
              <GiSave className="w-4 h-4" />
              HOLD
            </button>

            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-sm transition-colors disabled:opacity-50 text-sm shadow-md"
            >
              <XCircle className="w-4 h-4" />
              VOID
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={printReceipt}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors disabled:opacity-50"
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
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-sm transition-colors disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        cart={cart}
        customer={customer}
        totals={{ subTotal: subtotal, discountAmount: totalDiscount, taxAmount: taxAmount, grandTotal }}
        sessionId={activeSession?.id ?? ''}
        registerId={activeRegister?.id ?? activeSession?.register_id ?? ''}
        tenantId={isSuperAdmin && activeTenant?.id ? activeTenant.id : undefined}
        discountType={discountType}
        discountValue={discount}
        notes={note || undefined}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setShowPaymentModal(false)}
      />

      {/* Held Orders Dialog */}
      <HeldOrdersDialog
        open={showHeldOrdersDialog}
        sessionId={activeSession?.id ?? ''}
        registerId={activeRegister?.id ?? activeSession?.register_id ?? ''}
        onClose={() => setShowHeldOrdersDialog(false)}
        onRestore={handleRestoreHeldOrder}
      />

      {/* ── Print Receipt Card ──────────────────────────────────────────
          Mounted after a successful payment so the cashier can pick
          A4 / 80mm / 58mm and print. Uses the industrial design from
          `PosOrderInvoiceThermal` / `PosOrderInvoiceA4` via PrintMenu.
          The print menu opens its own modal — the card is the entry
          point. */}
      {printOrder && (
        <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 w-72 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
                Order Complete
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {printOrder.invoice_number ?? `#${printOrder.id}`}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Grand total ৳{Number(printOrder.grand_total ?? 0).toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => setPrintOrder(null)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss print menu"
              title="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            Use the icons below to print A4 invoice or thermal receipt.
          </div>
          <div className="flex items-center gap-1 pt-1 border-t border-gray-200 dark:border-gray-700">
            <PosOrderPrintMenu order={printOrder} />
            <span className="text-[10px] text-gray-400 ml-1">A4 · 80mm · 58mm</span>
          </div>
        </div>
      )}

      {printLoading && (
        <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-xs text-gray-600 dark:text-gray-300">Loading order…</span>
        </div>
      )}

      {/* Customer Search & Quick-Create Dialog */}
      {showCustomerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCustomerDialog(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Select Customer</h2>
              <button onClick={() => setShowCustomerDialog(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-4 pt-3 pb-2 shrink-0">
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
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
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
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
      )
      }
    </div >
  );
}
