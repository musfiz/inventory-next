'use client';

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
}: CustomSelectProps) {
  const styles = customStyles(isInvalid);

  // Use AsyncSelect if loadOptions is provided
  if (loadOptions) {
    return (
      <AsyncSelect
        value={value}
        onChange={onChange}
        loadOptions={loadOptions}
        defaultOptions={defaultOptions}
        placeholder={placeholder}
        className={className}
        classNamePrefix={classNamePrefix}
        styles={styles}
        theme={customTheme}
        isDisabled={isDisabled}
        isLoading={isLoading}
        cacheOptions
        defaultMenuIsOpen={false}
      />
    );
  }

  // Use regular Select
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options || []}
      placeholder={placeholder}
      className={className}
      classNamePrefix={classNamePrefix}
      styles={styles}
      theme={customTheme}
      isDisabled={isDisabled}
      isLoading={isLoading}
    />
  );
}
