'use client';

import { useEffect, useMemo, useState } from 'react';
import { commonService } from '@/services';
import { useTenantsDropdown } from '@/services/queries/useTenantsDropdown';
import CustomSelect from './custom-select';

interface TenantSelectProps {
  value?: string | null;
  onChange: (tenantId?: string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  compact?: boolean;
  isClearable?: boolean;
}

export default function TenantSelect({ value, onChange, placeholder = 'Select tenant', isDisabled = false, isInvalid = false, compact = false, isClearable = false }: TenantSelectProps) {
  // Cache-backed preload (Issue 5): survives React 18 StrictMode's
  // mount → unmount → remount, so the second mount hits the SWR cache
  // instead of firing a duplicate GET /api/v1/dropdown/tenant.
  // NOTE: no `= []` default — a fresh [] literal each render would be a new
  // reference and retrigger the effect below in a loop.
  const { data: preloadedTenants } = useTenantsDropdown();
  const [selected, setSelected] = useState<{ value: string; label: string } | null>(null);

  // Derived via useMemo — no setState-in-effect, so this can never feed a
  // "Maximum update depth exceeded" loop no matter how often it recomputes.
  const defaultOptions = useMemo(
    () =>
      (preloadedTenants ?? []).map((t) => ({
        value: String(t.id),
        label: t.business_name,
      })),
    [preloadedTenants]
  );

  // Loader for react-select. Kept live for search-as-you-type; the empty
  // preload path is served by the hook above, so StrictMode remounts and
  // remount-via-key-changes don't duplicate it.
  const loadOptions = async (input: string) => {
    try {
      const tenants = await commonService.getTenantsForDropdown({ search: input });
      const opts = (tenants || []).map((t) => ({ value: String(t.id), label: t.business_name }));
      return opts;
    } catch (err) {
      console.error('TenantSelect loadOptions error', err);
      return [] as { value: string; label: string }[];
    }
  };

  // Sync selected state when value prop changes (without re-fetching).
  // Only calls setSelected — never touches the options — so no loop.
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    const valueStr = String(value);
    const found = defaultOptions.find(o => String(o.value) === valueStr);
    if (found) setSelected(found);
  }, [value, defaultOptions]);

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
      compact={compact}
      isClearable={isClearable}
    />
  );
}
