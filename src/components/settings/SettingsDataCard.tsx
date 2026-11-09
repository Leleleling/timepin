import { useState } from 'react';
import { Database, RotateCcw, Trash2 } from 'lucide-react';
import { db, ensureDefaults } from '../../db';
import { useTasks } from '../../hooks/useTasks';
import { interpolate, useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type Confirm =
  | { kind: 'recalibrate' }
  | { kind: 'clear' }
  | { kind: 'purge'; taskId: string }
  | null;

/** 本机数据卡：重新校准、回收站恢复/彻底删除、清空全部数据（均带二次确认）。 */
export function SettingsDataCard() {
  const t = useDict();
  const { tasks, updateTask } = useTasks();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const trashed = tasks.filter((task) => task.status === 'trash');

  const modalTitle =
    confirm?.kind === 'recalibrate'
      ? t.settingsExtra.recalibrateAction
      : confirm?.kind === 'clear'
        ? t.settingsExtra.clearAllAction
        : t.settingsExtra.trashTitle;
  const modalBody =
    confirm?.kind === 'recalibrate'
      ? t.settingsExtra.recalibrateConfirm
      : confirm?.kind === 'clear'
        ? t.settingsExtra.clearAllConfirm
        : t.settingsExtra.trashBody;

  const runConfirmed = () => {
    const current = confirm;
    setConfirm(null);
    if (!current) return;

    if (current.kind === 'recalibrate') {
      void db.urgencyProfile
        .delete('default')
        .catch((error: unknown) =>
          console.error('[timepin] Unable to reset calibration', error),
        );
      return;
    }
    if (current.kind === 'purge') {
      void db.tasks
        .delete(current.taskId)
        .catch((error: unknown) =>
          console.error('[timepin] Unable to permanently delete task', error),
        );
      return;
    }

    void db
      .transaction('rw', db.tasks, db.urgencyProfile, db.settings, async () => {
        await db.tasks.clear();
        await db.urgencyProfile.clear();
        await db.settings.clear();
      })
      .then(() => ensureDefaults())
      .catch((error: unknown) =>
        console.error('[timepin] Unable to erase local data', error),
      );
  };

  const restore = (id: string) => {
    void updateTask(id, { status: 'todo' }).catch((error: unknown) =>
      console.error('[timepin] Unable to restore task', error),
    );
  };

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <Database className="h-[18px] w-[18px] text-brand" />
        <h2 className="text-base font-semibold">{t.settingsExtra.dataTitle}</h2>
      </div>
      <p className="tp-muted mt-1.5 text-sm leading-relaxed">{t.settingsExtra.dataBody}</p>

      <div className="tp-divider my-5" />

      <Button variant="outline" size="sm" onClick={() => setConfirm({ kind: 'recalibrate' })}>
        <RotateCcw className="h-4 w-4" />
        {t.settingsExtra.recalibrateAction}
      </Button>
      <p className="tp-muted mt-2 text-xs leading-relaxed">
        {t.settingsExtra.recalibrateBody}
      </p>

      <div className="tp-divider my-5" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t.settingsExtra.trashTitle}</h3>
        <span className="tp-pill bg-black/5 tp-muted dark:bg-white/10">
          {interpolate(t.settingsExtra.trashCountTemplate, { count: trashed.length })}
        </span>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">{t.settingsExtra.trashBody}</p>

      {trashed.length === 0 ? (
        <p className="tp-muted mt-3 text-xs">{t.settingsExtra.trashEmpty}</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {trashed.map((task) => (
            <div
              key={task.id}
              className="tp-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
              <Button variant="ghost" size="sm" onClick={() => restore(task.id)}>
                {t.settingsExtra.restoreAction}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm({ kind: 'purge', taskId: task.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.settingsExtra.deleteForeverAction}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="tp-divider my-5" />

      <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: 'clear' })}>
        <Trash2 className="h-4 w-4" />
        {t.settingsExtra.clearAllAction}
      </Button>
      <p className="tp-muted mt-2 text-xs leading-relaxed">{t.settingsExtra.clearAllBody}</p>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={modalTitle}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>
              {t.settingsExtra.cancelAction}
            </Button>
            <Button size="sm" onClick={runConfirmed}>
              {t.settingsExtra.confirmAction}
            </Button>
          </div>
        }
      >
        <p className="tp-muted text-sm leading-relaxed">{modalBody}</p>
      </Modal>
    </section>
  );
}
