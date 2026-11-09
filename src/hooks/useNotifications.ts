import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { Task } from '../db/models';
import { interpolate, useDict } from '../utils/i18n';
import { useAppStore } from '../store/useAppStore';
import {
  DEFAULT_NOTIFY_PREFERENCES,
  collectDueTasks,
  isLeadMinutes,
  notificationKey,
  sanitizePreferences,
  trimSeenKeys,
  type NotifyPreferences,
} from '../utils/notify';

const STORAGE_KEY = 'timepin:notify';
const CHECK_INTERVAL = 60_000;
const EMPTY_TASKS: Task[] = [];

/** localStorage 只存浏览器级的通知偏好与去重记录，不进入任务备份 JSON。 */
function readPreferences(): Promise<NotifyPreferences> {
  return Promise.resolve()
    .then(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw
        ? sanitizePreferences(JSON.parse(raw) as unknown)
        : { ...DEFAULT_NOTIFY_PREFERENCES };
    })
    .catch((error: unknown) => {
      console.error('[timepin] Unable to read notification preferences', error);
      return { ...DEFAULT_NOTIFY_PREFERENCES };
    });
}

function writePreferences(value: NotifyPreferences): Promise<void> {
  return Promise.resolve()
    .then(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)))
    .catch((error: unknown) =>
      console.error('[timepin] Unable to save notification preferences', error),
    );
}

export interface NotifyState {
  preferences: NotifyPreferences;
  permission: NotificationPermission | 'unsupported';
  supported: boolean;
  secure: boolean;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setLeadMinutes: (minutes: number) => void;
  sendTest: () => boolean;
}

/**
 * 页面打开时的本地到期提醒：60 秒扫描一次未完成任务，按任务+截止时间去重。
 * 刻意不注册 push 监听、不用 registration.showNotification，因此零后端零密钥。
 */
export function useNotifications(): NotifyState {
  const t = useDict();
  const navigate = useNavigate();
  const language = useAppStore((state) => state.language);
  const [preferences, setPreferences] = useState<NotifyPreferences>({
    ...DEFAULT_NOTIFY_PREFERENCES,
  });
  const prefsRef = useRef<NotifyPreferences>(preferences);
  const seenRef = useRef<Set<string>>(new Set());

  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const secure = typeof window !== 'undefined' && window.isSecureContext;
  const permission: NotificationPermission | 'unsupported' = supported
    ? Notification.permission
    : 'unsupported';

  const tasks = useLiveQuery(
    () =>
      db.tasks
        .toArray()
        .catch((error: unknown) => {
          console.error('[timepin] Unable to load tasks for reminders', error);
          return EMPTY_TASKS;
        }),
    [],
    EMPTY_TASKS,
  );

  useEffect(() => {
    void readPreferences().then((value) => {
      prefsRef.current = value;
      seenRef.current = new Set(value.seenKeys);
      setPreferences(value);
    });
  }, []);

  const commit = useCallback((patch: Partial<NotifyPreferences>) => {
    const next: NotifyPreferences = {
      ...prefsRef.current,
      ...patch,
      seenKeys: trimSeenKeys([...seenRef.current]),
    };
    prefsRef.current = next;
    setPreferences(next);
    void writePreferences(next);
  }, []);

  const showNotification = useCallback(
    (task: Task) => {
      const locale = language === 'zh' ? 'zh-CN' : 'en-US';
      const isOverdue = typeof task.dueAt === 'number' && task.dueAt < Date.now();
      const timeText =
        typeof task.dueAt === 'number'
          ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
              new Date(task.dueAt),
            )
          : '';
      const body = isOverdue
        ? interpolate(t.notify.overdueBodyTemplate, { title: task.title })
        : interpolate(t.notify.dueBodyTemplate, { title: task.title, time: timeText });

      return Promise.resolve()
        .then(() => {
          const notification = new Notification(t.notify.dueTitle, {
            body,
            icon: '/icon-192.png',
            tag: notificationKey(task),
          });
          notification.onclick = () => {
            window.focus();
            navigate(`/task/${task.id}`);
            notification.close();
          };
        })
        .catch((error: unknown) =>
          console.error('[timepin] Unable to show due reminder', error),
        );
    },
    [navigate, t, language],
  );

  useEffect(() => {
    const check = () => {
      const prefs = prefsRef.current;
      if (!prefs.enabled || !supported || Notification.permission !== 'granted') return;
      if (document.visibilityState !== 'visible') return;

      const hits = collectDueTasks(tasks ?? EMPTY_TASKS, Date.now(), prefs.leadMinutes, seenRef.current);
      if (hits.length === 0) return;
      hits.forEach((task) => {
        seenRef.current.add(notificationKey(task));
        void showNotification(task);
      });
      commit({});
    };

    const timer = window.setInterval(check, CHECK_INTERVAL);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [tasks, supported, commit, showNotification]);

  const setEnabled = useCallback(
    (enabled: boolean): Promise<boolean> => {
      if (!enabled) {
        commit({ enabled: false });
        return Promise.resolve(true);
      }
      if (!supported || !secure) return Promise.resolve(false);
      return Notification.requestPermission()
        .then((result) => {
          const granted = result === 'granted';
          commit({ enabled: granted });
          return granted;
        })
        .catch((error: unknown) => {
          console.error('[timepin] Unable to request notification permission', error);
          return false;
        });
    },
    [commit, secure, supported],
  );

  const setLeadMinutes = useCallback(
    (minutes: number) => {
      if (isLeadMinutes(minutes)) commit({ leadMinutes: minutes });
    },
    [commit],
  );

  const sendTest = useCallback((): boolean => {
    if (!supported || Notification.permission !== 'granted') return false;
    void Promise.resolve()
      .then(() => {
        const notification = new Notification(t.notify.testTitle, {
          body: t.notify.testBody,
          icon: '/icon-192.png',
          tag: 'timepin:test',
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      })
      .catch((error: unknown) =>
        console.error('[timepin] Unable to show test reminder', error),
      );
    return true;
  }, [supported, t]);

  return { preferences, permission, supported, secure, setEnabled, setLeadMinutes, sendTest };
}
