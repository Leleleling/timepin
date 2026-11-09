import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export type GateState = 'loading' | 'needsOnboarding' | 'done';

/**
 * 用 Dexie 实时查询判断问卷是否已完成。
 * 计数为 undefined 时表示仍在读取；保存问卷后 useLiveQuery 会自动重跑并解除拦截，
 * 不需要手动刷新页面或额外的全局事件。
 */
export function useOnboardingGate(): GateState {
  const count = useLiveQuery(
    () =>
      db.urgencyProfile.count().catch((error: unknown) => {
        console.error('[timepin] Unable to check onboarding state', error);
        return 1;
      }),
    [],
    undefined,
  );

  if (count === undefined) return 'loading';
  return count > 0 ? 'done' : 'needsOnboarding';
}
