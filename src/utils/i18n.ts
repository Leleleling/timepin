import { useAppStore } from '../store/useAppStore';
import { en, zh } from './dictionaries';
import type { FeatureDictionary } from './i18n.feature';

export type { FeatureDictionary } from './i18n.feature';

/**
 * 轻量双语字典（总纲 6.1）：不引入 i18n 库，界面统一通过 useDict() 取词。
 * 具体文案拆分在 dictionaries.zh.ts / dictionaries.en.ts，本文件只保留类型契约与取值入口。
 * 新增文案必须同时补齐两份字典，且键结构完全一致。
 */
export type Lang = 'zh' | 'en';

/** 上一轮已稳定的基础文案契约；新增分组放在 FeatureDictionary。 */
export interface BaseDictionary {
  app: { name: string; tagline: string };
  nav: {
    today: string;
    calendar: string;
    board: string;
    settings: string;
    onboarding: string;
  };
  action: {
    add: string;
    save: string;
    cancel: string;
    skip: string;
    close: string;
    search: string;
    filter: string;
    switchLanguage: string;
    switchTheme: string;
    all: string;
    today: string;
    overdue: string;
    edit: string;
    remove: string;
    postpone: string;
    pin: string;
    unpin: string;
    complete: string;
    confirm: string;
    export: string;
    import: string;
    clear: string;
    back: string;
    done: string;
  };
  header: {
    today: { title: string; subtitle: string };
    calendar: { title: string; subtitle: string };
    board: { title: string; subtitle: string };
    settings: { title: string; subtitle: string };
  };
  today: {
    greeting: string;
    dateHint: string;
    emptyTitle: string;
    emptyBody: string;
    localCount: string;
    engineTitle: string;
    engineBody: string;
    legendTitle: string;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    cardHint: string;
    searchPlaceholder: string;
    resultTemplate: string;
  };
  task: {
    badge: { q1: string; q2: string; q3: string; q4: string };
    importance: { high: string; medium: string; low: string };
    noDue: string;
    overdue: string;
    due: string;
    pinned: string;
    subtasks: string;
    swipeHint: string;
    editHint: string;
    emptyFilteredTitle: string;
    emptyFilteredBody: string;
    clearSearch: string;
    done: string;
    listTitle: string;
  };
  calendar: {
    views: { year: string; month: string; week: string; day: string };
    weekdays: string[];
    hintTitle: string;
    hintBody: string;
    todayBadge: string;
    viewHint: string;
    barsLegend: string;
    sheetTitleTemplate: string;
    sheetEmpty: string;
    sheetHint: string;
  };
  board: {
    hintTitle: string;
    hintBody: string;
    emptyTitle: string;
    emptyBody: string;
    countTemplate: string;
    editHint: string;
    quadrants: {
      q1: { title: string; body: string };
      q2: { title: string; body: string };
      q3: { title: string; body: string };
      q4: { title: string; body: string };
    };
  };
  settings: {
    appearance: string;
    theme: string;
    themeBody: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    accent: string;
    accentBody: string;
    language: string;
    languageBody: string;
    languageZh: string;
    languageEn: string;
    dataTitle: string;
    dataBody: string;
    dataBadge: string;
    notifyTitle: string;
    notifyBody: string;
    notifyBadge: string;
    aboutTitle: string;
    aboutBody: string;
  };
  backup: {
    title: string;
    hintTitle: string;
    hintBody: string;
    exportTitle: string;
    exportBody: string;
    exportButton: string;
    importTitle: string;
    importBody: string;
    importButton: string;
    merge: string;
    replace: string;
    confirm: string;
    summaryTemplate: string;
    fileLabel: string;
    noFile: string;
    warningProfile: string;
    warningSettings: string;
    warningReplace: string;
    offlineNote: string;
  };
  form: {
    titleNew: string;
    titleEdit: string;
    subtitleNew: string;
    subtitleEdit: string;
    titlePlaceholder: string;
    contentPlaceholder: string;
    contentLabel: string;
    dueLabel: string;
    timeLabel: string;
    dueNone: string;
    dueToday: string;
    dueTomorrow: string;
    dueIn3Days: string;
    dueIn1Week: string;
    dueCustom: string;
    importanceLabel: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    pinnedLabel: string;
    pinnedHint: string;
    subtasksLabel: string;
    subtasksPlaceholder: string;
    subtaskAdd: string;
    urgencyPreview: string;
    saving: string;
    urlPrefillHint: string;
    errorTitleRequired: string;
    errorDueBeforeStart: string;
    errorInvalidDate: string;
  };
  quiz: {
    eyebrow: string;
    intro: string;
    questions: string[];
    options: string[];
    note: string;
    skip: string;
    stepTemplate: string;
    saving: string;
    finish: string;
    optionHint: string;
  };
  feedback: {
    saved: string;
    deleted: string;
    postponed: string;
    loadError: string;
    saveError: string;
    storageUnavailable: string;
    genericError: string;
    loading: string;
    exportOk: string;
    importOk: string;
    invalidFile: string;
    versionMismatch: string;
    importFail: string;
  };
  modal: {
    title: string;
    subtitle: string;
    prefill: string;
    noDue: string;
    due: string;
    note: string;
  };
}

export type Dictionary = BaseDictionary & FeatureDictionary;

export const dict: Record<Lang, Dictionary> = { zh, en };

export function getDict(language: Lang): Dictionary {
  return dict[language] ?? dict.zh;
}

/** 组件中统一使用的取词 Hook，语言变化时自动刷新文案。 */
export function useDict(): Dictionary {
  const language = useAppStore((state) => state.language);
  return getDict(language);
}

/** 替换模板中的 {key} 占位符，用于「第 N 题」「将导入 N 条任务」等动态文案。 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
