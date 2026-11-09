import type { TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

/** 与 Input 同源的多行输入组件，复用设计令牌与 200ms 过渡。 */
export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'tp-focus tp-surface tp-border w-full resize-y border p-3 text-sm outline-none transition-all duration-200 placeholder:opacity-45',
        className,
      )}
      {...props}
    />
  );
}
