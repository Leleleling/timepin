import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'plain' | 'field';
}

const variantClass = {
  plain: 'border-none bg-transparent text-3xl font-semibold placeholder:font-normal',
  field: 'tp-surface tp-border h-11 border px-3 text-sm',
};

export function Input({ variant = 'field', className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'tp-focus w-full outline-none transition-all duration-200 placeholder:opacity-45',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
