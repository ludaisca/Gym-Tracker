import { useMemo, useState, useEffect, useRef } from 'react'
import { TrendingUp, Check, ChevronDown } from 'lucide-react'
import type { ExerciseDef, ExerciseSession, WorkoutSession } from '../../types/domain'
import { isPR, getExerciseHistory, getLastRecordedSets, calc1RM, getProgressionSuggestion } from '../../lib/fitness'
import SetBox from './SetBox'
import ExerciseLineChart from './ExerciseLineChart'
import { hapticImpact, hapticPR } from '../../lib/haptics'

interface Props {
  exDef: ExerciseDef
  exState: ExerciseSession
  allSessions: WorkoutSession[]
  dayIds: string[]
  currentWeek: number
  number: number
  routineDays: Record<string, { exercises: ExerciseDef[] }>
  onToggleDone: () => void
  onSetChange: (setIdx: number, field: 'kg' | 'reps', value: string) => void
  onStartTimer: (seconds: number, label: string) => void
  onAutoFill?: (previousSets: { kg: string; reps: string }[]) => void
}

export default function ExerciseCard({
  exDef, exState, allSessions, dayIds, currentWeek, number, routineDays,
  onToggleDone, onSetChange, onStartTimer, onAutoFill,
}: Props) {
  const [open, setOpen] = useState(true)
  const prevHasPR = useRef(false)
  const kgInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (exState.done) setOpen(false)
  }, [exState.done])

  const max1RM = useMemo(() => {
    let max = 0
    exState.sets.forEach(s => {
      const rm = calc1RM(s.kg, s.reps)
      if (rm && rm > max) max = rm
    })
    return max
  }, [exState.sets])

  const currentBest = useMemo(() => {
    let best = 0
    exState.sets.forEach(s => {
      const kg = parseFloat(s.kg)
      if (!isNaN(kg) && kg > best) best = kg
    })
    return best || 0
  }, [exState.sets])

  const hasPR = useMemo(
    () => currentBest > 0 && isPR(allSessions, dayIds, exDef.name, String(currentBest), currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentBest, currentWeek, routineDays]
  )

  useEffect(() => {
    if (hasPR && !prevHasPR.current) hapticPR()
    prevHasPR.current = hasPR
  }, [hasPR])

  const history = useMemo(
    () => getExerciseHistory(allSessions, dayIds, exDef.name, currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentWeek, routineDays]
  )

  const lastRecordedSets = useMemo(
    () => getLastRecordedSets(allSessions, dayIds, exDef.name, currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentWeek, routineDays]
  )

  const suggestion = useMemo(
    () => getProgressionSuggestion(lastRecordedSets, exDef.reps),
    [lastRecordedSets, exDef.reps]
  )

  const isCurrentEmpty = useMemo(
    () => exState.sets.every(s => !s.kg || parseFloat(s.kg) === 0 || !s.reps || parseFloat(s.reps) === 0),
    [exState.sets]
  )

  const filledSets = exState.sets.filter(s => s.kg && parseFloat(s.kg) > 0 && s.reps && parseFloat(s.reps) > 0)

  const restLabel = exDef.rest >= 60
    ? `${Math.floor(exDef.rest / 60)}:${String(exDef.rest % 60).padStart(2, '0')}`
    : `${exDef.rest}s`

  return (
    <article className={`ex-block${exState.done ? ' ex-done' : ''}${open ? ' ex-open' : ''}`}>

      {/* ── Header ── */}
      <div className="ex-head" onClick={() => setOpen(o => !o)}>
        <span className="ex-num">{String(number).padStart(2, '0')}</span>

        <div className="ex-info">
          <div className="ex-name-row">
            <span className="ex-name-text">{exDef.name}</span>
            {hasPR && <span className="ex-pr-badge">PR</span>}
          </div>
          <div className="ex-meta-text">
            {open
              ? <>{exDef.sets} series · {exDef.reps} reps{max1RM > 0 && <> · <strong>1RM ≈ {max1RM} kg</strong></>}</>
              : filledSets.length > 0
                ? <span className="ex-collapsed-ok">{filledSets.length}/{exDef.sets} series · {currentBest} kg</span>
                : `${exDef.sets} series · ${exDef.reps} reps`
            }
          </div>
        </div>

        <button
          className="ex-rest-pill"
          type="button"
          aria-label="Iniciar timer de descanso"
          onClick={e => { e.stopPropagation(); onStartTimer(exDef.rest, exDef.name) }}
        >
          ⏱ {restLabel}
        </button>

        <button
          className={`ex-done-btn${exState.done ? ' checked' : ''}`}
          type="button"
          aria-label={exState.done ? 'Marcar incompleto' : 'Marcar completo'}
          onClick={e => { e.stopPropagation(); hapticImpact('light'); onToggleDone() }}
        >
          {exState.done && <Check size={15} />}
        </button>

        <span className="ex-chevron" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown size={15} />
        </span>
      </div>

      {/* ── Cuerpo — sin animación de height para evitar bug en WebView ── */}
      {open && (
        <div className="ex-body">
          {suggestion && (
            <div className="ex-suggestion">
              <TrendingUp size={11} />
              <span>Próxima: <strong>{suggestion.kg} kg</strong> × {suggestion.reps}</span>
            </div>
          )}

          {lastRecordedSets && onAutoFill && isCurrentEmpty && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 'var(--space-2)' }}>
              <button
                className="ghost-btn"
                style={{ padding: '.2rem .55rem', fontSize: 'var(--text-xs)' }}
                type="button"
                onClick={() => onAutoFill(lastRecordedSets)}
              >
                ⚡ Autocompletar
              </button>
            </div>
          )}

          <div className="ex-sets-wrap">
            {exState.sets.map((set, sidx) => (
              <SetBox
                key={sidx}
                setIndex={sidx}
                data={set}
                onChange={(field, value) => onSetChange(sidx, field, value)}
                kgInputRef={el => { kgInputRefs.current[sidx] = el }}
                onRepEnter={sidx < exState.sets.length - 1 ? () => kgInputRefs.current[sidx + 1]?.focus() : undefined}
              />
            ))}
          </div>

          {history.length >= 2 && <ExerciseLineChart history={history} />}
        </div>
      )}
    </article>
  )
}
