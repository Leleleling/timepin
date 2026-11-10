import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileJson, Upload } from 'lucide-react';
import { applyBackupSnapshot, ensureDefaults, readBackupSnapshot } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import {
  parseBackup,
  planImport,
  serializeBackup,
  type BackupError,
  type BackupSnapshot,
  type ImportMode,
  type ImportPlan,
} from '../../utils/backup';
import { interpolate, useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

/** 设置页的数据迁移卡：换域名提示、导出 JSON、导入前校验与合并/覆盖确认。 */
export function BackupCard() {
  const t = useDict();
  const hydrateFromSettings = useAppStore((state) => state.hydrateFromSettings);
  const [parsed, setParsed] = useState<BackupSnapshot | null>(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorLabel = (kind: BackupError): string => {
    if (kind === 'versionMismatch') return t.feedback.versionMismatch;
    // JSON 语法损坏与备份结构不符是两类问题，提示要能区分（T12）。
    if (kind === 'invalidJson') return t.feedback.invalidJson;
    return t.feedback.invalidFile;
  };

  const handleExport = () => {
    setFeedback(null);
    void readBackupSnapshot()
      .then((snapshot) => {
        const blob = new Blob([serializeBackup(snapshot)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `timepin-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setFeedback(t.feedback.exportOk);
        setError(null);
      })
      .catch((exportError: unknown) => {
        console.error('[timepin] Unable to export backup', exportError);
        setError(t.feedback.genericError);
      });
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setFeedback(null);
    void file
      .text()
      .then((raw) => {
        const result = parseBackup(raw);
        if (!result.ok) {
          setParsed(null);
          setError(errorLabel(result.error));
          return;
        }
        setParsed(result.data);
        setError(null);
      })
      .catch((readError: unknown) => {
        console.error('[timepin] Unable to read backup file', readError);
        setParsed(null);
        setError(t.feedback.invalidFile);
      });
  };

  const handleImport = () => {
    if (!parsed || busy) return;
    setBusy(true);
    setFeedback(null);
    void applyBackupSnapshot(parsed, mode)
      .then(() => ensureDefaults())
      .then((settings) => {
        hydrateFromSettings(settings);
        setFeedback(t.feedback.importOk);
        setError(null);
        setParsed(null);
        setFileName('');
      })
      .catch((importError: unknown) => {
        console.error('[timepin] Unable to import backup', importError);
        setError(t.feedback.importFail);
      })
      .finally(() => setBusy(false));
  };

  const plan = parsed ? planImport(parsed, mode) : null;
  const warningCopy: Record<ImportPlan['warnings'][number], string> = {
    profile: t.backup.warningProfile,
    settings: t.backup.warningSettings,
    replace: t.backup.warningReplace,
  };
  const modes: { value: ImportMode; label: string }[] = [
    { value: 'merge', label: t.backup.merge },
    { value: 'replace', label: t.backup.replace },
  ];

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <FileJson className="h-[18px] w-[18px] text-brand" />
        <h2 className="text-base font-semibold">{t.backup.title}</h2>
      </div>

      <div className="mt-4 flex gap-3 rounded-lg bg-sun-soft p-3 dark:bg-sun/10">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sun" />
        <div>
          <p className="text-xs font-semibold text-warning">
            {t.backup.hintTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-warning-deep dark:text-warning/85">
            {t.backup.hintBody}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">{t.backup.exportTitle}</h3>
        <p className="tp-muted mt-1 text-xs leading-relaxed">{t.backup.exportBody}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={handleExport}>
          <Download className="h-4 w-4" />
          {t.backup.exportButton}
        </Button>
      </div>

      <div className="tp-divider my-5" />

      <div>
        <h3 className="text-sm font-semibold">{t.backup.importTitle}</h3>
        <p className="tp-muted mt-1 text-xs leading-relaxed">{t.backup.importBody}</p>

        <input
          type="file"
          accept="application/json,.json"
          aria-label={t.backup.fileLabel}
          onChange={handleFile}
          className="tp-focus mt-3 w-full cursor-pointer text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white file:transition-all file:duration-200 hover:file:bg-brand-deep"
        />
        <p className="tp-muted mt-2 truncate text-xs">
          {fileName || t.backup.noFile}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
              className={cn(
                'tp-focus tp-border flex-1 cursor-pointer rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all duration-200',
                mode === item.value
                  ? 'border-brand bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep'
                  : 'tp-muted hover:border-brand/40 hover:text-brand',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {plan ? (
          <div className="mt-4 rounded-lg bg-black/[0.03] p-3 dark:bg-white/[0.05]">
            <p className="text-sm font-semibold">
              {interpolate(t.backup.summaryTemplate, { count: plan.taskCount })}
            </p>
            <ul className="tp-muted mt-2 space-y-1 text-xs leading-relaxed">
              {plan.warnings.map((warning) => (
                <li key={warning}>· {warningCopy[warning]}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Button
          size="sm"
          className="mt-4"
          disabled={!parsed || busy}
          onClick={handleImport}
        >
          <Upload className="h-4 w-4" />
          {t.backup.confirm}
        </Button>
      </div>

      {feedback ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-xs font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-xs font-medium text-brand">
          {error}
        </p>
      ) : null}
      <p className="tp-muted mt-4 text-xs leading-relaxed">{t.backup.offlineNote}</p>
    </section>
  );
}
