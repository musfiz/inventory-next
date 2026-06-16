'use client';

import { useEffect, useState } from 'react';
import CustomSelect from './custom-select';
import { commonService } from '@/services';

interface TenantSelectProps {
  value?: string | null;
  onChange: (tenantId?: string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
}

export default function TenantSelect({ value, onChange, placeholder = 'Select tenant', isDisabled = false, isInvalid = false }: TenantSelectProps) {
  const [defaultOptions, setDefaultOptions] = useState<{ value: string; label: string }[]>([]);
  const [selected, setSelected] = useState<any>(null);

  // loader for react-select
  const loadOptions = async (input: string) => {
    try {
      const tenants = await commonService.getTenantsForDropdown({ search: input });
      const opts = (tenants || []).map((t: any) => ({ value: String(t.id), label: t.business_name }));
      if (!input && defaultOptions.length === 0) setDefaultOptions(opts);
      return opts;
    } catch (err) {
      console.error('TenantSelect loadOptions error', err);
      return [] as { value: string; label: string }[];
    }
  };

  // preload default options and selected label when value provided
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const opts = await loadOptions('');
        if (!mounted) return;
        setDefaultOptions(opts);
        if (value) {
          const valueStr = String(value);
          const found = opts.find(o => String(o.value) === valueStr);
          if (found) setSelected(found);
          else {
            // try to fetch by searching the id
            const more = await loadOptions('');
            const f = more.find(o => String(o.value) === valueStr);
            if (f) setSelected(f);
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
        onChange(opt?.value ? String(opt.value) : null);
      }}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    />
  );
}
