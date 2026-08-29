'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Building2, Settings } from 'lucide-react';
import { notify } from '@/lib/notifications';
import { playPosBeep } from '@/lib/utils/pos-sound';
import posService from '@/services/posService';
import { posSessionService, posRegisterService, commonService } from '@/services';
import customerService from '@/services/customerService';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { usePermissions } from '@/hooks/use-permissions';
import CustomSelect from '@/components/ui/custom-select';
import Spinner from '@/components/ui/spinner';
import PaymentModal from '@/components/pos/PaymentModal';
import HeldOrdersDialog from '@/components/pos/HeldOrdersDialog';
import PosProductGrid from '@/components/pos/PosProductGrid';
import PosCartPanel from '@/components/pos/PosCartPanel';
import PosOrderSummary from '@/components/pos/PosOrderSummary';
import CustomerSelector from '@/components/pos/CustomerSelector';
import { PosOrderPrintMenu } from '@/components/print';
import type { PrintSettings } from '@/services/posService';
import type { Payment, PosOrderDetail } from '@/types/api.types';
import type { PosCategory, Product, CartItem, Customer } from '@/components/pos/pos-types';

// ─── Component ──────────────────────────────────────────────────────────

export default function POSSalesPage() {
  const authUser = useAuthStore(s => s.user);
  const { isSuperAdmin, isHydrated } = usePermissions();
  const { tenantSettings } = useTenantStore();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── State ───────────────────────────────────────────────────────────────
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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadProductsAbortRef = useRef<AbortController | null>(null);
  const customerSearchAbortRef = useRef<AbortController | null>(null);
  const hasMountedRef = useRef(false);

  // ── Customer Dialog State ───────────────────────────────────────────────
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [customerCreateLoading, setCustomerCreateLoading] = useState(false);
  const customerSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Session / Context State ─────────────────────────────────────────────
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeTenant, setActiveTenant] = useState<{ id: string | number; name: string } | null>(null);
  const [activeRegister, setActiveRegister] = useState<{ id: string | number; name: string } | null>(null);
  const [showContextDialog, setShowContextDialog] = useState(false);
  // ── Print State ──────────────────────────────────────────────────────────
  const [printOrder, setPrintOrder] = useState<PosOrderDetail | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [autoPrintPaperSize, setAutoPrintPaperSize] = useState<'80mm' | '58mm'>('80mm');
  // Super admin dialog state
  const [dialogTenant, setDialogTenant] = useState<any>(null);
  const [dialogRegister, setDialogRegister] = useState<any>(null);
  const [dialogSession, setDialogSession] = useState<any>(null);
  const [dialogTenantOptions, setDialogTenantOptions] = useState<any[]>([]);
  const [dialogRegisterOptions, setDialogRegisterOptions] = useState<any[]>([]);
  const [dialogSessionOptions, setDialogSessionOptions] = useState<any[]>([]);
  const [dialogRegisterLoading, setDialogRegisterLoading] = useState(false);
  const [dialogSessionLoading, setDialogSessionLoading] = useState(false);

  // ── Effects ─────────────────────────────────────────────────────────────

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

  // Session gate — runs after auth is hydrated
  useEffect(() => {
    if (!isHydrated) return;

    if (isSuperAdmin) {
      commonService.getTenantsForDropdown({})
        .then((list: any[]) => setDialogTenantOptions((list || []).map((t: any) => ({ value: t.id, label: t.business_name }))))
        .catch(() => { });

      const saved = (() => {
        try { return JSON.parse(localStorage.getItem('pos_context') || ''); } catch { return null; }
      })();

      if (saved?.tenantId && saved?.registerId) {
        posSessionService.current({ tenant_id: saved.tenantId, register_id: saved.registerId })
          .then((session: any) => {
            if (session && session.id) {
              setActiveSession(session);
              setActiveTenant({ id: saved.tenantId, name: saved.tenantName });
              setActiveRegister({ id: saved.registerId, name: saved.registerName });
              loadProducts(undefined, undefined, saved.tenantId);
            } else {
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

  // Reload categories when tenant context changes
  useEffect(() => {
    if (!activeTenant?.id) return;
    loadCategories(activeTenant.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant]);

  // Debounced server-side search
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

  // ── POS Keyboard Shortcuts + Barcode (keyboard-wedge) handling ──────────
  const actionsRef = useRef<{
    startNewSale: () => void;
    holdOrder: () => void;
    handlePayment: () => void;
    openCustomerDialog: () => void;
  }>({ startNewSale: () => {}, holdOrder: () => {}, handlePayment: () => {}, openCustomerDialog: () => {} });
  const scanHandlerRef = useRef<(code: string) => void>(() => {});
  const scanBufferRef = useRef('');
  const lastScanCharTimeRef = useRef(0);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    };

    const modalOpen =
      showPaymentModal || showCustomerDialog || showHeldOrdersDialog || showContextDialog;

    const onKeyDown = (e: KeyboardEvent) => {
      if (modalOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const editable = isEditable(e.target);
      const isSearchBox = e.target === searchInputRef.current;

      if (!editable) {
        switch (e.key) {
          case 'F1':
            e.preventDefault();
            actionsRef.current.startNewSale();
            return;
          case 'F2':
            e.preventDefault();
            actionsRef.current.holdOrder();
            return;
          case 'F3':
            e.preventDefault();
            actionsRef.current.handlePayment();
            return;
          case 'F4':
            e.preventDefault();
            actionsRef.current.openCustomerDialog();
            return;
          default:
            break;
        }
      }

      if (editable && !isSearchBox) {
        scanBufferRef.current = '';
        return;
      }
      const now = Date.now();
      if (e.key === 'Enter') {
        const code = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        if (code.length >= 3) {
          e.preventDefault();
          if (isSearchBox) {
            setSearchQuery('');
            searchInputRef.current?.focus();
          }
          scanHandlerRef.current(code);
        }
        return;
      }
      if (e.key.length === 1) {
        if (now - lastScanCharTimeRef.current > 50) scanBufferRef.current = '';
        scanBufferRef.current += e.key;
        lastScanCharTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPaymentModal, showCustomerDialog, showHeldOrdersDialog, showContextDialog]);

  // ── Data Loading ────────────────────────────────────────────────────────

  const loadCategories = async (tenantId?: string | number) => {
    try {
      const cats = await posService.getCategories(tenantId);
      setCategories(cats || []);
    } catch {
      // categories are non-critical, fail silently
    }
  };

  const loadProducts = async (categoryId?: number, search?: string, tenantId?: string | number) => {
    loadProductsAbortRef.current?.abort();
    const controller = new AbortController();
    loadProductsAbortRef.current = controller;
    const signal = controller.signal;
    setProductsLoading(true);
    setProductsError(null);
    try {
      const tid = tenantId ?? activeTenant?.id ?? (isSuperAdmin ? undefined : authUser?.tenant_id);
      const params: { per_page: number; category_id?: number; search?: string; tenant_id?: string | number } = { per_page: 100 };
      if (categoryId) params.category_id = categoryId;
      if (search && search.trim()) params.search = search.trim();
      if (tid) params.tenant_id = tid;
      const variations: any = await posService.getProducts(params, { signal });
      const productList: any[] = Array.isArray(variations)
        ? variations
        : Array.isArray(variations?.data)
          ? variations.data
          : [];
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      const getImageUrl = (path: string | undefined) => {
        if (!path) return undefined;
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return path;
        }
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${backendUrl}/${cleanPath}`;
      };

      const mapped = productList.map((v: any) => {
        const productName = v.product_name || v.product?.name || 'Unknown Product';
        const variantName = v.variant_name || v.name || 'Default';
        const sellingPrice = parseFloat(v.selling_price ?? 0);

        const firstImage = v.images && v.images.length > 0
          ? getImageUrl(v.images[0].file_url)
          : getImageUrl(v.product?.image);

        const allImages = (v.images || [])
          .map((img: any) => getImageUrl(img.file_url))
          .filter((url: any) => url);

        return {
          id: v.id,
          product_name: productName,
          variant_name: variantName,
          name: `${productName} - ${variantName}`,
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
      if (signal.aborted) return;
      const msg = error?.response?.data?.message || error?.message || 'Failed to load products';
      setProductsError(msg);
    } finally {
      setProductsLoading(false);
    }
  };

  // ── Customer Dialog Logic ───────────────────────────────────────────────

  const openCustomerDialog = () => {
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCreateForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowCustomerDialog(true);
    searchCustomerApi('');
  };

  const searchCustomerApi = async (q: string) => {
    customerSearchAbortRef.current?.abort();
    const controller = new AbortController();
    customerSearchAbortRef.current = controller;
    const signal = controller.signal;
    setCustomerSearchLoading(true);
    try {
      const results = await customerService.getCustomersDropdown({ search: q, per_page: 20 }, { signal });
      setCustomerResults(results || []);
    } catch {
      if (signal.aborted) return;
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

  // ── Super Admin Context Dialog Handlers ─────────────────────────────────

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
    setDialogTenant(null);
    setDialogRegister(null);
    setDialogSession(null);
    setDialogRegisterOptions([]);
    setDialogSessionOptions([]);
    setShowContextDialog(true);
    setCart([]);
  };

  const addToCart = async (product: Product) => {
    const Swal = (await import('sweetalert2')).default;
    const existingItem = cart.find(item => item.product_id === product.id);
    const price = product.selling_price;

    if (existingItem) {
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

  const clearCart = async () => {
    const Swal = (await import('sweetalert2')).default;
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

  // ── Calculations ────────────────────────────────────────────────────────

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const itemDiscounts = cart.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price * item.discount) / 100;
  }, 0);

  const orderDiscount = discountType === 'percent' ? (subtotal * discount) / 100 : discount;
  const totalDiscount = itemDiscounts + orderDiscount;

  const afterDiscount = subtotal - totalDiscount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const grandTotal = afterDiscount + taxAmount;

  const changeAmount = 0;

  // ── Actions ─────────────────────────────────────────────────────────────

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

  const handlePaymentSuccess = (payment: Payment, order: { id: string; uuid?: string; invoice_number?: string }, printSettings?: PrintSettings) => {
    playPosBeep('success');
    setShowPaymentModal(false);
    setCart([]);
    setCustomer({ name: 'Walk-in Customer' });
    setDiscount(0);
    setNote('');
    const rawSize = printSettings?.thermal_paper_size ?? tenantSettings?.thermal_paper_size ?? '80mm';
    const mappedSize = rawSize === '53mm' ? '58mm' : '80mm';
    setAutoPrintPaperSize(mappedSize as '80mm' | '58mm');
    void loadAndPrintOrder(order);
  };

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
  };

  const printReceipt = () => {
    if (printOrder) {
      setPrintOrder(null);
      return;
    }
    if (printLoading) return;
    notify.info('No recent order to reprint. Complete a payment to print a receipt.');
  };

  const startNewSale = () => {
    if (cart.length === 0) {
      notify.info('Cart is already empty');
      searchInputRef.current?.focus();
      return;
    }
    void clearCart();
  };

  const handleBarcodeScan = async (code: string) => {
    if (!activeSession?.id) {
      notify.error('No active session. Please select a session first.');
      playPosBeep('error');
      return;
    }
    try {
      const results: any[] = await posService.getProducts({
        search: code,
        tenant_id: activeTenant?.id,
      });
      if (!results || results.length === 0) {
        notify.error(`No product found for "${code}"`);
        playPosBeep('error');
        return;
      }
      const product =
        results.find((p: any) => p.barcode === code || p.sku === code) || results[0];
      await addToCart(product);
      playPosBeep('scan');
      notify.success(`Added ${product.product_name}`);
    } catch {
      notify.error('Scan failed. Please try again.');
      playPosBeep('error');
    }
  };

  // Keep the global listener's refs pointing at the latest closures.
  useEffect(() => {
    actionsRef.current = { startNewSale, holdOrder, handlePayment, openCustomerDialog };
    scanHandlerRef.current = handleBarcodeScan;
  });

  // ─── Render ─────────────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner size="md" className="mb-3" />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session <span className="text-red-500">*</span></label>
                <CustomSelect
                  key={`ses-${dialogRegister?.value ?? 'none'}`}
                  value={dialogSession}
                  onChange={(opt: any) => setDialogSession(opt)}
                  options={dialogSessionOptions}
                  isLoading={dialogSessionLoading}
                  placeholder={dialogRegister ? (dialogSessionLoading ? 'Loading sessions...' : 'Select register first') : 'Select register first'}
                  isDisabled={!dialogRegister || dialogSessionLoading}
                  className="text-sm"
                />
                {dialogRegister && !dialogSessionLoading && dialogSessionOptions.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No active sessions found for this register.{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/pos-orders')}
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
            </div>
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
              Held Orders
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - No Page Scroll */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <PosProductGrid
          products={products}
          filteredProducts={filteredProducts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          productsLoading={productsLoading}
          productsError={productsError}
          addToCart={addToCart}
          loadProducts={loadProducts}
          loadCategories={loadCategories}
          searchInputRef={searchInputRef}
        />

        <PosCartPanel
          cart={cart}
          customer={customer}
          openCustomerDialog={openCustomerDialog}
          updateCartItem={updateCartItem}
          removeCartItem={removeCartItem}
          clearCart={clearCart}
        />

        <PosOrderSummary
          cart={cart}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          taxAmount={taxAmount}
          grandTotal={grandTotal}
          discount={discount}
          setDiscount={setDiscount}
          discountType={discountType}
          setDiscountType={setDiscountType}
          taxRate={taxRate}
          setTaxRate={setTaxRate}
          note={note}
          setNote={setNote}
          showPaymentModal={showPaymentModal}
          setShowPaymentModal={setShowPaymentModal}
          handlePayment={handlePayment}
          holdOrder={holdOrder}
          clearCart={clearCart}
          printReceipt={printReceipt}
          printOrder={printOrder}
          setPrintOrder={setPrintOrder}
          printLoading={printLoading}
        />
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

      {printOrder && (
        <div style={{ display: 'none' }} aria-hidden="true">
          <PosOrderPrintMenu order={printOrder} autoPrint paperSize={autoPrintPaperSize} />
        </div>
      )}

      {printLoading && (
        <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-xs text-gray-600 dark:text-gray-300">Loading order…</span>
        </div>
      )}

      {/* Customer Search & Quick-Create Dialog */}
      <CustomerSelector
        open={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        handleCustomerSearchChange={handleCustomerSearchChange}
        customerResults={customerResults}
        customerSearchLoading={customerSearchLoading}
        selectCustomer={selectCustomer}
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
        newCustomerName={newCustomerName}
        setNewCustomerName={setNewCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerPhone={setNewCustomerPhone}
        handleCreateCustomer={handleCreateCustomer}
        customerCreateLoading={customerCreateLoading}
      />
    </div>
  );
}