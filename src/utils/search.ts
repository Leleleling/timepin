import type { Task } from '../db/models';

/**
 * 轻量搜索工具（U19）。
 * 归一化：小写 + Unicode NFD 去变音符号 + 折叠空白，让带音调的拉丁字母也能命中。
 * 中文拼音全拼匹配需要额外词典（会显著增大 PWA 预缓存体积），因此这里保持零依赖，
 * 以「子串 + 归一化」覆盖标题、备注、标签与子任务标题。
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** 拼接任务的所有可搜索字段：标题、备注、标签、子任务标题。 */
export function searchableText(task: Task): string {
  return normalizeText(
    [task.title, task.content ?? '', ...task.tags, ...task.subtasks.map((item) => item.title)].join(
      ' ',
    ),
  );
}

export function taskMatches(task: Task, query: string): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;
  return searchableText(task).includes(needle);
}

export interface TextSegment {
  text: string;
  hit: boolean;
}

/** 把命中片段切成可渲染的段，供 <mark> 高亮；不会使用 innerHTML，天然防注入。 */
export function highlightSegments(text: string, query: string): TextSegment[] {
  const needle = normalizeText(query);
  if (!needle) return [{ text, hit: false }];
  const source = normalizeText(text);
  const index = source.indexOf(needle);
  if (index < 0) return [{ text, hit: false }];
  return [
    { text: text.slice(0, index), hit: false },
    { text: text.slice(index, index + needle.length), hit: true },
    { text: text.slice(index + needle.length), hit: false },
  ].filter((segment) => segment.text.length > 0);
}
