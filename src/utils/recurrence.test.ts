import { describe, expect, it } from 'vitest';
import { DEFAULT_URGENCY_PROFILE, type Task } from '../db/models';
import { createNextOccurrence, isRecurrenceRule, nextOccurrence } from './recurrence';
import { taskToShareText, tasksToCsv, tasksToMarkdown } from './export';

const DUE = new Date(2026, 0, 15, 10, 0).getTime();

function task(patch: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: '季度回顾',
    startAt: DUE - 3_600_000,
    dueAt: DUE,
    importance: 3,
    urgencyScore: 4.2,
    status: 'todo',
    pinned: false,
    tags: ['工作'],
    subtasks: [{ id: 's1', title: '整理指标', done: true }],
    createdAt: DUE - 7_200_000,
    updatedAt: DUE - 7_200_000,
    ...patch,
  };
}

describe('recurrence', () => {
  it('只接受三种周期规则', () => {
    expect(isRecurrenceRule('daily')).toBe(true);
    expect(isRecurrenceRule('monthly')).toBe(true);
    expect(isRecurrenceRule('yearly')).toBe(false);
  });

  it('按本地日历推进每天与每周', () => {
    expect(new Date(nextOccurrence(DUE, 'daily')).getDate()).toBe(16);
    expect(new Date(nextOccurrence(DUE, 'weekly')).getDate()).toBe(22);
  });

  it('月末推进夹紧到目标月最后一天', () => {
    const jan31 = new Date(2026, 0, 31, 10, 0).getTime();
    const next = new Date(nextOccurrence(jan31, 'monthly'));
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it('完成时生成全新实例，子任务与状态重置、紧急度重算', () => {
    const original = task({ recurrence: 'weekly', status: 'done' });
    const next = createNextOccurrence(original, DEFAULT_URGENCY_PROFILE);
    expect(next).not.toBeNull();
    expect(next?.id).not.toBe(original.id);
    expect(next?.status).toBe('todo');
    expect(next?.subtasks[0].done).toBe(false);
    expect(next?.dueAt).toBeGreaterThan(original.dueAt as number);
    expect(typeof next?.urgencyScore).toBe('number');
  });

  it('没有周期规则或没有截止时间时不生成实例', () => {
    expect(createNextOccurrence(task(), DEFAULT_URGENCY_PROFILE)).toBeNull();
    expect(
      createNextOccurrence(
        task({ recurrence: 'daily', dueAt: null }),
        DEFAULT_URGENCY_PROFILE,
      ),
    ).toBeNull();
  });
});

describe('export', () => {
  it('Markdown 包含标题、勾选态与子任务', () => {
    const markdown = tasksToMarkdown([task()]);
    expect(markdown).toContain('季度回顾');
    expect(markdown).toContain('- [ ] 季度回顾');
    expect(markdown).toContain('[x] 整理指标');
  });

  it('CSV 转义引号并保留表头', () => {
    const csv = tasksToCsv([task({ title: '带"引号",和逗号' })]);
    expect(csv.startsWith('id,title,status')).toBe(true);
    expect(csv).toContain('""引号""');
  });

  it('单任务分享文本包含标签与子任务', () => {
    const text = taskToShareText(task());
    expect(text).toContain('季度回顾');
    expect(text).toContain('工作');
    expect(text).toContain('整理指标');
  });
});
