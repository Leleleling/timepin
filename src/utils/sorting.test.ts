import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, type Task } from '../db/models';
import { quadrantOf, sortTasks } from './sorting';

const HOUR = 3_600_000;
const NOW = 1_700_000_000_000;
const settings = DEFAULT_APP_SETTINGS;

let sequence = 0;

function task(overrides: Partial<Task> = {}): Task {
  sequence += 1;
  return {
    id: `task-${sequence}`,
    title: `第 ${sequence} 件事`,
    startAt: NOW - HOUR,
    dueAt: NOW + 24 * HOUR,
    importance: 2,
    urgencyScore: 2,
    status: 'todo',
    pinned: false,
    tags: [],
    subtasks: [],
    createdAt: NOW - HOUR + sequence,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('quadrantOf', () => {
  it('按重要度与阈值划分四象限，等于阈值算紧急', () => {
    expect(quadrantOf(task({ importance: 3, urgencyScore: 3.5 }), 3.5)).toBe(1);
    expect(quadrantOf(task({ importance: 3, urgencyScore: 3.4 }), 3.5)).toBe(2);
    expect(quadrantOf(task({ importance: 2, urgencyScore: 4.5 }), 3.5)).toBe(3);
    expect(quadrantOf(task({ importance: 1, urgencyScore: 1.5 }), 3.5)).toBe(4);
  });
});

describe('sortTasks', () => {
  it('空数组返回新数组且不修改入参', () => {
    const input: Task[] = [];
    expect(sortTasks(input, settings, NOW)).toEqual([]);
  });

  it('置顶任务优先于所有其他任务', () => {
    const normal = task({ importance: 3, urgencyScore: 5 });
    const pinned = task({ importance: 1, urgencyScore: 1, pinned: true });
    const result = sortTasks([normal, pinned], settings, NOW);
    expect(result[0].id).toBe(pinned.id);
  });

  it('未完成且已过期的任务优先于未来的高象限任务', () => {
    const futureQ1 = task({ importance: 3, urgencyScore: 5, dueAt: NOW + 24 * HOUR });
    const overdue = task({ importance: 1, urgencyScore: 1, dueAt: NOW - 2 * HOUR });
    const result = sortTasks([futureQ1, overdue], settings, NOW);
    expect(result[0].id).toBe(overdue.id);
  });

  it('已完成或已归档的过期任务不享受过期优先', () => {
    const doneOverdue = task({
      importance: 1,
      urgencyScore: 1,
      status: 'done',
      dueAt: NOW - 2 * HOUR,
    });
    const futureQ1 = task({ importance: 3, urgencyScore: 5, dueAt: NOW + 24 * HOUR });
    const result = sortTasks([doneOverdue, futureQ1], settings, NOW);
    expect(result[0].id).toBe(futureQ1.id);
  });

  it('按 Q1 → Q2 → Q3 → Q4 排列，不受输入顺序影响', () => {
    const q4 = task({ importance: 1, urgencyScore: 2 });
    const q3 = task({ importance: 2, urgencyScore: 4 });
    const q2 = task({ importance: 3, urgencyScore: 2 });
    const q1 = task({ importance: 3, urgencyScore: 4 });
    const result = sortTasks([q4, q2, q3, q1], settings, NOW);
    expect(result.map((item) => item.id)).toEqual([q1.id, q2.id, q3.id, q4.id]);
  });

  it('同象限内按权重得分降序', () => {
    const lower = task({ importance: 3, urgencyScore: 3.6 });
    const higher = task({ importance: 3, urgencyScore: 4.5 });
    const result = sortTasks([lower, higher], settings, NOW);
    expect(result[0].id).toBe(higher.id);
  });

  it('权重可配置并改变同象限内的排序结果', () => {
    const urgentLowImportance = task({ importance: 1, urgencyScore: 3.4 });
    const calmMidImportance = task({ importance: 2, urgencyScore: 1.2 });
    const input = [calmMidImportance, urgentLowImportance];

    const byDefault = sortTasks(input, settings, NOW);
    expect(byDefault[0].id).toBe(urgentLowImportance.id);

    const importanceOnly = { ...settings, weights: { importance: 3, urgency: 0 } };
    const byImportance = sortTasks(input, importanceOnly, NOW);
    expect(byImportance[0].id).toBe(calmMidImportance.id);
  });

  it('得分相同时按 dueAt 升序，无截止日期排最后', () => {
    const late = task({ importance: 3, urgencyScore: 4, dueAt: NOW + 72 * HOUR });
    const noDue = task({ importance: 3, urgencyScore: 4, dueAt: null });
    const early = task({ importance: 3, urgencyScore: 4, dueAt: NOW + 6 * HOUR });
    const result = sortTasks([late, noDue, early], settings, NOW);
    expect(result.map((item) => item.id)).toEqual([early.id, late.id, noDue.id]);
  });

  it('返回的是新数组，原数组顺序不被打乱', () => {
    const a = task({ importance: 3, urgencyScore: 5 });
    const b = task({ importance: 1, urgencyScore: 1 });
    const input = [b, a];
    const result = sortTasks(input, settings, NOW);
    expect(result).not.toBe(input);
    expect(input[0].id).toBe(b.id);
  });
});
