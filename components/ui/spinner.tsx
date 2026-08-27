import * as React from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
export type SpinnerTone = 'brand' | 'white';

/**
 * Loading color/spacing tokens (see globals.css `@theme`).
 * - `xs`: compact buttons and inline actions
 * - `sm`: table rows and controls
 * - `md`: section-level loading
 * - `lg`: full-page loading
 */
const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'h-3.5 w-3.5 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-16 w-16 border-4',
};

const TONE_CLASSES: Record<SpinnerTone, string> = {
  brand: 'border-indigo-600 border-t-transparent',
  white: 'border-white border-t-transparent',
};

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  /** Color of the spinner ring. `brand` uses the project token; `white` for colored buttons. */
  tone?: SpinnerTone;
  /** Accessible label announced to assistive technology. */
  label?: string;
  /** Hide from assistive tech when a parent already announces status. */
  decorative?: boolean;
}

/**
 * Shared loading spinner. Uses the project `loading` color token
 * (brand-600, brand-400 in dark mode) and the global `animate-spin` keyframes.
 */
export default function Spinner({
  size = 'md',
  tone = 'brand',
  label = 'Loading',
  decorative = false,
  className = '',
  ...props
}: SpinnerProps) {
  const spinner = (
    <span
      aria-hidden="true"
      className={`block rounded-full animate-spin ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    />
  );

  if (decorative) {
    return (
      <span aria-hidden="true" className={`inline-flex items-center justify-center ${className}`} {...props}>
        {spinner}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
      {...props}
    >
      {spinner}
    </span>
  );
}
