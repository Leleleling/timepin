import type { AppSettings, Task } from '../db/models';

export type Quadrant = 1 | 2 | 3 | 4;
/** 可切换的排序键；smart 为原有五级优先级（U18）。 */
export type SortKey = 'smart' | 'due' | 'importance' | 'created' | 'manual';

/**
 * 四象限划分（总纲 3.2）：
 * Q1 重要且紧急 / Q2 重要不紧急 / Q3 紧急不重要 / Q4 其余。
 * 阈值来自用户设置，默认 3.5；恰好等于阈值算「紧急」。
 */
export function quadrantOf(task: Task, threshold: number): Quadrant {
  const important = task.importance === 3;
  const urgent = task.urgencyScore >= threshold;
  if (important && urgent) return 1;
  if (important) return 2;
  if (urgent) return 3;
  return 4;
}

interface RankedTask {
  task: Task;
  done: boolean;
  pinned: boolean;
  overdue: boolean;
  quadrant: Quadrant;
  weighted: number;
  dueKey: number;
  createdAt: number;
  manualOrder: number;
}

/**
 * 首页排序的五级优先级：
 * 1. 置顶优先；
 * 2. 已过期且未完成优先；
 * 3. Q1 → Q2 → Q3 → Q4；
 * 4. 同象限按权重得分 (importance * w.importance + urgencyScore * w.urgency) 降序；
 * 5. 得分相同按 dueAt 升序，无截止日期排最后，最后用 createdAt 保证稳定。
 *
 * 比较器内不调用 Date.now()、不重复算分：先一次遍历 decorate，再单次排序。
 * 返回新数组，不修改入参。now 可注入以便固定时钟测试。
 */
export function sortTasks(
  tasks: Task[],
  settings: AppSettings,
  now: number = Date.now(),
  mode: SortKey = 'smart',
): Task[] {
  const reference = Number.isFinite(now) ? now : Date.now();
  const { importance: importanceWeight, urgency: urgencyWeight } = settings.weights;

  const ranked: RankedTask[] = tasks.map((task) => {
    const hasDue = typeof task.dueAt === 'number' && Number.isFinite(task.dueAt);
    const unfinished =
      task.status !== 'done' && task.status !== 'archived' && task.status !== 'trash';

    return {
      task,
      done: task.status === 'done',
      pinned: task.pinned === true,
      overdue: unfinished && hasDue && (task.dueAt as number) < reference,
      quadrant: quadrantOf(task, settings.urgencyThreshold),
      weighted: task.importance * importanceWeight + task.urgencyScore * urgencyWeight,
      dueKey: hasDue ? (task.dueAt as number) : Number.MAX_SAFE_INTEGER,
      createdAt: task.createdAt,
      manualOrder:
        typeof task.manualOrder === 'number' && Number.isFinite(task.manualOrder)
          ? task.manualOrder
          : Number.MAX_SAFE_INTEGER,
    };
  });

  ranked.sort((a, b) => {
    // 无论哪种排序键，已完成都沉底、置顶都优先，避免切换排序后已完成任务插到最前。
    const doneFirst = Number(a.done) - Number(b.done);
    if (doneFirst !== 0) return doneFirst;
    const pinnedFirst = Number(b.pinned) - Number(a.pinned);
    if (pinnedFirst !== 0) return pinnedFirst;

    if (mode === 'due') return a.dueKey - b.dueKey || a.createdAt - b.createdAt;
    if (mode === 'importance') {
      return b.weighted - a.weighted || a.dueKey - b.dueKey || a.createdAt - b.createdAt;
    }
    if (mode === 'created') return b.createdAt - a.createdAt || a.dueKey - b.dueKey;
    if (mode === 'manual') {
      return a.manualOrder - b.manualOrder || a.quadrant - b.quadrant || a.createdAt - b.createdAt;
    }
    return (
      // 同为置顶时按手动顺序；未设置顺序的任务退回原有的过期/象限规则。
      (a.pinned && b.pinned ? a.manualOrder - b.manualOrder : 0) ||
      Number(b.overdue) - Number(a.overdue) ||
      a.quadrant - b.quadrant ||
      b.weighted - a.weighted ||
      a.dueKey - b.dueKey ||
      a.createdAt - b.createdAt
    );
  });

  return ranked.map((entry) => entry.task);
}
