import { useMemo } from 'react'
import type { ExerciseDef } from '../../types/domain'
import type { ExerciseSession } from '../../types/domain'
import { isPR, getExerciseHistory } from '../../lib/fitness'
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
}

export default function ExerciseCard({
  exDef, exState, allSessions, dayIds, currentWeek, routineDays,
  onToggleDone, onSetChange, onStartTimer,
}: Props) {
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

  const history = useMemo(
    () => getExerciseHistory(allSessions, dayIds, exDef.name, currentWeek, routineDays),
    [allSessions, dayIds, exDef.name, currentWeek, routineDays]
  )

  return (
    <article className={`exercise-item${exState.done ? ' done' : ''}`}>
      <div className="exercise-top">
        <button className="exercise-check" type="button" onClick={onToggleDone}>
          {exState.done ? '✓' : ''}
        </button>
        <div>
          <div className="exercise-name">
            {exDef.name}
            {hasPR && <span className="pr-badge">🏆 PR</span>}
          </div>
          <div className="exercise-meta">
            Series: {exDef.sets} · Reps objetivo: {exDef.reps}
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
