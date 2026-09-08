'use client';

import { useEffect, useState } from 'react';
import CustomSelect from './custom-select';
import { businessTypeService } from '@/services/businessTypeService';

type SelectOption = { value: string; label: string };

interface BusinessTypeSelectProps {
  value?: string | number | null;
  onChange: (businessTypeId: number | null) => void;
  onChangeDetail?: (detail: { id: number | null; name: string | null }) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isClearable?: boolean;
  className?: string;
  /** Use the compact variant (mirrors native <select> styles). */
  compact?: boolean;
}

export default function BusinessTypeSelect({ value, onChange, onChangeDetail, placeholder = 'Select business type', isDisabled = false, isInvalid = false, isClearable = true, className = 'w-full', compact = false }: BusinessTypeSelectProps) {
  const [defaultOptions, setDefaultOptions] = useState<SelectOption[]>([]);
  const [selected, setSelected] = useState<SelectOption | null>(null);

  const loadOptions = async (input: string) => {
    try {
      const types = await businessTypeService.getForDropdown({ search: input || undefined });
      const opts = (types || []).map((t) => ({ value: String(t.id), label: t.name }));
      if (!input && defaultOptions.length === 0) setDefaultOptions(opts);
      return opts;
    } catch (err) {
      console.error('BusinessTypeSelect loadOptions error', err);
      return [] as SelectOption[];
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const opts = await loadOptions('');
        if (!mounted) return;
        setDefaultOptions(opts);
        if (value) {
          const valueStr = String(value);
          const found = opts.find((o) => o.value === valueStr);
          if (found) setSelected(found);
          else {
            const id = parseInt(valueStr, 10);
            if (!Number.isNaN(id)) {
              const item = await businessTypeService.getById(id);
              if (!mounted || !item) return;
              const fallbackOption = { value: String(item.id), label: item.name };
              setSelected(fallbackOption);
              setDefaultOptions((prev) => {
                if (prev.some((o) => o.value === fallbackOption.value)) return prev;
                return [fallbackOption, ...prev];
              });
            } else {
              setSelected(null);
            }
          }
        } else {
          setSelected(null);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, [value]);

  return (
    <CustomSelect
      value={selected}
      onChange={(opt) => {
        setSelected(opt);
        const id = opt ? parseInt(opt.value, 10) : null;
        const name = opt?.label ?? null;
        onChange(id);
        onChangeDetail?.({ id, name });
      }}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isClearable={isClearable}
      className={className}
      compact={compact}
    />
  );
}
