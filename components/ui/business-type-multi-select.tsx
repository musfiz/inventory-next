'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import { businessTypeService } from '@/services/businessTypeService';

interface Option {
  value: string;
  label: string;
}

interface BusinessTypeMultiSelectProps {
  value?: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
}

const customStyles = (isInvalid?: boolean) => ({
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: 'var(--tw-bg-gray-700)',
    borderColor: isInvalid
      ? 'rgb(239, 68, 68)'
      : state.isFocused
        ? 'rgb(99, 102, 241)'
        : 'rgb(209, 213, 219)',
    borderWidth: '1px',
    borderRadius: '0.125rem',
    boxShadow: state.isFocused ? '0 0 0 1px rgb(99, 102, 241)' : 'none',
    cursor: 'pointer',
    minHeight: '32px',
    '&:hover': {
      borderColor: isInvalid
        ? 'rgb(239, 68, 68)'
        : state.isFocused
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
    color: 'white',
    fontSize: '0.75rem',
    padding: '2px 6px',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: 'white',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgb(79, 82, 241)',
      color: 'white',
    },
  }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    minHeight: '32px',
  }),
  clearIndicator: (provided: any) => ({
    ...provided,
    padding: '4px',
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '4px',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: 'var(--tw-text-gray-400)',
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
  input: (provided: any) => ({
    ...provided,
    color: 'var(--tw-text-gray-100)',
    fontSize: '0.875rem',
  }),
});

const customTheme = (theme: any) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: 'rgb(99, 102, 241)',
    primary75: 'rgb(129, 140, 248)',
    primary50: 'rgb(165, 180, 252)',
    primary25: 'rgb(238, 242, 255)',
  },
});

const loadAllOptions = async (): Promise<Option[]> => {
  try {
    const types = await businessTypeService.getForDropdown();
    return (types || []).map((t: any) => ({ value: String(t.id), label: t.name }));
  } catch (err) {
    console.error('BusinessTypeMultiSelect load error', err);
    return [];
  }
};

export default function BusinessTypeMultiSelect({
  value,
  onChange,
  placeholder = 'Select business types',
  isDisabled = false,
  isInvalid = false,
}: BusinessTypeMultiSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    let mounted = true;
    loadAllOptions().then((opts) => {
      if (mounted) setOptions(opts);
    });
    return () => { mounted = false; };
  }, []);

  const selectedValues = options.filter((o) => value?.includes(Number(o.value)));

  return (
    <Select
      isMulti
      value={selectedValues}
      onChange={(newValue) => {
        const ids = (newValue as Option[] | null)?.map((o) => Number(o.value)) ?? [];
        onChange(ids);
      }}
      options={options}
      placeholder={placeholder}
      styles={customStyles(isInvalid)}
      theme={customTheme}
      isDisabled={isDisabled}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      noOptionsMessage={() => 'No business types found'}
    />
  );
}
