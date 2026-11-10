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
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface SwipeOrigin {
  x: number;
  y: number;
  locked: boolean;
  /** 只跟踪第一根手指，避免多指触摸互相覆盖起点。 */
  pointerId: number;
}

function releaseCapture(element: HTMLElement, pointerId: number): void {
  try {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  } catch {
    /* 捕获已自动释放或环境不支持，忽略即可 */
  }
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
    // 位移取整后很多帧数值相同：相同值直接 bail out，避免整张卡片每帧重渲染。
    setOffset((previous) => (previous === value ? previous : value));
  };

  const reset = () => {
    origin.current = null;
    liveOffset.current = 0;
    setOffset(0);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    if (origin.current) return;
    origin.current = {
      x: event.clientX,
      y: event.clientY,
      locked: false,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = origin.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!start.locked) {
      // 抖动容差：未锁定前不拦截，保证卡片内的按钮点击/纵向滚动正常。
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // 纵向位移更大时交给浏览器原生滚动，不触发滑动。
      if (Math.abs(dy) > Math.abs(dx)) return;
      // 确定为横向滑动后再捕获指针：滑动过程中手指移出卡片也能持续收到事件。
      start.locked = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* 个别环境不支持 capture，忽略即可，仍可正常滑动 */
      }
    }

    const bounded = Math.max(-maxOffset, Math.min(maxOffset, dx));
    applyOffset(bounded);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (origin.current && origin.current.pointerId !== event.pointerId) return;
    releaseCapture(event.currentTarget, event.pointerId);
    const start = origin.current;
    const distance = liveOffset.current;
    if (start?.locked && Math.abs(distance) >= threshold) {
      if (distance > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    }
    reset();
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (origin.current && origin.current.pointerId !== event.pointerId) return;
    releaseCapture(event.currentTarget, event.pointerId);
    reset();
  };

  return {
    offset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
