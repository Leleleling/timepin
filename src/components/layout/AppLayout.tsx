import { useEffect, useState } from 'react';
import { Languages, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { PwaState } from '../../hooks/usePwa';
import { useAppStore } from '../../store/useAppStore';
import { useDict } from '../../utils/i18n';
import { TaskForm } from '../task/TaskForm';
import { Button } from '../ui/Button';
import { ToastHost } from '../ui/Toast';
import { Input } from '../ui/Input';
import { Navigation } from './Navigation';
import { PwaBanner } from './PwaBanner';

type PageKey = 'today' | 'calendar' | 'board' | 'settings';

function pageKeyOf(pathname: string): PageKey {
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/board')) return 'board';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'today';
}

interface AppLayoutProps {
  pwa: PwaState;
}

/** 应用外壳：固定顶栏 + 可展开搜索 + 限宽内容列 + 固定底部导航 + 全局任务表单。 */
export function AppLayout({ pwa }: AppLayoutProps) {
  const { pathname } = useLocation();
  const t = useDict();
  const [searchOpen, setSearchOpen] = useState(false);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const pushSearchHistory = useAppStore((state) => state.pushSearchHistory);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setTheme = useAppStore((state) => state.setTheme);
  const setPage = useAppStore((state) => state.setPage);
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const notify = useNotifications();

  const key = pageKeyOf(pathname);
  const header = t.header[key];

  useEffect(() => {
    setPage(key);
  }, [key, setPage]);

  // 顶栏按 light → dark → system 循环，保证「跟随系统」始终可以回来（M2）。
  const nextTheme: 'light' | 'dark' | 'system' =
    theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const toggleTheme = () => setTheme(nextTheme);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const nextThemeLabel =
    nextTheme === 'light'
      ? t.settings.themeLight
      : nextTheme === 'dark'
        ? t.settings.themeDark
        : t.settings.themeSystem;

  return (
    <div className="min-h-screen">
      <header className="tp-border fixed inset-x-0 top-0 z-30 h-20 border-b bg-white/85 backdrop-blur-xl dark:bg-canvas-surface-dark/85">
        <div className="mx-auto flex h-full max-w-2xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/icon-192.png"
              alt=""
              className="h-10 w-10 shrink-0 rounded-card shadow-soft"
            />
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold leading-7 tracking-tight">
                {header.title}
              </h1>
              <p className="tp-muted truncate text-xs">{header.subtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={t.action.search}
              title={t.action.search}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search className="h-[18px] w-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={t.action.switchLanguage}
              title={t.action.switchLanguage}
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            >
              <Languages className="h-[18px] w-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={`${t.action.switchTheme} · ${nextThemeLabel}`}
              title={`${t.action.switchTheme} · ${nextThemeLabel}`}
              onClick={toggleTheme}
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </Button>
            <Button
              variant="primary"
              size="icon"
              className="h-9 w-9"
              aria-label={t.action.add}
              title={t.action.add}
              onClick={() => openTaskModal()}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="tp-fade-in fixed inset-x-0 top-20 z-40 px-4">
          <div className="tp-surface mx-auto flex max-w-2xl items-center gap-2 p-2">
            <Input
              autoFocus
              type="search"
              value={searchQuery}
              placeholder={t.today.searchPlaceholder}
              aria-label={t.action.search}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  pushSearchHistory(searchQuery);
                  setSearchOpen(false);
                }
              }}
              className="tp-border h-10 border text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={t.action.clear}
              title={t.action.clear}
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
            >
              <X className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-24 sm:px-6">
        <PwaBanner pwa={pwa} />
        <Outlet context={{ pwa, notify }} />
      </main>

      <Navigation />
      <TaskForm />
      <ToastHost />
    </div>
  );
}
