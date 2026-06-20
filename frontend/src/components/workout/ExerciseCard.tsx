import { useMemo } from 'react'
import { IconCheck, IconBolt, IconTrophy } from '../ui/Icons'
import type { ExerciseDef } from '../../types/domain'
import type { ExerciseSession } from '../../types/domain'
import { isPR, getExerciseHistory, getLastRecordedSets, calc1RM } from '../../lib/fitness'
import type { WorkoutSession } from '../../types/domain'
import SetBox from './SetBox'
import ExerciseLineChart from './ExerciseLineChart'

interface Props {
  exDef: ExerciseDef
  exState: ExerciseSession
  allSessions: WorkoutSession[]
  dayIds: string[]
  currentWeek: number
  routineDays: Record<string, { exercises: ExerciseDef[] }>
  onToggleDone: () => void
  onSetChange: (setIdx: number, field: 'kg' | 'reps', value: string) => void
  onStartTimer: (seconds: number, label: string) => void
  onAutoFill?: (previousSets: { kg: string; reps: string }[]) => void
}

export default function ExerciseCard({
  exDef, exState, allSessions, dayIds, currentWeek, routineDays,
  onToggleDone, onSetChange, onStartTimer, onAutoFill,
}: Props) {
  const currentBest = useMemo(() => {
    let best = 0
    exState.sets.forEach(s => {
      const kg = parseFloat(s.kg)
      if (!isNaN(kg) && kg > best) best = kg
    })
    return best || 0
  }, [exState.sets])

  const max1RM = useMemo(() => {
    let max = 0
    exState.sets.forEach((s) => {
      const rm = calc1RM(s.kg, s.reps)
      if (rm && rm > max) max = rm
    })
    return max
  }, [exState.sets])

  const hasPR = useMemo(
    () => currentBest > 0 && isPR(allSessions, dayIds, exDef.name, String(currentBest), currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentBest, currentWeek, routineDays]
  )

  const history = useMemo(
    () => getExerciseHistory(allSessions, dayIds, exDef.name, currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentWeek, routineDays]
  )

  const lastRecordedSets = useMemo(
    () => getLastRecordedSets(allSessions, dayIds, exDef.name, currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentWeek, routineDays]
  )

  const isCurrentEmpty = useMemo(() => {
    return exState.sets.every((s) => !s.kg || parseFloat(s.kg) === 0 || !s.reps || parseFloat(s.reps) === 0)
  }, [exState.sets])

  return (
    <article className={`exercise-item${exState.done ? ' done' : ''}`}>
      <div className="exercise-top">
        <button className="exercise-check" type="button" onClick={onToggleDone} aria-label={exState.done ? 'Marcar como pendiente' : 'Marcar como completo'}>
          {exState.done && <IconCheck size={16} strokeWidth={2.5} />}
        </button>
        <div>
          <div className="exercise-name">
            {exDef.name}
            {hasPR && <span className="pr-badge"><IconTrophy size={11} strokeWidth={2} /> PR</span>}
          </div>
          <div className="exercise-meta">
            Series: {exDef.sets} · Reps objetivo: {exDef.reps}
            {max1RM > 0 && <span> · <strong>1RM máx ≈ {max1RM} kg</strong></span>}
          </div>
        </div>
        <div
          className="rest-tag"
          style={{ cursor: 'pointer' }}
          title="Iniciar timer de descanso"
          onClick={() => onStartTimer(exDef.rest, exDef.name)}
        >
          ⏱ {exDef.rest >= 60 ? `${Math.floor(exDef.rest / 60)}:${String(exDef.rest % 60).padStart(2, '0')}` : `${exDef.rest}s`}
        </div>
        <div className="rep-tag">{exDef.reps}</div>
      </div>

      {lastRecordedSets && onAutoFill && isCurrentEmpty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.5rem' }}>
          <button
            className="ghost-btn"
            style={{ padding: '.25rem .6rem', fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}
            type="button"
            onClick={() => onAutoFill(lastRecordedSets)}
            title="Copiar series de la última sesión registrada"
          >
            <IconBolt size={12} strokeWidth={2} /> Autocompletar con sesión anterior
          </button>
        </div>
      )}

      <div className="sets">
        {exState.sets.map((set, sidx) => (
          <SetBox
            key={sidx}
            setIndex={sidx}
            data={set}
            restSeconds={exDef.rest}
            exerciseName={exDef.name}
            onChange={(field, value) => onSetChange(sidx, field, value)}
            onStartTimer={onStartTimer}
          />
        ))}
      </div>

      {history.length >= 2 && <ExerciseLineChart history={history} />}
    </article>
  )
}
