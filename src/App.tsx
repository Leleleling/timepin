import { useEffect } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Board from './pages/Board';
import Calendar from './pages/Calendar';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Today from './pages/Today';
import { useOnboardingGate } from './hooks/useOnboardingGate';
import { usePwa } from './hooks/usePwa';
import { useAppStore } from './store/useAppStore';
import { ACCENTS } from './utils/accents';
import { useDict } from './utils/i18n';

/**
 * 快捷指令 / URL Scheme（总纲 6.2）：
 * 访问 /new?title=Hello&due=1699999999999 时先把参数写入 Zustand，
 * 这样即使首次问卷把用户送到 /onboarding，预填内容也不会丢失。
 * 该 Hook 在 App 顶层始终注册，早于任何 gate 重定向执行。
 */
function useShortcutCapture() {
  const location = useLocation();
  const openTaskModal = useAppStore((state) => state.openTaskModal);

  useEffect(() => {
    if (location.pathname !== '/new') return;
    const params = new URLSearchParams(location.search);
    const title = params.get('title') ?? undefined;
    const rawDue = params.get('due');
    const parsedDue = rawDue === null ? Number.NaN : Number(rawDue);
    const due = Number.isFinite(parsedDue) && parsedDue > 0 ? parsedDue : null;
    openTaskModal({ title: title || undefined, due });
  }, [location.pathname, location.search, openTaskModal]);
}

/** 通知或外部链接带来的 /task/{id}：打开编辑后回到首页。 */
function TaskDetailRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const openTaskModal = useAppStore((state) => state.openTaskModal);

  useEffect(() => {
    if (id) openTaskModal(undefined, id);
    navigate('/', { replace: true });
  }, [id, navigate, openTaskModal]);

  return null;
}

/** 主题与语言写入 html 根节点；system 模式跟随设备偏好实时响应。 */
function useDocumentPreferences() {
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const accent = useAppStore((state) => state.accent);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', isDark ? '#111827' : ACCENTS[accent].brand);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, accent]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);
}

function LoadingScreen() {
  const t = useDict();
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="tp-surface tp-pop-in w-full max-w-sm p-8 text-center">
        <img src="/icon-192.png" alt="" className="mx-auto mb-5 h-16 w-16 rounded-card" />
        <p className="text-sm font-semibold">{t.app.name}</p>
        <p className="tp-muted mt-2 text-xs">{t.feedback.loading}</p>
      </div>
    </div>
  );
}

export default function App() {
  useDocumentPreferences();
  useShortcutCapture();
  const pwa = usePwa();
  const gate = useOnboardingGate();
  const { pathname } = useLocation();

  if (gate === 'loading') return <LoadingScreen />;
  if (gate === 'needsOnboarding' && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (gate === 'done' && pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout pwa={pwa} />}>
        <Route path="/" element={<Today />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/board" element={<Board />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/new" element={<Navigate to="/" replace />} />
        <Route path="/task/:id" element={<TaskDetailRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
