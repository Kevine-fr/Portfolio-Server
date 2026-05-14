'use client';
import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function FieldWrapper({
  label, error, hint, children, required,
}: {
  label: string; error?: string; hint?: string;
  children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block font-mono text-xs uppercase tracking-widest text-goldDeep mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted mt-1 font-mono">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1 font-mono">⚠ {error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, required, ...props }, ref) {
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required}>
        <input ref={ref} className="input-gold" {...props} />
      </FieldWrapper>
    );
  },
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, required, rows = 4, ...props }, ref) {
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required}>
        <textarea ref={ref} rows={rows} className="input-gold resize-y" {...props} />
      </FieldWrapper>
    );
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, hint, required, options, ...props }, ref) {
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required}>
        <select ref={ref} className="input-gold" {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldWrapper>
    );
  },
);

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, hint, ...props }, ref) {
    return (
      <label className="flex items-start gap-3 cursor-pointer mb-4 group">
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-goldGlow cursor-pointer"
          {...props}
        />
        <span>
          <span className="block font-mono text-sm text-whiteHex group-hover:text-goldGlow transition-colors">
            {label}
          </span>
          {hint && <span className="block text-xs text-muted font-mono">{hint}</span>}
        </span>
      </label>
    );
  },
);
