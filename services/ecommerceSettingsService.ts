import type { EcommerceSettings } from '@/types/ecommerce';

const defaultSettings: EcommerceSettings = {
  storefront_active: true,
  store_name: 'UIMS Store',
  store_tagline: 'Quality products, delivered fast',
  store_email: 'support@uims.shop',
  store_phone: '+880 1700-000000',
  store_address: 'House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh',
  currency_code: 'BDT',
  currency_symbol: '৳',
  free_shipping_threshold: 5000,
  default_delivery_days: 3,
  tax_rate: 5,
  meta_title: 'UIMS Store - Best Online Shopping in Bangladesh',
  meta_description: 'Shop the latest products at UIMS Store. From electronics to fashion, find everything you need at great prices.',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-12-15T10:30:00Z',
};

class EcommerceSettingsService {
  private settings: EcommerceSettings = { ...defaultSettings };

  async get(): Promise<EcommerceSettings> {
    await new Promise(r => setTimeout(r, 200));
    return { ...this.settings };
  }

  async update(data: Partial<EcommerceSettings>): Promise<EcommerceSettings> {
    await new Promise(r => setTimeout(r, 300));
    this.settings = {
      ...this.settings,
      ...data,
      updated_at: new Date().toISOString(),
    };
    return { ...this.settings };
  }

  async toggleStorefront(): Promise<boolean> {
    await new Promise(r => setTimeout(r, 200));
    this.settings.storefront_active = !this.settings.storefront_active;
    this.settings.updated_at = new Date().toISOString();
    return this.settings.storefront_active;
  }
}

const ecommerceSettingsService = new EcommerceSettingsService();
export default ecommerceSettingsService;
