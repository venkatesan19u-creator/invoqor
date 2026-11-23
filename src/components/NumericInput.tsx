import React, { useEffect, useRef, useState } from 'react';

interface NumericInputProps {
  id?: string;
  value: number;
  onChange: (nextValue: number) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  resetKey?: string;
}

function sanitizeNumericText(raw: string): string {
  // Keep digits and at most one decimal point
  let cleaned = raw.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '');
  }

  if (cleaned === '') return '';

  // Normalize leading dot (".5" -> "0.5")
  if (cleaned.startsWith('.')) {
    return `0${cleaned}`;
  }

  // Strip leading zeros while preserving "0" and "0.xxx"
  if (cleaned.includes('.')) {
    const [intPart, decPart] = cleaned.split('.');
    const strippedInt = intPart.replace(/^0+/, '') || '0';
    return `${strippedInt}.${decPart}`;
  }

  return cleaned.replace(/^0+(?=\d)/, '');
}

function formatInitialText(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '';
  return String(val);
}

export const NumericInput: React.FC<NumericInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '0',
  className = '',
  ariaLabel,
  resetKey,
}) => {
  const [text, setText] = useState<string>(() => formatInitialText(value));
  const lastEmittedRef = useRef<number>(Number.isFinite(value) ? value : 0);
  const lastResetKeyRef = useRef<string | undefined>(resetKey);

  useEffect(() => {
    const safeVal = Number.isFinite(value) ? value : 0;
    const keyChanged = resetKey !== lastResetKeyRef.current;

    if (keyChanged || safeVal !== lastEmittedRef.current) {
      lastResetKeyRef.current = resetKey;
      lastEmittedRef.current = safeVal;
      setText(formatInitialText(safeVal));
    }
  }, [value, resetKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericText(e.target.value);
    setText(sanitized);

    if (sanitized === '') {
      lastEmittedRef.current = 0;
      onChange(0);
      return;
    }

    const parsed = parseFloat(sanitized);
    const nextNum = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    lastEmittedRef.current = nextNum;
    onChange(nextNum);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
    />
  );
};
