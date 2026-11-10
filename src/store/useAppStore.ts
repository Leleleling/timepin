import { create } from 'zustand';
import { db, ensureDefaults } from '../db';
import type { AccentKey, AppSettings, Density, FontScale } from '../db/models';
import { safeAccent } from '../utils/accents';
import type { Lang } from '../utils/i18n';
import type { SortKey } from '../utils/sorting';

export type FilterKey = 'all' | 'today' | 'overdue';
export type ThemeMode = AppSettings['theme'];
export type ImportanceColorMap = AppSettings['colorMap'];
export type DueFilter = 'any' | 'with' | 'without';

const SEARCH_HISTORY_KEY = 'timepin.searchHistory';
const SEARCH_HISTORY_LIMIT = 8;

/** 搜索历史只存本机 localStorage，读失败时降级为空数组。 */
function readSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, SEARCH_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error: unknown) {
    console.error('[timepin] Unable to save search history', error);
  }
}

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
  customAccent?: string;
  darkAccent?: AccentKey;
  darkCustomAccent?: string;
  density: Density;
  fontScale: FontScale;
  colorMap: ImportanceColorMap;
  /** U9：首页批量多选模式与当前选中的任务 id。 */
  selectionMode: boolean;
  selectedIds: string[];
  /** U17–U19：标签筛选、排序键、高级筛选与搜索历史。 */
  tagFilter: string | null;
  sortKey: SortKey;
  importanceFilter: number;
  dueFilter: DueFilter;
  searchHistory: string[];
  /** 从设置页主动重新校准问卷时，暂时屏蔽首次问卷的路由拦截。 */
  recalibrating: boolean;
  prefill: TaskPrefill | null;
  setPage: (page: string) => void;
  openTaskModal: (prefill?: TaskPrefill, editingId?: string) => void;
  closeTaskModal: () => void;
  setFilter: (filter: FilterKey) => void;
  setSearchQuery: (query: string) => void;
  setLanguage: (language: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  setCustomAccent: (hex: string | undefined) => void;
  setDarkAccent: (accent: AccentKey | undefined) => void;
  setDarkCustomAccent: (hex: string | undefined) => void;
  setDensity: (density: Density) => void;
  setFontScale: (fontScale: FontScale) => void;
  setColorMap: (colorMap: ImportanceColorMap) => void;
  setWeights: (weights: AppSettings['weights']) => void;
  setSelectionMode: (value: boolean) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setTagFilter: (tag: string | null) => void;
  setSortKey: (key: SortKey) => void;
  setImportanceFilter: (value: number) => void;
  setDueFilter: (value: DueFilter) => void;
  pushSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  setRecalibrating: (value: boolean) => void;
  hydrateFromSettings: (settings: AppSettings) => void;
}

/**
 * 只保存 UI 状态与设置镜像；任务数据一律由 Dexie + useLiveQuery 提供。
 * 设置唯一持久化来源是 db.settings；写入失败只记录错误，不阻塞界面更新。
 * 主题色的 CSS 变量由 App.tsx 的 useDocumentPreferences 统一应用，
 * 这样浅色/深色切换时能一起换色，不会出现两处各自 apply 的竞态。
 */
function persistSettings(patch: Partial<AppSettings>): void {
  void ensureDefaults()
    .then((settings) => db.settings.put({ ...settings, ...patch }))
    .catch((error: unknown) => console.error('[timepin] Unable to save settings', error));
}

const DEFAULT_COLORMAP: ImportanceColorMap = {
  high: '#E5484D',
  medium: '#F5A623',
  low: '#6B7280',
};

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'today',
  isTaskModalOpen: false,
  editingTaskId: null,
  filter: 'all',
  searchQuery: '',
  language: 'zh',
  theme: 'system',
  accent: 'red',
  customAccent: undefined,
  darkAccent: undefined,
  darkCustomAccent: undefined,
  density: 'normal',
  fontScale: 'normal',
  colorMap: DEFAULT_COLORMAP,
  selectionMode: false,
  selectedIds: [],
  tagFilter: null,
  sortKey: 'smart',
  importanceFilter: 0,
  dueFilter: 'any',
  searchHistory: readSearchHistory(),
  recalibrating: false,
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
    set({ accent, customAccent: undefined });
    persistSettings({ accent, customAccent: undefined });
  },
  setCustomAccent: (customAccent) => {
    set({ customAccent });
    persistSettings({ customAccent });
  },
  setDarkAccent: (darkAccent) => {
    set({ darkAccent, darkCustomAccent: undefined });
    persistSettings({ darkAccent, darkCustomAccent: undefined });
  },
  setDarkCustomAccent: (darkCustomAccent) => {
    set({ darkCustomAccent });
    persistSettings({ darkCustomAccent });
  },
  setDensity: (density) => {
    set({ density });
    persistSettings({ density });
  },
  setFontScale: (fontScale) => {
    set({ fontScale });
    persistSettings({ fontScale });
  },
  setColorMap: (colorMap) => {
    set({ colorMap });
    persistSettings({ colorMap });
  },
  setWeights: (weights) => {
    const bounded = {
      importance: Math.min(3, Math.max(0.1, Number(weights.importance) || 1)),
      urgency: Math.min(3, Math.max(0.1, Number(weights.urgency) || 1)),
    };
    persistSettings({ weights: bounded });
  },
  setSelectionMode: (selectionMode) =>
    set(selectionMode ? { selectionMode } : { selectionMode, selectedIds: [] }),
  toggleSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  setTagFilter: (tagFilter) => set({ tagFilter }),
  setSortKey: (sortKey) => set({ sortKey }),
  setImportanceFilter: (importanceFilter) => set({ importanceFilter }),
  setDueFilter: (dueFilter) => set({ dueFilter }),
  pushSearchHistory: (query) =>
    set((state) => {
      const value = query.trim();
      if (!value) return state;
      const next = [
        value,
        ...state.searchHistory.filter((item) => item !== value),
      ].slice(0, SEARCH_HISTORY_LIMIT);
      writeSearchHistory(next);
      return { searchHistory: next };
    }),
  clearSearchHistory: () => {
    writeSearchHistory([]);
    set({ searchHistory: [] });
  },
  setRecalibrating: (recalibrating) => set({ recalibrating }),
  hydrateFromSettings: (settings) => {
    // 设置可能来自旧备份或被手工改过的 IndexedDB，一律先白名单收敛。
    set({
      language: settings.language,
      theme: settings.theme,
      accent: safeAccent(settings.accent),
      customAccent: settings.customAccent,
      darkAccent: settings.darkAccent,
      darkCustomAccent: settings.darkCustomAccent,
      density: settings.density ?? 'normal',
      fontScale: settings.fontScale ?? 'normal',
      colorMap: settings.colorMap ?? DEFAULT_COLORMAP,
    });
  },
}));
