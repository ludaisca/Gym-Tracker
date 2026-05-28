import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { ChevronDown, TrendingUp } from 'lucide-react'
import type { ExerciseDef } from '../../types/domain'
import type { ExerciseSession } from '../../types/domain'
import { isPR, getExerciseHistory, getLastRecordedSets, calc1RM, getProgressionSuggestion } from '../../lib/fitness'
import type { WorkoutSession } from '../../types/domain'
import SetBox from './SetBox'
import ExerciseLineChart from './ExerciseLineChart'
import { hapticImpact, hapticPR } from '../../lib/haptics'

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
  const [open, setOpen] = useState(true)
  const prevHasPR = useRef(false)
  const kgInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-colapsa cuando se marca como hecho
  useEffect(() => {
    if (exState.done) setOpen(false)
  }, [exState.done])

  // Motion value para swipe
  const dragX = useMotionValue(0)
  const swipeBgOpacity = useTransform(dragX, [-80, -30], [1, 0])

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

  const isCurrentEmpty = useMemo(() => {
    return exState.sets.every((s) => !s.kg || parseFloat(s.kg) === 0 || !s.reps || parseFloat(s.reps) === 0)
  }, [exState.sets])

  // Resumen compacto para el estado colapsado
  const collapsedSummary = useMemo(() => {
    const filled = exState.sets.filter(s => s.kg && parseFloat(s.kg) > 0 && s.reps && parseFloat(s.reps) > 0)
    if (filled.length === 0) return `${exDef.sets} series · ${exDef.reps} reps`
    const best = filled.reduce((b, s) => {
      const kg = parseFloat(s.kg)
      return kg > b ? kg : b
    }, 0)
    return `${filled.length}/${exDef.sets} series · ${best} kg`
  }, [exState.sets, exDef.sets, exDef.reps])

  const restLabel = exDef.rest >= 60
    ? `${Math.floor(exDef.rest / 60)}:${String(exDef.rest % 60).padStart(2, '0')}`
    : `${exDef.rest}s`

  return (
    <motion.article
      layout
      className={`exercise-item${exState.done ? ' done' : ''}`}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
    >
      {/* ── Header — siempre visible, swipe izquierda = done, click = expandir ── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <motion.div className="swipe-check-bg" style={{ opacity: swipeBgOpacity }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
        <motion.div
          drag="x"
          dragConstraints={{ left: -80, right: 0 }}
          dragElastic={0.15}
          style={{ x: dragX, touchAction: 'pan-y' }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -55) { hapticImpact('light'); onToggleDone() }
          }}
          className="exercise-top exercise-accordion-header"
          onClick={() => setOpen(o => !o)}
        >
        <button
          className="exercise-check"
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleDone() }}
        >
          {exState.done ? '✓' : ''}
        </button>

        <div style={{ minWidth: 0 }}>
          <div className="exercise-name">
            {exDef.name}
            {hasPR && <span className="pr-badge">🏆 PR</span>}
          </div>
          <div className="exercise-meta">
            {open
              ? <>Series: {exDef.sets} · Reps: {exDef.reps}{max1RM > 0 && <span> · <strong>1RM ≈ {max1RM} kg</strong></span>}</>
              : <span className="exercise-collapsed-summary">{collapsedSummary}</span>
            }
          </div>
        </div>

        <div
          className="rest-tag"
          title="Iniciar timer de descanso"
          onClick={(e) => { e.stopPropagation(); onStartTimer(exDef.rest, exDef.name) }}
        >
          ⏱ {restLabel}
        </div>

        <div className="rep-tag">{exDef.reps}</div>

        <motion.span
          className="exercise-chevron"
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown size={16} />
        </motion.span>
        </motion.div>
      </div>

      {/* ── Cuerpo colapsable ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {suggestion && (
              <div className="progression-hint">
                <TrendingUp size={11} />
                Próxima sesión: <strong>{suggestion.kg} kg</strong> · {suggestion.reps} reps
              </div>
            )}

            {lastRecordedSets && onAutoFill && isCurrentEmpty && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 var(--space-4) .5rem' }}>
                <button
                  className="ghost-btn"
                  style={{ padding: '.25rem .6rem', fontSize: 'var(--text-xs)' }}
                  type="button"
                  onClick={() => onAutoFill(lastRecordedSets)}
                  title="Copiar series de la última sesión registrada"
                >
                  ⚡ Autocompletar con sesión anterior
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
                  kgInputRef={el => { kgInputRefs.current[sidx] = el }}
                  onRepEnter={sidx < exState.sets.length - 1 ? () => kgInputRefs.current[sidx + 1]?.focus() : undefined}
                />
              ))}
            </div>

            {history.length >= 2 && <ExerciseLineChart history={history} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
