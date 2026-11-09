import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** center：桌面居中、移动端贴底；sheet：始终贴底并限制高度，适合 Bottom Sheet。 */
  variant?: 'center' | 'sheet';
  className?: string;
}

/** 移动端贴底、桌面居中的大尺寸模态容器，弹出带 200ms 过渡。 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'center',
  className,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        'tp-fade-in fixed inset-0 z-50 flex items-end justify-center',
        variant === 'center' && 'sm:items-center sm:p-6',
      )}
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 h-full w-full cursor-default bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'tp-surface tp-pop-in relative z-10 w-full rounded-t-card p-6',
          variant === 'sheet'
            ? 'max-h-[82vh] max-w-2xl overflow-y-auto'
            : 'max-w-lg sm:rounded-card',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {subtitle ? <p className="tp-muted mt-1 text-sm">{subtitle}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? (
          <div className="tp-border mt-5 flex justify-end gap-2 border-t pt-4">{footer}</div>
        ) : null}
      </section>
    </div>
  );
}
