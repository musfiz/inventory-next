export interface PosCategory {
  id: number;
  name: string;
  image_url?: string;
}

export interface Product {
  id: string;
  product_name: string;
  variant_name: string;
  name: string;
  sku: string;
  price: number;
  selling_price: number;
  image?: string;
  images?: string[];
  stock?: number;
  category?: string;
  barcode?: string;
}

export interface CartItem {
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

export interface Customer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
}