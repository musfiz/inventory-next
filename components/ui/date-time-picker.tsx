'use client';

import { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * DateTimePicker — wraps react-datepicker with time selection.
 * Returns value as ISO "YYYY-MM-DDTHH:mm" string (datetime-local compatible).
 */
export default function DateTimePicker({
  value,
  onChange,
  className = '',
  placeholder = 'DD/MM/YYYY HH:mm',
  minDate,
  maxDate,
}: DateTimePickerProps) {
  // Parse incoming ISO string to Date object
  const date = value ? new Date(value) : null;

  const handleChange = (d: Date | null) => {
    if (!d) { onChange(''); return; }
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins  = String(d.getMinutes()).padStart(2, '0');
    onChange(`${year}-${month}-${day}T${hours}:${mins}`);
  };

  interface CustomInputProps {
    value?: string;
    onClick?: (e?: any) => void;
    placeholder?: string;
  }

  const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
    ({ value: inputVal, onClick, placeholder: ph }, ref) => (
      <div className="relative w-full">
        <input
          ref={ref}
          value={inputVal}
          onClick={onClick}
          placeholder={ph}
          readOnly
          className="w-full px-2 py-1.5 pr-8 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:border-gray-600 cursor-pointer"
        />
        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    )
  );

  CustomInput.displayName = 'DateTimePickerInput';

  return (
    <div className={`datepicker-custom ${className}`}>
      <ReactDatePicker
        selected={date}
        onChange={handleChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd/MM/yyyy HH:mm"
        customInput={<CustomInput />}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText={placeholder}
        peekNextMonth
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
      />
      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100% !important;
        }
        .react-datepicker__time-container {
          width: 100px;
        }
      `}</style>
    </div>
  );
}
