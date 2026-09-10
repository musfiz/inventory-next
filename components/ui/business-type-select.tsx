'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { businessTypeService } from '@/services/businessTypeService';
import { useBusinessTypesDropdown } from '@/services/queries/useBusinessTypesDropdown';
import CustomSelect from './custom-select';

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
  // Cache-backed preload (Issue 5): survives React 18 StrictMode's
  // mount → unmount → remount, so the second mount hits the SWR cache
  // instead of firing a duplicate GET /api/v1/business-types/dropdown.
  // NOTE: no `= []` default — a fresh [] literal each render would be a new
  // reference and retrigger the effects below in a loop.
  const { data: preloadedBusinessTypes } = useBusinessTypesDropdown();
  // Items fetched individually when `value` isn't in the preload (e.g. list
  // still loading). Kept separate so the derived list below stays pure.
  const [extraOptions, setExtraOptions] = useState<SelectOption[]>([]);
  const fetchedFallbackIds = useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectOption | null>(null);

  // Derived via useMemo — no setState-in-effect, so this can never feed a
  // "Maximum update depth exceeded" loop no matter how often it recomputes.
  const defaultOptions = useMemo<SelectOption[]>(() => {
    const base = (preloadedBusinessTypes ?? []).map((t) => ({ value: String(t.id), label: t.name }));
    if (extraOptions.length === 0) return base;
    const seen = new Set(base.map((o) => o.value));
    return [...base, ...extraOptions.filter((o) => !seen.has(o.value))];
  }, [preloadedBusinessTypes, extraOptions]);

  // Kept live for search-as-you-type; the empty preload path is served by
  // the hook above, so StrictMode remounts don't duplicate it.
  const loadOptions = async (input: string) => {
    try {
      const types = await businessTypeService.getForDropdown({ search: input || undefined });
      const opts = (types || []).map((t) => ({ value: String(t.id), label: t.name }));
      return opts;
    } catch (err) {
      console.error('BusinessTypeSelect loadOptions error', err);
      return [] as SelectOption[];
    }
  };

  // Sync selected state when value prop changes (without re-fetching the list).
  // This effect only ever calls setSelected / setExtraOptions — neither of
  // which invalidates its own deps unconditionally, so it always terminates:
  // the fallback path is one-shot per id (fetchedFallbackIds guard).
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    const valueStr = String(value);
    const found = defaultOptions.find((o) => o.value === valueStr);
    if (found) {
      setSelected(found);
      return;
    }
    // Fallback: value not in the preloaded list (e.g. list still loading) —
    // fetch the single item rather than the whole list, exactly once per id.
    const id = parseInt(valueStr, 10);
    if (Number.isNaN(id) || fetchedFallbackIds.current.has(valueStr)) return;
    fetchedFallbackIds.current.add(valueStr);
    let cancelled = false;
    businessTypeService
      .getById(id)
      .then((item) => {
        if (cancelled || !item) return;
        const fallbackOption = { value: String(item.id), label: item.name };
        setExtraOptions((prev) =>
          prev.some((o) => o.value === fallbackOption.value) ? prev : [...prev, fallbackOption]
        );
        setSelected(fallbackOption);
      })
      .catch((err) => console.error('BusinessTypeSelect fallback fetch error', err));
    return () => {
      cancelled = true;
    };
  }, [value, defaultOptions]);

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
