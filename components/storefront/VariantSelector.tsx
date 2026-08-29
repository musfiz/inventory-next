'use client';

import { useMemo } from 'react';
import type { ProductVariation } from '@/types/storefront';

interface VariantSelectorProps {
  variations: ProductVariation[];
  value: string;
  onChange: (variationId: string) => void;
  size?: 'sm' | 'md';
}

const ACTIVE_CLASS =
  'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30 dark:bg-brand-950/30 text-gray-900 dark:text-gray-100';
const INACTIVE_CLASS =
  'border-gray-200 hover:border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300';

export default function VariantSelector({
  variations,
  value,
  onChange,
  size = 'md',
}: VariantSelectorProps) {
  const variationsByAttr = useMemo(() => {
    const map: Record<string, Record<string, ProductVariation>> = {};
    variations.forEach(v => {
      Object.entries(v.attributes).forEach(([key, val]) => {
        if (!map[key]) map[key] = {};
        if (!map[key][val]) map[key][val] = v;
      });
    });
    return map;
  }, [variations]);

  const selected = variations.find(v => v.id === value) ?? variations[0];

  const padClass = size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs';

  return (
    <div className="space-y-4">
      {Object.keys(variationsByAttr).map(attrKey => {
        const options = variationsByAttr[attrKey];
        const values = Object.keys(options);
        const isColor = attrKey.toLowerCase().includes('color');

        return (
          <div key={attrKey}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              {attrKey}:{' '}
              <span className="text-gray-900 dark:text-gray-100">
                {selected?.attributes[attrKey]}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const v = options[val];
                const active = selected?.id === v.id;
                const oos = v.stock <= 0;
                const cls = `${padClass} min-w-[44px] rounded-lg border font-semibold transition-all ${
                  active ? ACTIVE_CLASS : INACTIVE_CLASS
                } ${isColor ? '' : 'disabled:cursor-not-allowed disabled:opacity-40'}`;

                return (
                  <button
                    key={val}
                    type="button"
                    disabled={!isColor && oos}
                    onClick={() => onChange(v.id)}
                    className={cls}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
