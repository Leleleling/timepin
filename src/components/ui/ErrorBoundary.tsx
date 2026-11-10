import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getDict } from '../../utils/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 全局兜底：任何渲染异常都给可恢复的错误页，而不是整页白屏。
 * 只读 store 里的语言（不订阅渲染），保证兜底页自身尽量简单、不会二次抛错。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[timepin] Unhandled render error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const language = useAppStore.getState().language;
    const t = getDict(language).errorBoundary;

    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="tp-surface tp-pop-in w-full max-w-md p-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-lg font-semibold">{t.title}</h1>
          <p className="tp-muted mt-2 text-sm leading-relaxed">{t.body}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="tp-focus mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-brand-deep"
          >
            <RefreshCw className="h-4 w-4" />
            {t.action}
          </button>
          <details className="mt-5 text-left">
            <summary className="tp-muted cursor-pointer text-xs">{t.detail}</summary>
            <pre className="tp-muted mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px]">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
