'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type IconButtonVariant = 'default' | 'primary' | 'danger';
type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required accessible name. Used for `aria-label` and the `title` tooltip. */
  label: string;
  /** The icon node (e.g. `<Edit className="w-4 h-4" />`). */
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  default: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
  primary: 'text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300',
  danger: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
};

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'p-1',
  md: 'p-2',
};

/**
 * Accessible icon-only button. Always carries an `aria-label` (and a matching
 * `title` tooltip) so screen-reader and keyboard users get an accessible name.
 * Prefer this over a bare `<button><Icon/></button>` for action buttons.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, variant = 'default', size = 'sm', className = '', title, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={title ?? label}
        className={`inline-flex items-center justify-center rounded cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
