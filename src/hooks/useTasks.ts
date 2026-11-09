import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getUrgencyProfile } from '../db';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_URGENCY_PROFILE,
  type AppSettings,
  type Task,
} from '../db/models';
import { calculateUrgency } from '../utils/urgency';

const EMPTY_TASKS: Task[] = [];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 读取失败时降级为安全默认值；写入失败时记录后继续抛出，供调用方给出反馈。 */
function fallback<T>(scope: string, value: T) {
  return (error: unknown): T => {
    console.error(`[timepin] ${scope}`, error);
    return value;
  };
}

function rethrow(scope: string) {
  return (error: unknown): never => {
    console.error(`[timepin] ${scope}`, error);
    throw error;
  };
}

/** 统一管理任务的实时读取与写入；页面只消费返回值，不直接触碰 Dexie。 */
export function useTasks() {
  const tasks = useLiveQuery(
    () => db.tasks.toArray().catch(fallback('Unable to load tasks', EMPTY_TASKS)),
    [],
    EMPTY_TASKS,
  );

  const settings = useLiveQuery(
    (): Promise<AppSettings> =>
      db.settings
        .get('default')
        .then((stored) => stored ?? DEFAULT_APP_SETTINGS)
        .catch(fallback('Unable to load settings', DEFAULT_APP_SETTINGS)),
    [],
    DEFAULT_APP_SETTINGS,
  );

  const storedProfile = useLiveQuery(
    () =>
      db.urgencyProfile
        .get('default')
        .catch(fallback('Unable to load urgency profile', undefined)),
    [],
    undefined,
  );

  const createTask = useCallback(
    (task: Task): Promise<void> =>
      db.tasks
        .put(task)
        .then(() => undefined)
        .catch(rethrow('Unable to create task')),
    [],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>): Promise<void> =>
      db.tasks
        .update(id, { ...patch, updatedAt: Date.now() })
        .then(() => undefined)
        .catch(rethrow('Unable to update task')),
    [],
  );

  const completeTask = useCallback(
    (task: Task): Promise<void> =>
      updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }),
    [updateTask],
  );

  const togglePin = useCallback(
    (task: Task): Promise<void> => updateTask(task.id, { pinned: !task.pinned }),
    [updateTask],
  );

  /** 延后一天并同步重算紧急度；无截止日期的任务不提供该操作。 */
  const postponeTask = useCallback(
    (task: Task): Promise<void> => {
      if (typeof task.dueAt !== 'number') return Promise.resolve();
      const dueAt = task.dueAt + DAY_MS;
      return getUrgencyProfile()
        .then((profile) =>
          updateTask(task.id, { dueAt, urgencyScore: calculateUrgency(dueAt, profile) }),
        )
        .catch(rethrow('Unable to postpone task'));
    },
    [updateTask],
  );

  /** 软删：保留数据与导出完整性，避免误操作不可恢复。 */
  const softDelete = useCallback(
    (task: Task): Promise<void> => updateTask(task.id, { status: 'trash' }),
    [updateTask],
  );

  return {
    tasks: tasks ?? EMPTY_TASKS,
    settings: settings ?? DEFAULT_APP_SETTINGS,
    profile: storedProfile ?? DEFAULT_URGENCY_PROFILE,
    createTask,
    updateTask,
    completeTask,
    togglePin,
    postponeTask,
    softDelete,
  };
}
