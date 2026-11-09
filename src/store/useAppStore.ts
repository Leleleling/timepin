import { create } from 'zustand';
import { db, ensureDefaults } from '../db';
import type { AccentKey, AppSettings } from '../db/models';
import { applyAccent } from '../utils/accents';
import type { Lang } from '../utils/i18n';

export type FilterKey = 'all' | 'today' | 'overdue';
export type ThemeMode = AppSettings['theme'];

export interface TaskPrefill {
  title?: string;
  due?: number | null;
}

export interface AppState {
  currentPage: string;
  isTaskModalOpen: boolean;
  editingTaskId: string | null;
  filter: FilterKey;
  searchQuery: string;
  language: Lang;
  theme: ThemeMode;
  accent: AccentKey;
  prefill: TaskPrefill | null;
  setPage: (page: string) => void;
  openTaskModal: (prefill?: TaskPrefill, editingId?: string) => void;
  closeTaskModal: () => void;
  setFilter: (filter: FilterKey) => void;
  setSearchQuery: (query: string) => void;
  setLanguage: (language: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  hydrateFromSettings: (settings: AppSettings) => void;
}

/**
 * 只保存 UI 状态与语言／主题镜像；任务数据一律由 Dexie + useLiveQuery 提供。
 * 语言与主题的唯一持久化来源是 db.settings，切换时同步写回；
 * 写入失败只记录错误，不阻塞界面更新（离线场景下界面依然可用）。
 */
function persistSettings(
  patch: Partial<Pick<AppSettings, 'language' | 'theme' | 'accent'>>,
): void {
  void ensureDefaults()
    .then((settings) => db.settings.put({ ...settings, ...patch }))
    .catch((error: unknown) => console.error('[timepin] Unable to save settings', error));
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'today',
  isTaskModalOpen: false,
  editingTaskId: null,
  filter: 'all',
  searchQuery: '',
  language: 'zh',
  theme: 'system',
  accent: 'red',
  prefill: null,

  setPage: (currentPage) => set({ currentPage }),
  openTaskModal: (prefill, editingId) =>
    set({
      isTaskModalOpen: true,
      prefill: prefill ?? null,
      editingTaskId: editingId ?? null,
    }),
  closeTaskModal: () => set({ isTaskModalOpen: false, editingTaskId: null, prefill: null }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLanguage: (language) => {
    set({ language });
    persistSettings({ language });
  },
  setTheme: (theme) => {
    set({ theme });
    persistSettings({ theme });
  },
  setAccent: (accent) => {
    set({ accent });
    applyAccent(accent);
    persistSettings({ accent });
  },
  hydrateFromSettings: (settings) => {
    const accent = settings.accent ?? 'red';
    applyAccent(accent);
    set({ language: settings.language, theme: settings.theme, accent });
  },
}));
