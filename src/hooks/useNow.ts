import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;

/**
 * 按分钟对齐的共享时钟：页面常驻（PWA 常见）时也能跨分钟刷新，
 * 重新可见或获得焦点时立即校准。Today 与 Calendar 共用同一实现，避免各自写定时器。
 */
export function useNow(intervalMs: number = MINUTE_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer = 0;
    const tick = () => setNow(Date.now());

    const schedule = () => {
      // 对齐到下一个整分钟，避免每次挂载都产生不同相位的定时器。
      const delay = Math.max(1000, intervalMs - (Date.now() % intervalMs));
      timer = window.setTimeout(() => {
        tick();
        schedule();
      }, delay);
    };
    schedule();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', tick);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
