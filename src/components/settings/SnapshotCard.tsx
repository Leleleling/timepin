import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { applyBackupSnapshot, readBackupSnapshot } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { interpolate, useDict } from '../../utils/i18n';
import {
  AUTO_SNAPSHOT_INTERVAL_MS,
  captureSnapshot,
  lastSnapshotAt,
  listSnapshots,
  type LocalSnapshot,
} from '../../utils/snapshot';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/** U29：打开设置页时按 30 分钟节流自动留一份本地快照，也可手动创建与回滚。 */
export function SnapshotCard() {
  const t = useDict();
  const pushToast = useToastStore((state) => state.push);
  const hydrateFromSettings = useAppStore((state) => state.hydrateFromSettings);
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => listSnapshots());
  const [pending, setPending] = useState<LocalSnapshot | null>(null);

  useEffect(() => {
    if (Date.now() - lastSnapshotAt() < AUTO_SNAPSHOT_INTERVAL_MS) return;
    void readBackupSnapshot()
      .then((data) => {
        if (captureSnapshot(data)) setSnapshots(listSnapshots());
      })
      .catch((error: unknown) =>
        console.error('[timepin] Unable to capture automatic snapshot', error),
      );
  }, []);

  const create = () => {
    void readBackupSnapshot()
      .then((data) => {
        if (captureSnapshot(data)) setSnapshots(listSnapshots());
        pushToast({ message: t.feedback.exportOk, tone: 'success' });
      })
      .catch((error: unknown) => {
        console.error('[timepin] Unable to capture snapshot', error);
        pushToast({ message: t.feedback.saveError, tone: 'error' });
      });
  };

  const restore = () => {
    if (!pending) return;
    const data = pending.data;
    setPending(null);
    void applyBackupSnapshot(data, 'replace')
      .then(() => {
        hydrateFromSettings(data.settings);
        pushToast({ message: t.hardeningExtra.snapshotRestored, tone: 'success' });
      })
      .catch((error: unknown) => {
        console.error('[timepin] Unable to restore snapshot', error);
        pushToast({ message: t.feedback.saveError, tone: 'error' });
      });
  };

  return (
    <section className="tp-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <History className="h-[18px] w-[18px] text-brand" />
          <h3 className="text-sm font-semibold">{t.hardeningExtra.snapshotTitle}</h3>
        </div>
        <Button variant="outline" size="sm" onClick={create}>
          {t.hardeningExtra.snapshotCreate}
        </Button>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">
        {t.hardeningExtra.snapshotBody}
      </p>

      {snapshots.length === 0 ? (
        <p className="tp-muted mt-4 text-xs">{t.hardeningExtra.snapshotEmpty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {snapshots.map((item) => (
            <li
              key={item.id}
              className="tp-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-xs">
                {interpolate(t.hardeningExtra.snapshotItemTemplate, {
                  count: item.taskCount,
                  date: new Date(item.createdAt).toLocaleString(),
                })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPending(item)}>
                {t.hardeningExtra.snapshotRestore}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t.hardeningExtra.snapshotRestore}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t.action.cancel}
            </Button>
            <Button onClick={restore}>{t.action.confirm}</Button>
          </>
        }
      >
        <p className="tp-muted text-sm">
          {pending
            ? new Date(pending.createdAt).toLocaleString()
            : ''}
        </p>
      </Modal>
    </section>
  );
}
