import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { interpolate, useDict } from '../../utils/i18n';
import { QUESTIONNAIRE } from '../../utils/questionnaire';
import { urgencyCurve } from '../../utils/urgency';

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 96;

/** U25：把对数插值曲线画成 SVG，并提供十题「单题重答」入口。 */
export function UrgencyCurveCard() {
  const t = useDict();
  const navigate = useNavigate();
  const { profile } = useTasks();
  const points = urgencyCurve(profile, 48);
  const first = points[0];
  const last = points[points.length - 1];
  const minLog = Math.log(first.hours);
  const maxLog = Math.log(last.hours);
  const toX = (hours: number) =>
    ((Math.log(hours) - minLog) / (maxLog - minLog)) * (VIEW_WIDTH - 8) + 4;
  const toY = (score: number) =>
    VIEW_HEIGHT - 4 - ((score - 1) / 4) * (VIEW_HEIGHT - 8);
  const polyline = points
    .map((point) => `${toX(point.hours).toFixed(1)},${toY(point.score).toFixed(1)}`)
    .join(' ');

  return (
    <section className="tp-surface p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-[18px] w-[18px] text-brand" />
        <h3 className="text-sm font-semibold">{t.hardeningExtra.curveTitle}</h3>
      </div>
      <p className="tp-muted mt-1.5 text-xs leading-relaxed">
        {t.hardeningExtra.curveBody}
      </p>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={t.hardeningExtra.curveTitle}
        className="mt-4 w-full rounded-lg bg-black/[0.03] dark:bg-white/[0.05]"
      >
        {[1, 3, 5].map((score) => (
          <line
            key={score}
            x1={0}
            x2={VIEW_WIDTH}
            y1={toY(score)}
            y2={toY(score)}
            className="stroke-black/10 dark:stroke-white/10"
            strokeWidth={1}
          />
        ))}
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand"
        />
      </svg>
      <div className="tp-muted mt-1.5 flex justify-between text-[11px]">
        <span>{t.hardeningExtra.curveAxisScore} 1–5</span>
        <span>
          {t.hardeningExtra.curveAxisHours} {Math.round(first.hours)}–{Math.round(last.hours)}
        </span>
      </div>

      <p className="tp-label mt-4 mb-2">{t.hardeningExtra.curveReanswer}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {QUESTIONNAIRE.map((question, index) => (
          <button
            key={question.key}
            type="button"
            onClick={() => navigate(`/onboarding?q=${index}`)}
            className="tp-focus tp-pill tp-border cursor-pointer border transition-all duration-200 hover:border-brand/40 hover:text-brand"
          >
            {interpolate(t.quiz.stepTemplate, {
              current: index + 1,
              total: QUESTIONNAIRE.length,
            })}
          </button>
        ))}
      </div>
    </section>
  );
}
