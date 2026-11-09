import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveUrgencyProfile } from '../db';
import type { UrgencyProfile } from '../db/models';
import { useAppStore } from '../store/useAppStore';
import { interpolate, useDict } from '../utils/i18n';
import { QUESTIONNAIRE, answeredProfile, skippedProfile } from '../utils/questionnaire';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';

const EMPTY_SELECTIONS: (number | null)[] = QUESTIONNAIRE.map(() => null);

/** 首次紧急度问卷：十题逐题作答、自动进入下一题，或跳过使用默认曲线。 */
export default function Onboarding() {
  const t = useDict();
  const navigate = useNavigate();
  const prefill = useAppStore((state) => state.prefill);
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<(number | null)[]>(EMPTY_SELECTIONS);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const finish = (profile: UrgencyProfile) => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    void saveUrgencyProfile(profile)
      .then(() => {
        navigate('/', { replace: true });
        if (prefill?.title || prefill?.due) openTaskModal(prefill);
      })
      .catch((error: unknown) => {
        console.error('[timepin] Unable to save questionnaire', error);
        setSaving(false);
        setFailed(true);
      });
  };

  const choose = (optionIndex: number) => {
    if (saving) return;
    const next = [...selections];
    next[index] = optionIndex;
    setSelections(next);
    if (index < QUESTIONNAIRE.length - 1) {
      setIndex(index + 1);
    } else {
      finish(answeredProfile(next));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-sun/10 blur-3xl"
      />

      <div className="tp-rise relative w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-card shadow-soft" />
            <div>
              <p className="text-sm font-semibold leading-tight">{t.app.name}</p>
              <p className="tp-muted text-xs">{t.quiz.intro}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => finish(skippedProfile())}>
            {t.quiz.skip}
          </Button>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="tp-label">{t.quiz.eyebrow}</span>
            <span className="tp-muted text-xs">
              {interpolate(t.quiz.stepTemplate, {
                current: index + 1,
                total: QUESTIONNAIRE.length,
              })}
            </span>
          </div>
          <div className="flex gap-1.5">
            {QUESTIONNAIRE.map((question, position) => (
              <span
                key={question.key}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-200',
                  position <= index ? 'bg-brand' : 'bg-black/10 dark:bg-white/10',
                )}
              />
            ))}
          </div>
        </div>

        <section className="tp-surface tp-pop-in p-6 sm:p-7">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-2xl font-bold leading-snug tracking-tight">
            {t.quiz.questions[index]}
          </h1>

          <div className="mt-6 space-y-2">
            {t.quiz.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                disabled={saving}
                aria-pressed={selections[index] === optionIndex}
                onClick={() => choose(optionIndex)}
                className={cn(
                  'tp-focus tp-border flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-200 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60',
                  selections[index] === optionIndex
                    ? 'border-brand bg-brand-soft text-brand-deep dark:bg-brand/15 dark:text-brand-deep'
                    : 'tp-muted hover:border-brand/40 hover:text-brand',
                )}
              >
                <span>{option}</span>
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-200',
                    selections[index] === optionIndex
                      ? 'border-brand bg-brand text-white'
                      : 'border-black/10 dark:border-white/20',
                  )}
                >
                  {optionIndex + 1}
                </span>
              </button>
            ))}
          </div>

          {saving ? (
            <p className="tp-muted mt-4 text-center text-xs">{t.quiz.saving}</p>
          ) : null}
          {failed ? (
            <p role="alert" className="mt-4 text-center text-sm font-medium text-brand">
              {t.feedback.saveError}
            </p>
          ) : null}
        </section>

        <p className="tp-muted mx-auto mt-5 max-w-md text-center text-xs leading-relaxed">
          {t.quiz.optionHint} · {t.quiz.note}
        </p>
      </div>
    </div>
  );
}
