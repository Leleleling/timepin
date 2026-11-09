import { describe, expect, it } from 'vitest';
import type { Task } from '../db/models';
import {
  assignQuadrantPatch,
  clearQuadrantPatch,
  groupByQuadrant,
  isBoardQuadrant,
  resolveQuadrant,
} from './board';

function task(patch: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: '准备季度复盘',
    startAt: 1_700_000_000_000,
    dueAt: null,
    importance: 3,
    urgencyScore: 4,
    status: 'todo',
    pinned: false,
    tags: [],
    subtasks: [],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...patch,
  };
}

describe('isBoardQuadrant', () => {
  it('只接受 1 到 4', () => {
    expect([1, 2, 3, 4].every(isBoardQuadrant)).toBe(true);
    expect([0, 5, '1', null, undefined, NaN].some(isBoardQuadrant)).toBe(false);
  });
});

describe('resolveQuadrant', () => {
  it('没有人工覆盖时回退到紧急度自动象限', () => {
    expect(resolveQuadrant(task(), 3.5)).toBe(1);
    expect(resolveQuadrant(task({ importance: 1, urgencyScore: 2 }), 3.5)).toBe(4);
    expect(resolveQuadrant(task({ importance: 3, urgencyScore: 2 }), 3.5)).toBe(2);
    expect(resolveQuadrant(task({ importance: 1, urgencyScore: 4 }), 3.5)).toBe(3);
  });

  it('人工覆盖优先于自动象限', () => {
    expect(resolveQuadrant(task({ boardQuadrant: 4 }), 3.5)).toBe(4);
    expect(resolveQuadrant(task({ boardQuadrant: 2, importance: 1 }), 3.5)).toBe(2);
  });

  it('非法覆盖值被忽略，不会抛出或污染分组', () => {
    const broken = task({ boardQuadrant: 9 as unknown as Task['boardQuadrant'] });
    expect(resolveQuadrant(broken, 3.5)).toBe(1);
  });
});

describe('assignQuadrantPatch / clearQuadrantPatch', () => {
  it('归类 patch 只携带象限字段，不改时间与重要度', () => {
    expect(assignQuadrantPatch(3)).toEqual({ boardQuadrant: 3 });
    expect(assignQuadrantPatch(9 as never)).toEqual({});
  });

  it('清除覆盖后重新回退到自动象限', () => {
    expect(clearQuadrantPatch()).toEqual({ boardQuadrant: undefined });
    const merged = task({ boardQuadrant: 4, ...clearQuadrantPatch() });
    expect(resolveQuadrant(merged, 3.5)).toBe(1);
  });
});

describe('groupByQuadrant', () => {
  it('排除回收站与归档，并按人工覆盖分组', () => {
    const grouped = groupByQuadrant(
      [
        task({ id: 'a', boardQuadrant: 4 }),
        task({ id: 'b' }),
        task({ id: 'c', status: 'trash' }),
        task({ id: 'd', status: 'archived', boardQuadrant: 2 }),
      ],
      3.5,
    );
    expect(grouped[1].map((item) => item.id)).toEqual(['b']);
    expect(grouped[4].map((item) => item.id)).toEqual(['a']);
    expect(grouped[2]).toHaveLength(0);
  });
});
