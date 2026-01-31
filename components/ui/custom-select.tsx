'use client';

import Select, { StylesConfig, ThemeConfig } from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  classNamePrefix?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
}

const customStyles: StylesConfig<SelectOption, false> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--tw-bg-gray-700)',
    borderColor: state.isFocused ? 'rgb(99, 102, 241)' : 'rgb(209, 213, 219)', // border-gray-300
    borderWidth: '1px',
    borderRadius: '0.25rem', // rounded-md
    boxShadow: state.isFocused ? '0 0 0 1px rgb(99, 102, 241)' : 'none',
    cursor: 'pointer',
    minHeight: '32px',
    height: '32px',
    '&:hover': {
      borderColor: state.isFocused ? 'rgb(99, 102, 241)' : 'rgb(156, 163, 175)', // border-gray-400
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    height: '32px',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: '32px',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--tw-text-gray-100)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--tw-text-gray-400)',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#f9fafb', // gray-50 - light gray background
    border: '1px solid rgb(209, 213, 219)', // border-gray-300
    borderRadius: '0.25rem',
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
    '&:hover': {
      backgroundColor: state.isSelected ? 'rgb(99, 102, 241)' : '#e5e7eb', // gray-200
    },
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--tw-text-gray-100)',
  }),
};

const customTheme: ThemeConfig = (theme) => ({
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
  placeholder = "Select...",
  className = "text-sm",
  classNamePrefix = "react-select",
  isDisabled = false,
  isLoading = false,
}: CustomSelectProps) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      classNamePrefix={classNamePrefix}
      styles={customStyles}
      theme={customTheme}
      isDisabled={isDisabled}
      isLoading={isLoading}
    />
  );
}