import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  /** 撤销等一次性动作；执行后 Toast 立即消失。 */
  action?: ToastAction;
  /** 毫秒；撤销类提示停留更久。 */
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  push: (input: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

const MAX_TOASTS = 3;

/** 全局轻量反馈队列；不持久化，刷新即清空。 */
export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (input) => {
    const id = crypto.randomUUID();
    const item: ToastItem = {
      id,
      message: input.message,
      tone: input.tone,
      action: input.action,
      duration: input.duration ?? (input.action ? 8000 : 4000),
    };
    set((state) => ({ items: [...state.items, item].slice(-MAX_TOASTS) }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));
