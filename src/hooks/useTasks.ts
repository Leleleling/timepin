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
import { addCalendarDays } from '../utils/taskForm';
import { createNextOccurrence } from '../utils/recurrence';
import { useDict } from '../utils/i18n';
import { useToastStore } from '../store/useToastStore';

const EMPTY_TASKS: Task[] = [];

export interface TaskPatch {
  id: string;
  patch: Partial<Task>;
}

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

/**
 * 统一管理任务的实时读取与写入；页面只消费返回值，不直接触碰 Dexie。
 * 所有写操作都经过 report：成功给可见反馈 + 可撤销动作，失败给可见错误，
 * 不再由各页面各自吞掉异常（B1 / U7 / U6）。
 */
export function useTasks() {
  const t = useDict();
  const pushToast = useToastStore((state) => state.push);

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

  /** 不含反馈的底层写入，供组合操作与撤销复用，避免嵌套提示重复弹出。 */
  const writeUpdate = useCallback(
    (id: string, patch: Partial<Task>): Promise<void> =>
      db.tasks
        .update(id, { ...patch, updatedAt: Date.now() })
        .then(() => undefined)
        .catch(rethrow('Unable to update task')),
    [],
  );

  const report = useCallback(
    (
      work: Promise<void>,
      success: string,
      scope: string,
      undo?: () => void,
    ): Promise<void> =>
      work
        .then(() => {
          pushToast({
            message: success,
            tone: 'success',
            action: undo ? { label: t.feedback.undo, run: undo } : undefined,
          });
        })
        .catch((error: unknown) => {
          console.error(`[timepin] ${scope}`, error);
          pushToast({ message: t.feedback.saveError, tone: 'error' });
          throw error;
        }),
    [pushToast, t],
  );

  const createTask = useCallback(
    (task: Task): Promise<void> =>
      report(
        db.tasks.put(task).then(() => undefined),
        t.feedback.saved,
        'Unable to create task',
      ),
    [report, t.feedback.saved],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>): Promise<void> =>
      report(writeUpdate(id, patch), t.feedback.saved, 'Unable to update task'),
    [report, writeUpdate, t.feedback.saved],
  );

  /** 完成周期任务时派生下一次实例；用 liveQuery 里的最新任务与当前紧急度曲线（U13）。 */
  const nextOccurrences = useCallback(
    (patches: TaskPatch[]): Task[] => {
      const source = tasks ?? EMPTY_TASKS;
      const profile = storedProfile ?? DEFAULT_URGENCY_PROFILE;
      const spawned: Task[] = [];
      for (const { id, patch } of patches) {
        if (patch.status !== 'done') continue;
        const original = source.find((item) => item.id === id);
        if (!original) continue;
        const next = createNextOccurrence(original, profile);
        if (next) spawned.push(next);
      }
      return spawned;
    },
    [tasks, storedProfile],
  );

  /** 批量写入放在单个 Dexie 事务里，要么全部成功要么全部回滚（U9 / U13）。 */
  const bulkUpdate = useCallback(
    (patches: TaskPatch[]): Promise<void> => {
      const spawned = nextOccurrences(patches);
      return report(
        db
          .transaction('rw', db.tasks, async () => {
            for (const { id, patch } of patches) {
              await db.tasks.update(id, { ...patch, updatedAt: Date.now() });
            }
            for (const item of spawned) await db.tasks.put(item);
          })
          .then(() => undefined),
        t.feedback.saved,
        'Unable to apply bulk update',
      );
    },
    [report, t.feedback.saved, nextOccurrences],
  );

  /** 以数据库中的最新状态为准切换完成，避免快速双击重复写 done（T9）。 */
  const completeTask = useCallback(
    (task: Task): Promise<void> =>
      db.tasks
        .get(task.id)
        .catch(fallback('Unable to read task before completion', undefined))
        .then((current) => {
          const from = current?.status ?? task.status;
          const next = from === 'done' ? 'todo' : 'done';
          // 周期任务在完成时派生下一次；写入与回滚都在单个事务里，避免产生孤儿实例（U13）。
          const spawned =
            next === 'done'
              ? nextOccurrences([{ id: task.id, patch: { status: next } }])
              : [];
          return report(
            db
              .transaction('rw', db.tasks, async () => {
                await db.tasks.update(task.id, {
                  status: next,
                  updatedAt: Date.now(),
                });
                for (const item of spawned) await db.tasks.put(item);
              })
              .then(() => undefined),
            t.feedback.saved,
            'Unable to complete task',
            () =>
              void db
                .transaction('rw', db.tasks, async () => {
                  await db.tasks.update(task.id, {
                    status: from,
                    updatedAt: Date.now(),
                  });
                  for (const item of spawned) await db.tasks.delete(item.id);
                })
                .catch(rethrow('Unable to undo task completion')),
          );
        }),
    [report, t.feedback.saved, nextOccurrences],
  );

  /** 勾选子任务：全部完成时自动完成主任务，取消勾选时把已完成的父任务退回待办（U14）。 */
  const setSubtaskDone = useCallback(
    (task: Task, subtaskId: string): Promise<void> => {
      const subtasks = task.subtasks.map((item) =>
        item.id === subtaskId ? { ...item, done: !item.done } : item,
      );
      const allDone = subtasks.length > 0 && subtasks.every((item) => item.done);
      const status = allDone ? 'done' : task.status === 'done' ? 'todo' : task.status;
      return report(
        writeUpdate(task.id, { subtasks, status }),
        t.feedback.saved,
        'Unable to update subtask',
      );
    },
    [report, writeUpdate, t.feedback.saved],
  );

  const togglePin = useCallback(
    (task: Task): Promise<void> =>
      report(
        writeUpdate(task.id, { pinned: !task.pinned }),
        t.feedback.saved,
        'Unable to toggle pin',
        () => void writeUpdate(task.id, { pinned: task.pinned }),
      ),
    [report, writeUpdate, t.feedback.saved],
  );

  /** 按日历日延后一天并同步重算紧急度；无截止日期的任务不提供该操作。 */
  const postponeTask = useCallback(
    (task: Task): Promise<void> => {
      if (typeof task.dueAt !== 'number') return Promise.resolve();
      const dueAt = addCalendarDays(task.dueAt, 1);
      const work = getUrgencyProfile().then((profile) =>
        writeUpdate(task.id, { dueAt, urgencyScore: calculateUrgency(dueAt, profile) }),
      );
      return report(
        work,
        t.feedback.postponed,
        'Unable to postpone task',
        () =>
          void writeUpdate(task.id, {
            dueAt: task.dueAt,
            urgencyScore: task.urgencyScore,
          }),
      );
    },
    [report, writeUpdate, t.feedback.postponed],
  );

  /** 软删：保留数据与导出完整性，同时记录原状态以便从回收站原样恢复。 */
  const softDelete = useCallback(
    (task: Task): Promise<void> =>
      report(
        writeUpdate(task.id, {
          status: 'trash',
          preTrashStatus: task.status,
        }),
        t.feedback.deleted,
        'Unable to delete task',
        () =>
          void writeUpdate(task.id, {
            status: task.status,
            preTrashStatus: undefined,
          }),
      ),
    [report, writeUpdate, t.feedback.deleted],
  );

  return {
    tasks: tasks ?? EMPTY_TASKS,
    settings: settings ?? DEFAULT_APP_SETTINGS,
    profile: storedProfile ?? DEFAULT_URGENCY_PROFILE,
    createTask,
    updateTask,
    bulkUpdate,
    completeTask,
    setSubtaskDone,
    togglePin,
    postponeTask,
    softDelete,
  };
}
