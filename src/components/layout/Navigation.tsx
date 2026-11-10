import { CalendarDays, Home, LayoutGrid, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useDict } from '../../utils/i18n';
import { cn } from '../ui/cn';

const items = [
  { to: '/', key: 'today', Icon: Home },
  { to: '/calendar', key: 'calendar', Icon: CalendarDays },
  { to: '/board', key: 'board', Icon: LayoutGrid },
  { to: '/settings', key: 'settings', Icon: Settings },
] as const;

/** 常驻底部四项导航，固定定位并适配移动端安全区。 */
export function Navigation() {
  const t = useDict();
  const { pathname } = useLocation();
  const labels = {
    today: t.nav.today,
    calendar: t.nav.calendar,
    board: t.nav.board,
    settings: t.nav.settings,
  };

  return (
    <nav
      className="tp-border fixed inset-x-0 bottom-0 z-40 border-t bg-white/90 backdrop-blur-xl dark:bg-canvas-surface-dark/90"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t.action.navigation}
    >
      <div className="mx-auto flex h-[68px] max-w-2xl items-stretch px-2">
        {items.map(({ to, key, Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'tp-focus group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-all duration-200',
                active ? 'text-brand' : 'tp-muted hover:text-brand',
              )}
            >
              <Icon
                className={cn('h-[21px] w-[21px] transition-all duration-200 group-hover:-translate-y-0.5', active && 'scale-110')}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span>{labels[key]}</span>
              <span
                className={cn(
                  'absolute bottom-1.5 h-1 w-1 rounded-full bg-brand transition-all duration-200',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
