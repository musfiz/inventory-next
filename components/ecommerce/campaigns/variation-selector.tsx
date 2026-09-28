'use client';

import { useCallback } from 'react';
import AsyncSelect from 'react-select/async';
import type { SelectedVariation } from '@/types/ecommerce';
import productVariationService from '@/services/productVariationService';
import type { ProductVariation } from '@/types/api.types';
import { formatMoney } from '@/lib/utils/format';

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin */
function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
}

interface VariationSelectorProps {
  value: SelectedVariation[];
  onChange: (variations: SelectedVariation[]) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

interface SelectOption {
  value: string;
  label: string;
  productId: string;
  productName: string;
  variationName: string;
  sku: string;
  image?: string;
  sellingPrice: number;
}

/**
 * Map an API ProductVariation row into the flat shape deal forms submit.
 * Shared with the weekly-deals page so the search picker and the edit-form
 * hydration show identical product data.
 */
export function toSelectedVariation(v: ProductVariation): SelectedVariation {
  const p = v.product as any;
  return {
    product_variation_id: String(v.id),
    product_id: String(v.product_id ?? ''),
    product_name: p?.name ?? '',
    variation_name: v.name || v.sku,
    sku: v.sku,
    image_url: variationImage(v),
    selling_price: Number(v.selling_price ?? 0),
  };
}

function toOptions(variations: SelectedVariation[]): SelectOption[] {
  return variations.map(v => ({
    value: v.product_variation_id,
    label: v.variation_name || v.sku,
    productId: v.product_id,
    productName: v.product_name,
    variationName: v.variation_name,
    sku: v.sku,
    image: v.image_url,
    sellingPrice: v.selling_price,
  }));
}

function fromOptions(options: readonly SelectOption[]): SelectedVariation[] {
  return options.map(o => ({
    product_variation_id: o.value,
    product_id: o.productId,
    product_name: o.productName,
    variation_name: o.variationName,
    sku: o.sku,
    image_url: o.image,
    selling_price: o.sellingPrice,
  }));
}

/** react-select styles matching the existing ProductSelector theme */
const selectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: 'var(--tw-bg-gray-700)',
    borderColor: state.isFocused ? 'rgb(99, 102, 241)' : 'rgb(209, 213, 219)',
    borderWidth: '1px',
    borderRadius: '0.125rem',
    boxShadow: state.isFocused ? '0 0 0 1px rgb(99, 102, 241)' : 'none',
    cursor: 'pointer',
    minHeight: '32px',
    '&:hover': {
      borderColor: state.isFocused ? 'rgb(99, 102, 241)' : 'rgb(156, 163, 175)',
    },
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: 'rgb(99, 102, 241)',
    borderRadius: '0.125rem',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: '#fff',
    fontSize: '0.75rem',
    padding: '2px 4px',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    '&:hover': {
      color: '#fff',
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: 'var(--tw-text-gray-400)',
    fontSize: '0.875rem',
  }),
  input: (provided: any) => ({
    ...provided,
    color: 'var(--tw-text-gray-100)',
    fontSize: '0.875rem',
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: '#f9fafb',
    border: '1px solid rgb(209, 213, 219)',
    borderRadius: '0.125rem',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    zIndex: 9999,
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 99999,
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'rgb(99, 102, 241)'
      : state.isFocused
        ? '#e5e7eb'
        : 'transparent',
    color: state.isSelected ? 'white' : '#374151',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '8px 12px',
  }),
  noOptionsMessage: (provided: any) => ({
    ...provided,
    fontSize: '0.875rem',
    color: '#6b7280',
  }),
};

/**
 * First product image, sized for a small admin thumbnail. The API stores four
 * renditions (`file_url_thumb/medium/large/zoom`); medium is the right weight
 * for picker rows. Accepts the legacy `file_url` / `url` shapes as fallbacks.
 */
function variationImage(v: ProductVariation): string | undefined {
  const p = v.product as any;
  const images = p?.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return first;
    return (
      first?.file_url_medium ??
      first?.file_url_thumb ??
      first?.file_url_large ??
      first?.file_url ??
      first?.url
    );
  }
  return undefined;
}

/**
 * Async multi-select for product variations. Searches the existing
 * `/api/v1/product-variations` endpoint (which already matches sku, variation
 * name, product name and attribute values) and returns the rows needed to
 * attach them to a weekly deal.
 */
export default function VariationSelector({
  value,
  onChange,
  isDisabled = false,
  placeholder = 'Search and select product variations...',
}: VariationSelectorProps) {
  const loadOptions = useCallback(async (inputValue: string): Promise<SelectOption[]> => {
    if (!inputValue.trim()) return [];

    // The variations index returns a bare array under `data` (not a
    // `{ data, meta }` object), so normalize both shapes here.
    const res = await productVariationService.getVariations({
      search: inputValue,
      per_page: 20,
    });
    const list: ProductVariation[] = Array.isArray(res) ? res : (res?.data ?? []);

    return list.map((v: ProductVariation) => {
      const selected = toSelectedVariation(v);
      return {
        value: selected.product_variation_id,
        label: selected.variation_name || selected.sku,
        productId: selected.product_id,
        productName: selected.product_name,
        variationName: selected.variation_name,
        sku: selected.sku,
        image: selected.image_url,
        sellingPrice: selected.selling_price,
      };
    });
  }, []);

  const formatOptionLabel = (
    option: SelectOption,
    { context }: { context: 'menu' | 'value' },
  ) => {
    const thumb = resolveImageUrl(option.image);

    if (context === 'value') {
      return (
        <span className="flex items-center gap-1.5">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-4 w-4 rounded-sm bg-white/20 object-cover" />
          ) : null}
          <span>{option.productName || option.variationName}</span>
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-7 w-7 shrink-0 rounded-sm border border-gray-300 bg-white object-cover dark:border-gray-500"
          />
        ) : (
          <span className="h-7 w-7 shrink-0 rounded-sm bg-gray-200 dark:bg-gray-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{option.productName || option.variationName}</div>
          <div className="truncate text-xs opacity-70">
            {option.variationName}
            {option.sku ? ` · ${option.sku}` : ''}
          </div>
        </div>
        <span className="ml-auto shrink-0 text-xs font-semibold text-gray-700">
          {formatMoney(option.sellingPrice)}
        </span>
      </div>
    );
  };

  return (
    <AsyncSelect
      isMulti
      value={toOptions(value)}
      onChange={(newValue: readonly SelectOption[]) => onChange(fromOptions(newValue))}
      loadOptions={loadOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      cacheOptions
      styles={selectStyles}
      formatOptionLabel={formatOptionLabel}
      noOptionsMessage={({ inputValue }) =>
        inputValue.trim() ? 'No variations found' : 'Start typing to search variations...'
      }
      loadingMessage={() => 'Searching...'}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
    />
  );
}
