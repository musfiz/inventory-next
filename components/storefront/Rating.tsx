
'use client';

import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showCount?: boolean;
}

export default function Rating({
  value,
  count,
  size = 'sm',
  showValue = true,
  showCount = true,
}: RatingProps) {
  const sizes = {
    sm: { star: 'h-3.5 w-3.5', text: 'text-xs' },
    md: { star: 'h-4 w-4', text: 'text-sm' },
    lg: { star: 'h-5 w-5', text: 'text-base' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => {
          const filled = value >= i;
          const half = !filled && value > i - 1;
          return (
            <Star
              key={i}
              className={`${s.star} ${
                filled || half
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
              }`}
            />
          );
        })}
      </div>
      {showValue && (
        <span className={`font-semibold text-gray-700 dark:text-gray-300 ${s.text}`}>
          {value.toFixed(1)}
        </span>
      )}
      {showCount && count !== undefined && (
        <span className={`text-gray-500 dark:text-gray-400 ${s.text}`}>
          ({count})
        </span>
      )}
    </div>
  );
}
