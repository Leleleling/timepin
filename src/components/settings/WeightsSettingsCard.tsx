import { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useAppStore } from '../../store/useAppStore';
import { useDict } from '../../utils/i18n';
import { sortTasks } from '../../utils/sorting';

/** U26：权重滑杆直接写入设置表，下方列表用同一排序函数实时预览。 */
export function WeightsSettingsCard() {
  const t = useDict();
  const { tasks, settings } = useTasks();
  const setWeights = useAppStore((state) => state.setWeights);
  const { importance, urgency } = settings.weights;

  const preview = useMemo(
    () =>
      sortTasks(
        tasks.filter(
          (task) =>
            task.status !== 'trash' &&
            task.status !== 'archived' &&
            task.status !== 'done',
        ),
        settings,
      ).slice(0, 5),
    [tasks, settings],
  );

  const slider = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    key: string,
  ) => (
    <div key={key}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="tp-label">{label}</span>
        <span className="tp-muted text-xs tabular-nums">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={0.5}
        max={3}
        step={0.1}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-brand"
      />
    </div>
  );

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-[18px] w-[18px] text-brand" />
        <h3 className="text-sm font-semibold">{t.hardeningExtra.weightsTitle}</h3>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">
        {t.hardeningExtra.weightsBody}
      </p>

      <div className="mt-4 space-y-3">
        {slider(t.hardeningExtra.weightsImportance, importance, (next) =>
          setWeights({ importance: next, urgency }), 'importance')}
        {slider(t.hardeningExtra.weightsUrgency, urgency, (next) =>
          setWeights({ importance, urgency: next }), 'urgency')}
      </div>

      <p className="tp-label mt-5 mb-2">{t.hardeningExtra.weightsPreview}</p>
      {preview.length === 0 ? (
        <p className="tp-muted text-xs">{t.task.emptyFilteredTitle}</p>
      ) : (
        <ol className="space-y-1">
          {preview.map((task, index) => (
            <li key={task.id} className="flex items-center gap-2 text-xs">
              <span className="tp-muted w-4 shrink-0 tabular-nums">{index + 1}</span>
              <span className="truncate">{task.title}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
