export type Money = number;

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  parentId?: string | null;
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  productCount?: number;
}

export interface AttributeValue {
  name: string;
  value: string;
  hexCode?: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  sku: string;
  name: string;
  sellingPrice: Money;
  mrp?: Money;
  stock: number;
  attributes: Record<string, string>;
  image?: string;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  category: Category;
  brand?: Brand;
  images: string[];
  lqip?: string;
  variations: ProductVariation[];
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  isOnSale?: boolean;
  unit?: string;
  freeShipping?: boolean;
  estimatedDeliveryDays?: number;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CartItem {
  variationId: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  unitPrice: Money;
  mrp?: Money;
  quantity: number;
  attributes: Record<string, string>;
  stock: number;
  lineTotal: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  rate: Money;
  estimatedDays: string;
  isFree?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  isVerifiedPurchase: boolean;
  helpfulCount?: number;
  images?: string[];
  adminResponse?: string;
}

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  area?: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses?: Address[];
}

export interface Order {
  id: string;
  orderNumber: string;
  uuid: string;
  customerId: string;
  items: CartItem[];
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  shippingAddress: Address;
  shippingMethod: string;
  trackingNumber?: string;
  courier?: string;
  createdAt: string;
  timeline: { status: string; date: string; completed: boolean }[];
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  description: string;
  validUntil: string;
}

export interface StorefrontOfferSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
  accent: string;
  is_active: boolean;
  sort_order: number;
}
