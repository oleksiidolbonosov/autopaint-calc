import React, { useEffect, useRef, useState } from 'react';

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  fallbackValue?: number;
}

/**
 * Touch-friendly numeric/measurement input optimized for iOS Safari and desktop.
 * - Uses type="text" with inputMode="decimal" so iPhone shows the numeric keypad
 *   while reliably supporting select() / setSelectionRange() on focus.
 * - Automatically selects the entire value on focus so typing immediately replaces it.
 * - Accepts both "." and "," decimal separators and keeps intermediate typing states
 *   (like empty string or "0.") intact until blur.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onValueChange,
  min = 0,
  fallbackValue = 0,
  onFocus,
  onBlur,
  onMouseUp,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState(() => String(value));
  const justFocusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(String(value));
    }
  }, [value, isFocused]);

  const selectAllText = (el: HTMLInputElement) => {
    try {
      el.select();
      el.setSelectionRange(0, el.value.length);
    } catch {
      // Ignore selection errors on unsupported input states
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    justFocusedRef.current = true;
    const el = e.currentTarget;
    selectAllText(el);
    // Deferred tick ensures iOS Safari WebKit keeps the full text selected after tap-focus
    setTimeout(() => {
      if (document.activeElement === el) {
        selectAllText(el);
      }
    }, 0);
    onFocus?.(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (justFocusedRef.current) {
      e.preventDefault();
      justFocusedRef.current = false;
    }
    onMouseUp?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    justFocusedRef.current = false;
    const raw = e.target.value;
    // Allow digits, one dot or comma, and optional leading minus if min < 0
    const sanitized = raw.replace(/,/g, '.');
    if (sanitized !== '' && !/^-?\d*\.?\d*$/.test(sanitized)) {
      return;
    }
    setTextValue(raw);

    if (sanitized === '' || sanitized === '.' || sanitized === '-' || sanitized === '-.') {
      return;
    }

    const parsed = parseFloat(sanitized);
    if (Number.isFinite(parsed)) {
      const clamped = parsed < min ? min : parsed;
      onValueChange(clamped);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    justFocusedRef.current = false;
    const normalized = textValue.replace(/,/g, '.').trim();
    const parsed = parseFloat(normalized);
    const finalValue =
      Number.isFinite(parsed) ? (parsed < min ? min : parsed) : Math.max(min, fallbackValue);
    onValueChange(finalValue);
    setTextValue(String(finalValue));
    onBlur?.(e);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={isFocused ? textValue : String(value)}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onChange={handleChange}
      onBlur={handleBlur}
      {...rest}
    />
  );
};
