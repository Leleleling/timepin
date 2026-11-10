import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDict } from '../../utils/i18n';
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

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 移动端贴底、桌面居中的模态容器，弹出带 200ms 过渡。 */
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
  const t = useDict();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    // 打开时把焦点移入弹层，关闭/卸载后还给用户原来的焦点。
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      // 焦点圈定在弹层内，避免 Tab 跑到被遮罩盖住的底层页面。
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // 锁住底层页面滚动，避免弹层内部滚动时背景一起滑动。
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'tp-fade-in fixed inset-0 z-50 flex items-end justify-center',
        variant === 'center' && 'sm:items-center sm:p-6',
      )}
    >
      {/* 遮罩只是点击区域：用非焦点元素，避免 Tab 停在一个没有意义的按钮上。 */}
      <div
        role="presentation"
        className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'tp-surface tp-pop-in relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-card p-0',
          variant === 'sheet' ? 'max-w-2xl' : 'max-w-lg sm:rounded-card',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {subtitle ? <p className="tp-muted mt-1 text-sm">{subtitle}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.action.close}
            onClick={onClose}
            className="h-9 w-9 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 只有内容区可滚动，标题与底部按钮始终固定在视口内。 */}
        <div className="tp-scroll mt-5 min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer ? (
          <div className="tp-border flex justify-end gap-2 border-t px-6 py-4">{footer}</div>
        ) : null}
      </section>
    </div>
  );
}
