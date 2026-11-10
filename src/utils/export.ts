import type { Task } from '../db/models';

/** U29：纯本地导出与分享，全部为纯函数，便于单测且不引入任何依赖。 */

function formatDate(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return new Date(value).toLocaleString();
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function tasksToMarkdown(tasks: Task[]): string {
  const lines = ['# TimePin Tasks', ''];
  tasks.forEach((task) => {
    const mark = task.status === 'done' ? 'x' : ' ';
    const meta = [
      `status: ${task.status}`,
      `importance: ${task.importance}`,
      typeof task.dueAt === 'number' ? `due: ${formatDate(task.dueAt)}` : '',
      task.tags.length > 0 ? `tags: ${task.tags.join(', ')}` : '',
    ].filter(Boolean).join(' · ');
    lines.push(`- [${mark}] ${task.title} (${meta})`);
    task.subtasks.forEach((subtask) => {
      lines.push(`  - [${subtask.done ? 'x' : ' '}] ${subtask.title}`);
    });
    if (task.content?.trim()) {
      lines.push('', ...task.content.split('\n').map((line) => `  ${line}`));
    }
  });
  return `${lines.join('\n')}\n`;
}

export function tasksToCsv(tasks: Task[]): string {
  const header = [
    'id',
    'title',
    'status',
    'importance',
    'urgencyScore',
    'dueAt',
    'createdAt',
    'tags',
    'subtasks',
    'content',
  ].join(',');
  const rows = tasks.map((task) =>
    [
      task.id,
      task.title,
      task.status,
      String(task.importance),
      String(task.urgencyScore),
      typeof task.dueAt === 'number' ? String(task.dueAt) : '',
      String(task.createdAt),
      task.tags.join('|'),
      task.subtasks.map((item) => `${item.done ? '[x]' : '[ ]'} ${item.title}`).join('|'),
      task.content ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [header, ...rows].join('\r\n');
}

export function taskToShareText(task: Task): string {
  const lines = [
    `□ ${task.title}`,
    `状态：${task.status}`,
    `重要度：${task.importance}/3 · 紧急度：${task.urgencyScore}`,
    typeof task.dueAt === 'number' ? `截止：${formatDate(task.dueAt)}` : '',
    task.tags.length > 0 ? `标签：${task.tags.join(', ')}` : '',
  ].filter(Boolean);
  if (task.subtasks.length > 0) {
    lines.push('子任务：');
    task.subtasks.forEach((item) => lines.push(`  [${item.done ? 'x' : ' '}] ${item.title}`));
  }
  if (task.content?.trim()) lines.push('', '备注：', task.content);
  return `${lines.join('\n')}\n`;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
