'use client';

import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react';
import { useFormContext, get } from 'react-hook-form';

// Shared input styling — mirrors the existing admin form look (indigo focus ring,
// red border on error) so migrated forms stay visually consistent.
const BASE_INPUT =
  'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400';

function stateClass(hasError: boolean): string {
  return hasError
    ? 'border-red-500 focus:border-red-500'
    : 'border-gray-300 dark:border-gray-600';
}

export { BASE_INPUT };

/** Read a field's first error message from the surrounding form context. */
export function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext();
  const err = get(formState.errors, name) as { message?: unknown } | undefined;
  return typeof err?.message === 'string' ? err.message : undefined;
}

interface FieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control + inline error wrapper (one place that renders the red error text). */
export function Field({ label, htmlFor, required, error, className, children }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: string;
  label?: string;
  required?: boolean;
  registrationOptions?: Parameters<ReturnType<typeof useFormContext>['register']>[1];
}

export function TextField({ name, label, required, className, registrationOptions, ...rest }: TextFieldProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={name} required={required} error={error}>
      <input
        id={name}
        aria-invalid={!!error}
        {...register(name, registrationOptions)}
        className={`${BASE_INPUT} ${stateClass(!!error)} ${className ?? ''}`}
        {...rest}
      />
    </Field>
  );
}

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: string;
  label?: string;
  required?: boolean;
}

export function TextareaField({ name, label, required, className, ...rest }: TextareaFieldProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={name} required={required} error={error}>
      <textarea
        id={name}
        aria-invalid={!!error}
        {...register(name)}
        className={`${BASE_INPUT} ${stateClass(!!error)} ${className ?? ''}`}
        {...rest}
      />
    </Field>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: string;
  label?: string;
  required?: boolean;
  children: ReactNode;
}

export function SelectField({ name, label, required, className, children, ...rest }: SelectFieldProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={name} required={required} error={error}>
      <select
        id={name}
        aria-invalid={!!error}
        {...register(name)}
        className={`${BASE_INPUT} ${stateClass(!!error)} ${className ?? ''}`}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: string;
  label?: string;
}

export function CheckboxField({ name, label, className, ...rest }: CheckboxFieldProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className ?? ''}`}>
      <input
        type="checkbox"
        aria-invalid={!!error}
        {...register(name)}
        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        {...rest}
      />
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}
