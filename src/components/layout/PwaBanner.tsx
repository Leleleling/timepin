import { Download, RefreshCw } from 'lucide-react';
import type { PwaState } from '../../hooks/usePwa';
import { useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';

interface PwaBannerProps {
  pwa: PwaState;
}

/** 内容顶部的安装 / 更新提示，主色强调、200ms 淡入，不遮挡固定顶栏。 */
export function PwaBanner({ pwa }: PwaBannerProps) {
  const t = useDict();
  const isUpdate = pwa.needRefresh;
  if (!isUpdate && !pwa.canInstall) return null;

  const Icon = isUpdate ? RefreshCw : Download;
  const title = isUpdate ? t.pwa.updateTitle : t.pwa.installTitle;
  const body = isUpdate ? t.pwa.updateBody : t.pwa.installBody;
  const action = isUpdate ? t.pwa.updateAction : t.pwa.installAction;

  return (
    <div className="tp-surface tp-fade-in mb-4 flex flex-col gap-3 border-l-4 border-brand p-4 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="tp-muted mt-1 text-xs leading-relaxed">{body}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={isUpdate ? pwa.applyUpdate : () => void pwa.promptInstall()}
        >
          {action}
        </Button>
        <Button variant="ghost" size="sm" onClick={pwa.dismissInstall}>
          {t.pwa.dismiss}
        </Button>
      </div>
    </div>
  );
}
