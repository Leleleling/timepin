import { FileDown } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useToastStore } from '../../store/useToastStore';
import { downloadText, tasksToCsv, tasksToMarkdown } from '../../utils/export';
import { useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';

/** U29：把本机任务导出成 Markdown / CSV，全程不经过任何服务端。 */
export function ExportCard() {
  const t = useDict();
  const { tasks } = useTasks();
  const pushToast = useToastStore((state) => state.push);
  const stamp = new Date().toISOString().slice(0, 10);

  const exportAs = (kind: 'md' | 'csv') => {
    const content = kind === 'md' ? tasksToMarkdown(tasks) : tasksToCsv(tasks);
    downloadText(
      `timepin-${stamp}.${kind}`,
      content,
      kind === 'md' ? 'text/markdown' : 'text/csv',
    );
    pushToast({ message: t.feedback.exportOk, tone: 'success' });
  };

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <FileDown className="h-[18px] w-[18px] text-brand" />
        <h3 className="text-sm font-semibold">
          {t.hardeningExtra.exportMarkdown} / {t.hardeningExtra.exportCsv}
        </h3>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">
        {t.hardeningExtra.snapshotBody}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => exportAs('md')}>
          {t.hardeningExtra.exportMarkdown}
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportAs('csv')}>
          {t.hardeningExtra.exportCsv}
        </Button>
      </div>
    </section>
  );
}
