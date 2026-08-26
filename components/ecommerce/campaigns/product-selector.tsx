'use client';

import { useCallback, useRef } from 'react';
import AsyncSelect from 'react-select/async';
import type { ProductSearchResult } from '@/types/ecommerce';
import flashSaleCampaignService from '@/services/flashSaleCampaignService';

export interface SelectedProduct {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image?: string;
}

interface ProductSelectorProps {
  value: SelectedProduct[];
  onChange: (products: SelectedProduct[]) => void;
  isDisabled?: boolean;
  placeholder?: string;
  categoryId?: string;
}

interface SelectOption {
  value: string;
  label: string;
  sku?: string;
  image?: string;
}

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin */
function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:'))
    return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
}

/**
 * Converts SelectedProduct[] to react-select option format.
 */
function toOptions(products: SelectedProduct[]): SelectOption[] {
  return products.map(p => ({
    value: p.product_id,
    label: p.product_name,
    sku: p.product_sku,
    image: p.product_image,
  }));
}

/**
 * Converts react-select options back to SelectedProduct[].
 */
function fromOptions(options: readonly SelectOption[]): SelectedProduct[] {
  return options.map(o => ({
    product_id: o.value,
    product_name: o.label,
    product_sku: o.sku,
    product_image: o.image,
  }));
}

/** react-select styles that match the existing CustomSelect theme */
const selectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: 'var(--tw-bg-gray-700)',
    borderColor: state.isFocused
      ? 'rgb(99, 102, 241)'
      : 'rgb(209, 213, 219)',
    borderWidth: '1px',
    borderRadius: '0.125rem',
    boxShadow: state.isFocused ? '0 0 0 1px rgb(99, 102, 241)' : 'none',
    cursor: 'pointer',
    minHeight: '32px',
    '&:hover': {
      borderColor: state.isFocused
        ? 'rgb(99, 102, 241)'
        : 'rgb(156, 163, 175)',
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
    boxShadow:
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
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

export default function ProductSelector({
  value,
  onChange,
  isDisabled = false,
  placeholder = 'Search and select products...',
  categoryId,
}: ProductSelectorProps) {
  const selectRef = useRef<any>(null);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      // When a category is selected, load its products even without a search query
      if (!inputValue.trim() && !categoryId) return [];
      const results: ProductSearchResult[] =
        await flashSaleCampaignService.searchProducts(inputValue, categoryId);
      return results.map(p => ({
        value: p.id,
        label: p.name,
        sku: p.sku,
        image: p.image_url,
      }));
    },
    [categoryId]
  );

  const formatOptionLabel = (
    option: SelectOption,
    { context }: { context: 'menu' | 'value' }
  ) => {
    const thumb = resolveImageUrl(option.image);
    if (context === 'value') {
      return (
        <span className="flex items-center gap-1.5">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="w-4 h-4 rounded-sm object-cover bg-white/20"
            />
          ) : null}
          <span>{option.label}</span>
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
            className="w-7 h-7 rounded object-cover border border-gray-300 dark:border-gray-500 shrink-0"
          />
        ) : (
          <span className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 shrink-0" />
        )}
        <span className="text-sm">{option.label}</span>
        {option.sku && (
          <span className="text-xs text-gray-400 ml-auto font-mono">
            {option.sku}
          </span>
        )}
      </div>
    );
  };

  return (
    <AsyncSelect
      ref={selectRef}
      key={categoryId || '__all__'}
      isMulti
      value={toOptions(value)}
      onChange={(newValue: readonly SelectOption[]) =>
        onChange(fromOptions(newValue))
      }
      loadOptions={loadOptions}
      defaultOptions={!!categoryId}
      placeholder={placeholder}
      isDisabled={isDisabled}
      cacheOptions
      styles={selectStyles}
      formatOptionLabel={formatOptionLabel}
      noOptionsMessage={({ inputValue }) =>
        inputValue.trim()
          ? 'No products found'
          : categoryId
            ? 'No products available in this category'
            : 'Start typing to search products...'
      }
      loadingMessage={() => 'Searching...'}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
    />
  );
}
