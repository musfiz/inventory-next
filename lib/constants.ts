/**
 * Application Constants
 * Global constants used throughout the application
 */

export const BUSINESS_TYPES = [
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'electric', label: 'Electric' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'bookshop', label: 'Bookshop' },
  { value: 'departmental', label: 'Departmental Store' },
  { value: 'computer', label: 'Computer' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'other', label: 'Other' },
] as const;

export const SUBSCRIPTION_PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'basic', label: 'Basic' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export const SUBSCRIPTION_STATUSES = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const CURRENCIES = [
  { value: 'BDT', label: 'BDT (Bangladeshi Taka)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'GBP', label: 'GBP (British Pound)' },
  { value: 'INR', label: 'INR (Indian Rupee)' },
] as const;

export const TIMEZONES = [
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (UTC+6)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
] as const;
