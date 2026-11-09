import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-deep hover:shadow-lift active:scale-[0.98]',
  soft: 'bg-brand-soft text-brand-deep hover:bg-brand/20 dark:bg-brand/15 dark:text-brand-deep dark:hover:bg-brand/25',
  ghost: 'tp-muted hover:bg-black/5 hover:text-brand dark:hover:bg-white/10',
  outline: 'tp-border border tp-muted hover:border-brand/40 hover:text-brand hover:bg-brand/5',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  icon: 'h-10 w-10 p-0',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'tp-focus inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
