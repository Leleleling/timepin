import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并条件类名，并让后出现的 Tailwind 类覆盖前面的同类样式。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
