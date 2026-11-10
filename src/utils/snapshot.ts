import type { BackupSnapshot } from './backup';

/** U29：本机 localStorage 环形快照，保留最近 5 份，可随时回滚。 */
const KEY = 'timepin.snapshots';
const LAST_KEY = 'timepin.snapshot.lastAt';
export const SNAPSHOT_LIMIT = 5;
export const AUTO_SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000;

export interface LocalSnapshot {
  id: string;
  createdAt: number;
  taskCount: number;
  data: BackupSnapshot;
}

export function listSnapshots(): LocalSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LocalSnapshot =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as LocalSnapshot).id === 'string' &&
        typeof (item as LocalSnapshot).createdAt === 'number' &&
        Array.isArray((item as LocalSnapshot).data?.tasks),
    );
  } catch {
    return [];
  }
}

function persist(list: LocalSnapshot[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function lastSnapshotAt(): number {
  try {
    const value = Number(localStorage.getItem(LAST_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** 写入失败（常见为 localStorage 配额）时丢掉最旧的几份再重试一次。 */
export function captureSnapshot(data: BackupSnapshot): LocalSnapshot | null {
  const entry: LocalSnapshot = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    taskCount: data.tasks.length,
    data,
  };
  const list = [entry, ...listSnapshots()].slice(0, SNAPSHOT_LIMIT);
  if (!persist(list)) {
    const reduced = list.slice(0, Math.max(1, list.length - 2));
    if (!persist(reduced)) {
      console.error('[timepin] Unable to persist local snapshot');
      return null;
    }
  }
  try {
    localStorage.setItem(LAST_KEY, String(entry.createdAt));
  } catch (error: unknown) {
    console.error('[timepin] Unable to record snapshot timestamp', error);
  }
  return entry;
}

export function getSnapshot(id: string): LocalSnapshot | null {
  return listSnapshots().find((item) => item.id === id) ?? null;
}

export function clearSnapshots(): void {
  persist([]);
}
