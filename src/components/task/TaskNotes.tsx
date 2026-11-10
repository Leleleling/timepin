import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../ui/cn';

/** 行内只处理 **粗体**，其余保持纯文本，绝不使用 innerHTML。 */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/**
 * U16：零依赖的轻量 Markdown / 勾选清单渲染。
 * 支持 #/##/### 标题、- [ ] / - [x] 清单、- 列表与 **粗体**。
 * 清单状态是备注文本的展示结果，不与任务子任务双向同步，避免两套数据源冲突。
 */
export function TaskNotes({ content }: { content: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {content.split('\n').map((line, index) => {
        const text = line.trim();
        if (!text) return <div key={index} className="h-1" aria-hidden="true" />;

        const heading = /^(#{1,3})\s+(.*)$/.exec(text);
        if (heading) {
          return (
            <h4 key={index} className="pt-1 text-sm font-semibold">
              {renderInline(heading[2])}
            </h4>
          );
        }

        const checklist = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(text);
        if (checklist) {
          const checked = checklist[1].toLowerCase() === 'x';
          return (
            <div key={index} className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                  checked ? 'border-brand bg-brand text-white' : 'tp-border',
                )}
              >
                {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span className={cn(checked && 'tp-muted line-through')}>
                {renderInline(checklist[2])}
              </span>
            </div>
          );
        }

        const bullet = /^[-*]\s+(.*)$/.exec(text);
        if (bullet) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span aria-hidden="true" className="text-brand">
                ·
              </span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        }

        return <p key={index}>{renderInline(text)}</p>;
      })}
    </div>
  );
}
