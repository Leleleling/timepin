import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Database, RotateCcw, Trash2 } from 'lucide-react';
import { db, ensureDefaults } from '../../db';
import { useTasks } from '../../hooks/useTasks';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { interpolate, useDict } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type Confirm =
  | { kind: 'recalibrate' }
  | { kind: 'clear' }
  | { kind: 'archiveDone' }
  | { kind: 'purge'; taskId: string }
  | null;

/** 本机数据卡：重新校准、回收站恢复/彻底删除、清空全部数据（均带二次确认）。 */
export function SettingsDataCard() {
  const t = useDict();
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const setRecalibrating = useAppStore((state) => state.setRecalibrating);
  const hydrateFromSettings = useAppStore((state) => state.hydrateFromSettings);
  const pushToast = useToastStore((state) => state.push);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const trashed = tasks.filter((task) => task.status === 'trash');

  const modalTitle =
    confirm?.kind === 'recalibrate'
      ? t.settingsExtra.recalibrateAction
      : confirm?.kind === 'clear'
        ? t.settingsExtra.clearAllAction
        : confirm?.kind === 'archiveDone'
          ? t.bulkExtra.archiveDone
          : t.settingsExtra.trashTitle;
  const modalBody =
    confirm?.kind === 'recalibrate'
      ? t.settingsExtra.recalibrateConfirm
      : confirm?.kind === 'clear'
        ? t.settingsExtra.clearAllConfirm
        : confirm?.kind === 'archiveDone'
          ? t.bulkExtra.archiveDoneConfirm
          : t.settingsExtra.trashBody;

  const runConfirmed = () => {
    const current = confirm;
    setConfirm(null);
    if (!current) return;

    if (current.kind === 'recalibrate') {
      // 标记后主动进入问卷页，避免首次问卷 gate 把用户从设置页强制弹走（M5）。
      setRecalibrating(true);
      void db.urgencyProfile
        .delete('default')
        .then(() => navigate('/onboarding'))
        .catch((error: unknown) => {
          console.error('[timepin] Unable to reset calibration', error);
          setRecalibrating(false);
          pushToast({ message: t.feedback.saveError, tone: 'error' });
        });
      return;
    }
    if (current.kind === 'archiveDone') {
      // U10：永久清除已完成任务，带二次确认并给出可见结果。
      void db.tasks
        .filter((task) => task.status === 'done')
        .delete()
        .then(() =>
          pushToast({ message: t.bulkExtra.archiveDoneOk, tone: 'success' }),
        )
        .catch((error: unknown) => {
          console.error('[timepin] Unable to clear completed tasks', error);
          pushToast({ message: t.feedback.saveError, tone: 'error' });
        });
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
      .then((settings) => {
        // 清空后把默认设置重灌回 store，语言与主题立即与重置后的 DB 一致（M5）。
        hydrateFromSettings(settings);
        pushToast({ message: t.settingsExtra.clearAllDone, tone: 'success' });
      })
      .catch((error: unknown) => {
        console.error('[timepin] Unable to erase local data', error);
        pushToast({ message: t.feedback.saveError, tone: 'error' });
      });
  };

  const restore = (id: string) => {
    // 优先还原软删前的状态（已完成/归档），旧数据没有该字段时才回退到待办（T14）。
    const previous = tasks.find((task) => task.id === id)?.preTrashStatus ?? 'todo';
    void updateTask(id, { status: previous, preTrashStatus: undefined }).catch(
      (error: unknown) => console.error('[timepin] Unable to restore task', error),
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

      <Button variant="outline" size="sm" onClick={() => setConfirm({ kind: 'archiveDone' })}>
        <CheckCheck className="h-4 w-4" />
        {t.bulkExtra.archiveDone}
      </Button>
      <p className="tp-muted mt-2 text-xs leading-relaxed">{t.bulkExtra.archiveDoneBody}</p>

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
