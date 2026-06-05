'use client';

import { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, X } from 'lucide-react';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

export default function CustomDatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'DD/MM/YYYY',
  minDate,
  maxDate,
  disabled = false,
}: DatePickerProps) {
  const date = value ? new Date(value + 'T00:00:00') : null;

  const handleChange = (d: Date | null) => {
    if (!d) {
      onChange('');
      return;
    }
    // Format as local date string (YYYY-MM-DD) to avoid timezone offset issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
  };

  interface CustomInputProps {
    value?: string;
    onClick?: (e?: any) => void;
    placeholder?: string;
    className?: string;
    onChange?: (e?: any) => void;
  }

  const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
    ({ value, onClick, placeholder, className }, ref) => (
      <div className="relative w-full">
        <input
          ref={ref}
          value={value}
          onClick={disabled ? undefined : onClick}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={`w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${value ? 'pr-14' : 'pr-8'} ${className || ''}`}
        />
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="absolute right-7 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
            tabIndex={-1}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    )
  );

  CustomInput.displayName = 'CustomDatePickerInput';

  return (
    <div className={`datepicker-custom ${className}`}>
      <ReactDatePicker
        selected={date}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        customInput={<CustomInput />}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText={placeholder}
        disabled={disabled}
        peekNextMonth
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        timeZone="Asia/Dhaka"
      />

      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}
