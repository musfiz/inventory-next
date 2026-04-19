'use client';

import { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

export default function CustomDatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'DD/MM/YYYY',
  minDate,
  maxDate,
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
          onClick={onClick}
          placeholder={placeholder}
          readOnly
          className={`w-full px-2 py-1.25 pr-8 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 cursor-pointer ${className || ''}`}
        />
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
