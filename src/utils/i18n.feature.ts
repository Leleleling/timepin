/**
 * 本轮新增功能的文案契约，与 BaseDictionary 交叉成完整的 Dictionary。
 * 单独成文件是为了让 i18n.ts 与两份基础字典继续保持在 300 行以内。
 */
export interface FeatureDictionary {
  pwa: {
    installTitle: string;
    installBody: string;
    installAction: string;
    dismiss: string;
    updateTitle: string;
    updateBody: string;
    updateAction: string;
    offlineReady: string;
    installed: string;
    unavailable: string;
  };
  notify: {
    cardTitle: string;
    cardBody: string;
    toggleOn: string;
    toggleOff: string;
    leadLabel: string;
    leads: { now: string; quarter: string; hour: string; day: string };
    permission: {
      granted: string;
      denied: string;
      prompt: string;
      unsupported: string;
      insecure: string;
    };
    testAction: string;
    testTitle: string;
    testBody: string;
    dueTitle: string;
    dueBodyTemplate: string;
    overdueBodyTemplate: string;
    boundary: string;
    enabledOk: string;
    enableFail: string;
  };
  calendarViews: {
    yearTitleTemplate: string;
    yearTotalTemplate: string;
    monthCountTemplate: string;
    weekRangeTemplate: string;
    thisWeek: string;
    thisDay: string;
    openSheet: string;
    dayCountTemplate: string;
    timeline: string;
    allDay: string;
    emptyDay: string;
    emptyWeek: string;
    emptyYear: string;
    prev: string;
    next: string;
    hintYear: string;
    hintMonth: string;
    hintWeek: string;
    hintDay: string;
  };
  boardDrag: {
    hintTitle: string;
    hintBody: string;
    manualBadge: string;
    moveAction: string;
    moveTitle: string;
    restoreAuto: string;
    restoreDone: string;
    dragHint: string;
    dropHint: string;
    movedOk: string;
  };
  settingsExtra: {
    pwaTitle: string;
    pwaBody: string;
    pwaInstallAction: string;
    pwaInstalled: string;
    pwaNotReady: string;
    pwaOfflineReady: string;
    pwaUpdateAction: string;
    versionTemplate: string;
    dataTitle: string;
    dataBody: string;
    recalibrateAction: string;
    recalibrateBody: string;
    recalibrateConfirm: string;
    trashTitle: string;
    trashBody: string;
    trashEmpty: string;
    trashCountTemplate: string;
    restoreAction: string;
    deleteForeverAction: string;
    clearAllAction: string;
    clearAllBody: string;
    clearAllConfirm: string;
    clearAllDone: string;
    aboutTitle: string;
    aboutBody: string;
    offlineNote: string;
    confirmAction: string;
    cancelAction: string;
  };
}
