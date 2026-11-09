import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface SwipeOptions {
  threshold?: number;
  maxOffset?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

export interface SwipeHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
}

interface SwipeOrigin {
  x: number;
  y: number;
  locked: boolean;
}

/**
 * 原生 Pointer 事件实现的左右滑手势，不引入任何第三方库。
 * 只有水平位移明显大于垂直位移时才接管，避免阻断页面纵向滚动与按钮点击。
 * 容器需要设置 touch-action: pan-y。
 */
export function useSwipe({
  threshold = 72,
  maxOffset = 116,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: SwipeOptions): { offset: number; handlers: SwipeHandlers } {
  const [offset, setOffset] = useState(0);
  const origin = useRef<SwipeOrigin | null>(null);
  // pointerup 可能与最后一次 pointermove 在同一批事件里到达，此时 render 还没刷新 state；
  // 用 ref 保存最新位移，保证快速滑动也能可靠判定方向。
  const liveOffset = useRef(0);

  const applyOffset = (value: number) => {
    liveOffset.current = value;
    setOffset(value);
  };

  const reset = () => {
    origin.current = null;
    liveOffset.current = 0;
    setOffset(0);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    origin.current = { x: event.clientX, y: event.clientY, locked: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = origin.current;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!start.locked) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        start.locked = true;
      } else {
        return;
      }
    }

    const bounded = Math.max(-maxOffset, Math.min(maxOffset, dx));
    applyOffset(bounded);
  };

  const onPointerUp = () => {
    const start = origin.current;
    const distance = liveOffset.current;
    if (start?.locked && Math.abs(distance) >= threshold) {
      if (distance > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    }
    reset();
  };

  return {
    offset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset },
  };
}
