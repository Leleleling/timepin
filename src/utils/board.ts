import type { BoardQuadrant, Task } from '../db/models';
import { quadrantOf, type Quadrant } from './sorting';

export type { BoardQuadrant } from '../db/models';

export const BOARD_QUADRANTS: readonly BoardQuadrant[] = [1, 2, 3, 4];

/** 只接受 1–4，其他值（含非法枚举、字符串）一律视为「没有人工覆盖」。 */
export function isBoardQuadrant(value: unknown): value is BoardQuadrant {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** 看板分组入口：人工归类优先，缺省时回退到紧急度自动象限。首页排序不调用它。 */
export function resolveQuadrant(task: Task, threshold: number): Quadrant {
  return isBoardQuadrant(task.boardQuadrant) ? task.boardQuadrant : quadrantOf(task, threshold);
}

export function assignQuadrantPatch(quadrant: BoardQuadrant): Partial<Task> {
  return isBoardQuadrant(quadrant) ? { boardQuadrant: quadrant } : {};
}

/** Dexie 的 update 无法删除键，写 undefined 即可让 resolveQuadrant 回退自动象限。 */
export function clearQuadrantPatch(): Partial<Task> {
  return { boardQuadrant: undefined };
}

export function groupByQuadrant(
  tasks: Task[],
  threshold: number,
): Record<Quadrant, Task[]> {
  const grouped: Record<Quadrant, Task[]> = { 1: [], 2: [], 3: [], 4: [] };
  tasks.forEach((task) => {
    if (task.status === 'trash' || task.status === 'archived') return;
    grouped[resolveQuadrant(task, threshold)].push(task);
  });
  // 与首页一致：每个象限里已完成任务都沉到底部（稳定排序，未完成任务保持原次序）。
  Object.values(grouped).forEach((list) =>
    list.sort(
      (a, b) => Number(a.status === 'done') - Number(b.status === 'done'),
    ),
  );
  return grouped;
}
