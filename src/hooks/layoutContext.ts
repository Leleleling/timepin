import { useOutletContext } from 'react-router-dom';
import type { NotifyState } from './useNotifications';
import type { PwaState } from './usePwa';

/** AppLayout 通过 Outlet context 下发的共享状态，避免重复注册 SW / 提醒调度。 */
export interface LayoutContextValue {
  pwa: PwaState;
  notify: NotifyState;
}

export function useLayoutContext(): LayoutContextValue {
  return useOutletContext<LayoutContextValue>();
}
