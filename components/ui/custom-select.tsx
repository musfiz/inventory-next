'use client';

import React from 'react';
import Select, { StylesConfig, ThemeConfig } from 'react-select';
import AsyncSelect from 'react-select/async';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  options?: SelectOption[];
  loadOptions?: (inputValue: string) => Promise<SelectOption[]>;
  placeholder?: string;
  className?: string;
  classNamePrefix?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  defaultOptions?: boolean | SelectOption[];
  isInvalid?: boolean;
  autoFocus?: boolean;
  isClearable?: boolean;
  formatOptionLabel?: (option: SelectOption, context: any) => React.ReactNode;
  /**
   * Compact variant that mirrors a native <select> styled by `inputCls()`
   * (text-xs, py-1 height, rounded, indigo focus ring, theme-aware).
   * Drive colors from the Tailwind `dark:` CSS variables scoped to `.rc-compact`,
   * so both the control and its dropdown stay correct in light & dark mode.
   */
  compact?: boolean;
}

const customStyles = (isInvalid?: boolean): StylesConfig<SelectOption, false> => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--tw-bg-gray-700)',
    borderColor: isInvalid
      ? 'rgb(239, 68, 68)' // red-500
      : state.isFocused
        ? 'rgb(99, 102, 241)' // indigo-500
        : 'rgb(209, 213, 219)', // border-gray-300
    borderWidth: '1px',
    borderRadius: '0.125rem', // rounded-sm to match tenant page
    boxShadow: state.isFocused ? '0 0 0 1px rgb(99, 102, 241)' : 'none',
    cursor: 'pointer',
    minHeight: '32px',
    height: '32px',
    '&:hover': {
      borderColor: isInvalid
        ? 'rgb(239, 68, 68)' // red-500
        : state.isFocused
          ? 'rgb(99, 102, 241)' // indigo-500
          : 'rgb(156, 163, 175)', // border-gray-400
    },
  }),
  valueContainer: provided => ({
    ...provided,
    height: '32px',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: '32px',
  }),
  singleValue: provided => ({
    ...provided,
    color: 'var(--tw-text-gray-100)',
    fontSize: '0.875rem', // text-sm to match other inputs
  }),
  placeholder: provided => ({
    ...provided,
    color: 'var(--tw-text-gray-400)',
    fontSize: '0.875rem', // text-sm to match other inputs
  }),
  menu: provided => ({
    ...provided,
    backgroundColor: '#f9fafb', // gray-50 - light gray background
    border: '1px solid rgb(209, 213, 219)', // border-gray-300
    borderRadius: '0.125rem', // rounded-sm
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    zIndex: 9999,
  }),
  menuPortal: provided => ({
    ...provided,
    zIndex: 99999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'rgb(99, 102, 241)'
      : state.isFocused
        ? '#e5e7eb' // gray-200 for hover/focus state
        : 'transparent', // transparent for default state on light background
    color: state.isSelected ? 'white' : '#374151', // gray-700 for better contrast on light background
    cursor: 'pointer',
    fontSize: '0.875rem', // text-sm to match other inputs
    padding: '8px 12px',
    '&:hover': {
      backgroundColor: state.isSelected ? 'rgb(99, 102, 241)' : '#e5e7eb', // gray-200
    },
  }),
  input: provided => ({
    ...provided,
    color: 'var(--tw-text-gray-100)',
    fontSize: '0.875rem', // text-sm to match other inputs
  }),
});

const customTheme: ThemeConfig = theme => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: 'rgb(99, 102, 241)',
    primary75: 'rgb(129, 140, 248)',
    primary50: 'rgb(165, 180, 252)',
    primary25: 'rgb(238, 242, 255)',
  },
});

/**
 * Compact styles that mirror the native <select> using `inputCls()`:
 *   text-xs | bg-white dark:bg-gray-700 | border-gray-300 dark:border-gray-600
 *   | rounded | focus:ring-1 focus:ring-indigo-500
 *
 * Colors are driven by CSS variables defined on `.rc-compact` (and `.dark .rc-compact`),
 * which lets light/dark theming be handled entirely in CSS — matching the native selects.
 */
const compactStyles = (isInvalid?: boolean): StylesConfig<SelectOption, false> => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--rc-control-bg, #ffffff)',
    borderColor: isInvalid
      ? 'var(--rc-invalid, #ef4444)'
      : state.isFocused
        ? 'var(--rc-focus, #6366f1)'
        : 'var(--rc-border, #d1d5db)',
    borderWidth: '1px',
    borderRadius: '0.25rem', // rounded
    boxShadow: state.isFocused ? '0 0 0 1px var(--rc-focus, #6366f1)' : 'none',
    cursor: 'pointer',
    minHeight: '28px',
    height: '28px', // py-1 (~4px top/bottom) + text-xs (~1rem line-height)
    '&:hover': {
      borderColor: isInvalid
        ? 'var(--rc-invalid, #ef4444)'
        : state.isFocused
          ? 'var(--rc-focus, #6366f1)'
          : 'var(--rc-border-hover, #9ca3af)',
    },
  }),
  valueContainer: provided => ({
    ...provided,
    height: '28px',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: '28px',
  }),
  singleValue: provided => ({
    ...provided,
    color: 'var(--rc-text, #111827)',
    fontSize: '0.75rem', // text-xs
  }),
  placeholder: provided => ({
    ...provided,
    color: 'var(--rc-placeholder, #9ca3af)',
    fontSize: '0.75rem', // text-xs
  }),
  menu: provided => ({
    ...provided,
    backgroundColor: 'var(--rc-menu-bg, #ffffff)',
    border: '1px solid var(--rc-border, #d1d5db)',
    borderRadius: '0.25rem', // rounded
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    zIndex: 9999,
  }),
  menuPortal: provided => ({
    ...provided,
    zIndex: 99999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'var(--rc-focus, #6366f1)'
      : state.isFocused
        ? 'var(--rc-option-focus, #f3f4f6)'
        : 'transparent',
    color: state.isSelected ? '#ffffff' : 'var(--rc-text, #111827)',
    cursor: 'pointer',
    fontSize: '0.75rem', // text-xs
    padding: '6px 10px',
    '&:hover': {
      backgroundColor: state.isSelected ? 'var(--rc-focus, #6366f1)' : 'var(--rc-option-focus, #f3f4f6)',
    },
  }),
  input: provided => ({
    ...provided,
    color: 'var(--rc-text, #111827)',
    fontSize: '0.75rem', // text-xs
  }),
  dropdownIndicator: provided => ({
    ...provided,
    color: 'var(--rc-placeholder, #9ca3af)',
    padding: '0 4px',
    '&:hover': { color: 'var(--rc-text, #111827)' },
  }),
  clearIndicator: provided => ({
    ...provided,
    color: 'var(--rc-placeholder, #9ca3af)',
    padding: '0 4px',
  }),
});

export default function CustomSelect({
  value,
  onChange,
  options,
  loadOptions,
  placeholder = 'Select...',
  className = 'text-sm',
  classNamePrefix = 'react-select',
  isDisabled = false,
  isLoading = false,
  defaultOptions = false,
  isInvalid = false,
  autoFocus = false,
  isClearable = false,
  compact = false,
  formatOptionLabel,
}: CustomSelectProps) {
  const styles = (compact ? compactStyles : customStyles)(isInvalid);

  // Use AsyncSelect if loadOptions is provided
  if (loadOptions) {
    return (
      <AsyncSelect
        value={value}
        onChange={onChange}
        loadOptions={loadOptions}
        defaultOptions={defaultOptions}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={compact ? `${className} rc-compact` : className}
        classNamePrefix={compact ? 'rc' : classNamePrefix}
        styles={styles}
        theme={customTheme}
        isDisabled={isDisabled}
        isLoading={isLoading}
        cacheOptions
        defaultMenuIsOpen={false}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
        isClearable={isClearable}
        formatOptionLabel={formatOptionLabel}
      />
    );
  }

  // Use regular Select
  return (
    <Select
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      options={options || []}
      placeholder={placeholder}
      className={compact ? `${className} rc-compact` : className}
      classNamePrefix={compact ? 'rc' : classNamePrefix}
      styles={styles}
      theme={customTheme}
      isDisabled={isDisabled}
      isLoading={isLoading}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      isClearable={isClearable}
      formatOptionLabel={formatOptionLabel}
    />
  );
}
