import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useAuthStore } from '../../store'
import { nutritionApi } from '../../api/nutrition'
import { usersApi } from '../../api/users'
import { aiApi, type FoodAnalysisResult } from '../../api/ai'
import type { NutritionDay, FoodEntry, MealType, SavedFood } from '../../types/domain'

const MEAL_DEFS: { id: MealType; label: string; icon: ReactNode }[] = [
  {
    id: 'desayuno',
    label: 'Desayuno',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
  {
    id: 'almuerzo',
    label: 'Almuerzo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    id: 'cena',
    label: 'Cena',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
  },
  {
    id: 'snack',
    label: 'Snack',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 4v4"/><path d="M10 12h4"/>
      </svg>
    ),
  },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDate(date: string): string {
  if (date === todayISO()) return 'Hoy'
  return new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface FoodSheet {
  mealType: MealType
}

export default function Nutrition() {
  const { user, updateUser } = useAuthStore()
  const goals = {
    kcal:    user?.settings?.calorieGoal ?? 2500,
    protein: user?.settings?.proteinGoal ?? 150,
    carbs:   user?.settings?.carbGoal    ?? 250,
    fat:     user?.settings?.fatGoal     ?? 80,
    water:   user?.settings?.waterGoal   ?? 8,
  }

  const [date, setDate] = useState(todayISO())
  const [day, setDay] = useState<NutritionDay | null>(null)
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([])
  const [sheet, setSheet] = useState<FoodSheet | null>(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [weekAvg, setWeekAvg] = useState<{ kcal: number; protein: number; carbs: number; fat: number } | null>(null)

  const loadDay = useCallback(async (d: string) => {
    const data = await nutritionApi.getDay(d).catch(() => null)
    setDay(data)
  }, [])

  useEffect(() => { loadDay(date) }, [date, loadDay])
  useEffect(() => { nutritionApi.getSavedFoods().then(setSavedFoods).catch(() => {}) }, [])

  // Promedio últimos 7 días (excluye hoy para no sesgar con datos parciales)
  useEffect(() => {
    const dates: string[] = []
    for (let i = 1; i <= 7; i++) dates.push(shiftDate(todayISO(), -i))
    Promise.all(dates.map(d => nutritionApi.getDay(d).catch(() => null))).then(days => {
      const valid = days.filter((d): d is NutritionDay => d !== null && !!d.meals)
      if (valid.length === 0) { setWeekAvg(null); return }
      const sum = valid.reduce((acc, d) => {
        const ms = (d.meals ?? {}) as Partial<Record<MealType, FoodEntry[]>>
        Object.values(ms).flat().forEach((e: FoodEntry) => {
          acc.kcal    += Number(e.kcal)    || 0
          acc.protein += Number(e.protein) || 0
          acc.carbs   += Number(e.carbs)   || 0
          acc.fat     += Number(e.fat)     || 0
        })
        return acc
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
      setWeekAvg({
        kcal:    Math.round(sum.kcal    / valid.length),
        protein: Math.round(sum.protein / valid.length),
        carbs:   Math.round(sum.carbs   / valid.length),
        fat:     Math.round(sum.fat     / valid.length),
      })
    })
  }, [])

  const meals = (day?.meals ?? {}) as Partial<Record<MealType, FoodEntry[]>>
  const water = day?.water ?? 0

  const macros = MEAL_DEFS.reduce((acc, m) => {
    const entries = meals[m.id] ?? []
    entries.forEach(e => {
      acc.kcal    += Number(e.kcal)    || 0
      acc.protein += Number(e.protein) || 0
      acc.carbs   += Number(e.carbs)   || 0
      acc.fat     += Number(e.fat)     || 0
    })
    return acc
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  macros.kcal    = Math.round(macros.kcal)
  macros.protein = Math.round(macros.protein)
  macros.carbs   = Math.round(macros.carbs)
  macros.fat     = Math.round(macros.fat)

  const macroPct = macros.kcal > 0 ? {
    protein: Math.round(macros.protein * 4 / macros.kcal * 100),
    carbs:   Math.round(macros.carbs   * 4 / macros.kcal * 100),
    fat:     Math.round(macros.fat     * 9 / macros.kcal * 100),
  } : null

  async function updateWater(delta: number) {
    const newWater = Math.max(0, water + delta)
    const updated = await nutritionApi.updateDay(date, { water: newWater })
    setDay(updated)
  }

  async function removeFood(mealType: MealType, foodId: string) {
    await nutritionApi.removeFood(date, mealType, foodId)
    loadDay(date)
  }

  const over = macros.kcal > goals.kcal
  const isToday = date === todayISO()

  return (
    <>
      <section className="card">
        <div className="panel-head" style={{ paddingBottom: 0 }}>
          <div>
            <h3>Nutrición e Hidratación</h3>
            <p>Registro diario y progreso.</p>
          </div>
          <button
            className="icon-btn-subtle"
            onClick={() => setShowGoalModal(true)}
            title="Establecer metas propias"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2-2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
            </svg>
          </button>
        </div>

        <div className="nut-date-nav">
          <button className="nut-date-arrow" onClick={() => setDate(d => shiftDate(d, -1))}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div className="nut-date-label" style={{ textTransform: 'capitalize' }}>{fmtDate(date)}</div>
            <div className="nut-date-sub">{date}</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {!isToday && (
              <button className="nut-date-today" onClick={() => setDate(todayISO())}>Hoy</button>
            )}
            <button
              className="nut-date-arrow"
              onClick={() => setDate(d => shiftDate(d, 1))}
              disabled={isToday}
              style={isToday ? { opacity: .3 } : {}}
            >›</button>
          </div>
        </div>

        {/* ── Compact half-moon gauges (Slightly larger, 2x2 grid) ── */}
        <div className="nut-gauges-row grid-2x2">
          {[
            { label: 'Calorías', val: macros.kcal, goal: goals.kcal, unit: 'kcal', over, pct: null as number | null },
            { label: 'Proteína', val: macros.protein, goal: goals.protein, unit: 'g', over: false, pct: macroPct?.protein ?? null },
            { label: 'Carbos',   val: macros.carbs,   goal: goals.carbs,   unit: 'g', over: false, pct: macroPct?.carbs   ?? null },
            { label: 'Grasas',   val: macros.fat,     goal: goals.fat,     unit: 'g', over: false, pct: macroPct?.fat     ?? null },
          ].map(({ label, val, goal, unit, over: isOver, pct: macroPctVal }) => {
            const pct = Math.min(1, val / goal)
            const r = 36, circ = Math.PI * r, dash = pct * circ
            return (
              <div key={label} className="nut-gauge-item">
                <svg width="88" height="48" viewBox="0 0 88 48">
                  <path d="M 8 44 A 36 36 0 0 1 80 44" fill="none" stroke="var(--color-divider)" strokeWidth="7" strokeLinecap="round" />
                  <path
                    d="M 8 44 A 36 36 0 0 1 80 44"
                    fill="none"
                    stroke={isOver ? 'var(--color-warning)' : 'var(--color-primary)'}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="nut-gauge-val" style={{ fontSize: 'var(--text-base)', marginTop: '-2px' }}>{val}<span>{unit}</span></div>
                <div className="nut-gauge-label" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {label}
                  {macroPctVal !== null && macroPctVal > 0 && (
                    <span style={{ marginLeft: '4px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      {macroPctVal}%
                    </span>
                  )}
                </div>
                <div className="nut-gauge-goal">/ {goal}{unit}</div>
              </div>
            )
          })}
        </div>

        <div className="nut-water">
          <div>
            <div className="nut-water-label">Agua</div>
            <div className="nut-water-glasses">
              {Array.from({ length: goals.water }, (_, i) => (
                <span
                  key={i}
                  className={`nut-glass${i < water ? ' filled' : ''}`}
                  onClick={() => updateWater(i < water ? -1 : 1)}
                >
                  <svg width="12" height="14" viewBox="0 0 24 28" fill={i < water ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
                    <path d="M12 2C6 10 4 14 4 18a8 8 0 0 0 16 0c0-4-2-8-8-16Z"/>
                  </svg>
                </span>
              ))}
            </div>
          </div>
          <div className="nut-water-controls">
            <button className="nut-water-btn" onClick={() => updateWater(-1)}>−</button>
            <span className="nut-water-count">{water}/{goals.water}</span>
            <button className="nut-water-btn" onClick={() => updateWater(1)}>+</button>
          </div>
        </div>

        <div className="nut-meals">
          {MEAL_DEFS.map(({ id, label, icon }) => {
            const entries = meals[id] ?? []
            const mkcal = Math.round(entries.reduce((s, e) => s + (Number(e.kcal) || 0), 0))
            return (
              <div key={id} className="nut-meal-section">
                <div className="nut-meal-head">
                  <div>
                    <span className="nut-meal-label">{icon} {label}</span>
                    {mkcal > 0 && <span className="nut-meal-kcal">{mkcal} kcal</span>}
                  </div>
                  <button
                    className="ghost-btn"
                    style={{ padding: '.3rem .75rem', fontSize: 'var(--text-xs)' }}
                    onClick={() => setSheet({ mealType: id })}
                  >
                    + Agregar
                  </button>
                </div>
                {entries.length > 0 ? (
                  <div className="nut-food-list">
                    {entries.map(e => (
                      <div key={e.id} className="nut-food-row">
                        <div>
                          <div className="nut-food-name">{e.name}</div>
                          <div className="nut-food-macros">
                            {e.kcal}kcal{e.protein ? ` · P:${e.protein}g` : ''}{e.carbs ? ` · C:${e.carbs}g` : ''}{e.fat ? ` · G:${e.fat}g` : ''}
                          </div>
                        </div>
                        <button className="nut-remove-btn" onClick={() => removeFood(id, e.id)}>×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="tiny muted" style={{ padding: '0 var(--space-5) var(--space-3)' }}>Sin registros — toca Agregar</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {savedFoods.length > 0 && (
        <section className="card">
          <div className="panel-head">
            <div><h3>Alimentos favoritos</h3><p>Guardados para agregar rápidamente.</p></div>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {savedFoods.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="nut-saved-chip" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  {f.name} <span style={{ opacity: .6 }}>{f.kcal}kcal</span>
                </div>
                <button
                  className="nut-remove-btn"
                  onClick={async () => { await nutritionApi.deleteSavedFood(f.id); setSavedFoods(p => p.filter(x => x.id !== f.id)) }}
                >×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {weekAvg && (
        <section className="card">
          <div className="panel-head">
            <div><h3>Promedio últimos 7 días</h3><p>Excluye el día actual (datos parciales).</p></div>
          </div>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', textAlign: 'center' }}>
            {[
              { label: 'Calorías', val: weekAvg.kcal, unit: 'kcal', goal: goals.kcal },
              { label: 'Proteína', val: weekAvg.protein, unit: 'g', goal: goals.protein },
              { label: 'Carbos',   val: weekAvg.carbs,   unit: 'g', goal: goals.carbs },
              { label: 'Grasas',   val: weekAvg.fat,     unit: 'g', goal: goals.fat },
            ].map(({ label, val, unit, goal }) => {
              const ratio = Math.min(1, val / goal)
              const color = ratio >= 0.9 ? 'var(--color-primary)' : ratio >= 0.7 ? 'var(--color-warning)' : 'var(--color-text-muted)'
              return (
                <div key={label}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color }}>{val}<span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, marginLeft: '2px' }}>{unit}</span></div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>{label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>meta {goal}{unit}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {sheet && (
        <FoodSheetModal
          mealType={sheet.mealType}
          savedFoods={savedFoods}
          hasAI={!!(user?.settings?.aiProvider && user?.settings?.aiKeySet)}
          onSave={async (food, save) => {
            const added = await nutritionApi.addFood(date, sheet.mealType, food)
            setDay(d => {
              if (!d) return { id: '', userId: '', date, water: 0, meals: { [sheet.mealType]: [added] } as Record<MealType, FoodEntry[]> } as NutritionDay
              const prevMeals = (d.meals ?? {}) as Record<string, FoodEntry[]>
              const updated = { ...d, meals: { ...prevMeals, [sheet.mealType]: [...(prevMeals[sheet.mealType] ?? []), added] } }
              return updated as NutritionDay
            })
            if (save) {
              const saved = await nutritionApi.saveFood(food).catch(() => null)
              if (saved) setSavedFoods(p => [...p, saved])
            }
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {showGoalModal && (
        <GoalModal
          currentGoals={goals}
          onSave={async (newGoals) => {
            try {
              const updatedSettings = await usersApi.updateSettings({
                calorieGoal: newGoals.kcal,
                proteinGoal: newGoals.protein,
                carbGoal: newGoals.carbs,
                fatGoal: newGoals.fat,
                waterGoal: newGoals.water,
              })
              updateUser({ settings: { ...user?.settings, ...updatedSettings } })
              setShowGoalModal(false)
            } catch (err) {
              alert('Error al guardar metas')
            }
          }}
          onClose={() => setShowGoalModal(false)}
        />
      )}
    </>
  )
}

interface FoodSheetModalProps {
  mealType: MealType
  savedFoods: SavedFood[]
  hasAI: boolean
  onSave: (food: Omit<FoodEntry, 'id'>, saveToFavorites: boolean) => void
  onClose: () => void
}

function confidenceLevel(c: number): 'high' | 'medium' | 'low' {
  if (c >= 0.8) return 'high'
  if (c >= 0.6) return 'medium'
  return 'low'
}

function FoodSheetModal({ mealType, savedFoods, hasAI, onSave, onClose }: FoodSheetModalProps) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saveFav, setSaveFav] = useState(false)

  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<FoodAnalysisResult | null>(null)
  const [hiddenSugs, setHiddenSugs] = useState<string[]>([])
  const [aiError, setAiError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function selectSaved(f: SavedFood) {
    setName(f.name); setKcal(String(f.kcal)); setProtein(String(f.protein)); setCarbs(String(f.carbs)); setFat(String(f.fat))
    setAiResult(null); setImgPreview(null)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setAiLoading(true)
    setAiError(null)
    setAiResult(null)

    try {
      // Comprimir imagen a máx 900px con Canvas antes de enviar
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 900
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })

      setImgPreview(compressedDataUrl)
      const base64 = compressedDataUrl.split(',')[1]
      const result = await aiApi.analyzeFood(base64, 'image/jpeg')
      setAiResult(result)
      setName(result.dish_name)
      setKcal(String(result.total_kcal))
      setProtein(String(result.total_protein_g))
      setCarbs(String(result.total_carbs_g))
      setFat(String(result.total_fat_g))
      setHiddenSugs(result.hidden_suggestions ?? [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al analizar la foto'
      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }

  function submit() {
    if (!name.trim() || !kcal) return
    onSave({ name: name.trim(), kcal: Number(kcal), protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0 }, saveFav)
  }

  const mealLabel = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', snack: 'Snack' }[mealType]
  const confLevel = aiResult ? confidenceLevel(aiResult.confidence_overall) : null
  const confPct = aiResult ? Math.round(aiResult.confidence_overall * 100) : 0

  return (
    <div className="confirm-overlay open" style={{ zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="confirm-sheet" style={{ maxWidth: 480 }}>
        <div className="confirm-sheet-handle" />
        <h3>Agregar a {mealLabel}</h3>

        {savedFoods.length > 0 && (
          <div className="nut-saved-chips">
            {savedFoods.map(f => (
              <button key={f.id} className="nut-saved-chip" onClick={() => selectSaved(f)}>
                ⭐ {f.name} <span style={{ opacity: .6 }}>{f.kcal}kcal</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Foto IA ─────────────────────────────────────── */}
        {hasAI && (
          <div className="food-photo-area">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />

            {!imgPreview && !aiLoading && (
              <button className="food-photo-btn" onClick={() => fileRef.current?.click()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Analizar foto con IA
              </button>
            )}

            {(imgPreview || aiLoading) && (
              <div className="food-preview-row">
                {imgPreview && (
                  <button onClick={() => fileRef.current?.click()} style={{ padding: 0, background: 'none', border: 'none' }}>
                    <img src={imgPreview} alt="Vista previa" className="food-preview-img" />
                  </button>
                )}
                <div className="food-preview-meta">
                  {aiLoading && (
                    <div className="food-ai-loading">
                      <div className="spinner" />
                      Analizando tu plato…
                    </div>
                  )}
                  {!aiLoading && aiResult && confLevel && (
                    <>
                      <span className={`food-confidence ${confLevel}`}>
                        {confLevel === 'high' ? '✓' : confLevel === 'medium' ? '~' : '?'} {confPct}% confianza
                      </span>
                      {aiResult.notes && <p className="food-ai-note">{aiResult.notes}</p>}
                    </>
                  )}
                  {!aiLoading && aiError && (
                    <p className="food-ai-error">{aiError}</p>
                  )}
                </div>
              </div>
            )}

            {!aiLoading && aiResult && aiResult.items.length > 0 && (
              <div className="food-items-list">
                {aiResult.items.map((item, i) => (
                  <div key={i} className="food-item-row">
                    <span className="food-item-name">{item.name}</span>
                    <span className="food-item-macros">{item.kcal} kcal · P:{item.protein_g}g C:{item.carbs_g}g G:{item.fat_g}g</span>
                  </div>
                ))}
              </div>
            )}

            {hiddenSugs.length > 0 && (
              <div className="food-hidden-chips">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', alignSelf: 'center' }}>¿Olvidaste?</span>
                {hiddenSugs.map((s, i) => (
                  <button key={i} className="food-hidden-chip" onClick={() => setHiddenSugs(p => p.filter((_, j) => j !== i))}>
                    + {s} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="panel-body" style={{ display: 'grid', gap: 'var(--space-3)', padding: 0 }}>
          <div className="field"><label>Alimento</label><input placeholder="Ej. Pollo a la plancha" value={name} onChange={e => setName(e.target.value)} autoFocus={!hasAI} /></div>
          <div className="food-macro-grid">
            <div className="field"><label>Kcal</label><input type="number" placeholder="0" value={kcal} onChange={e => setKcal(e.target.value)} /></div>
            <div className="field"><label>Proteína g</label><input type="number" placeholder="0" value={protein} onChange={e => setProtein(e.target.value)} /></div>
            <div className="field"><label>Carbos g</label><input type="number" placeholder="0" value={carbs} onChange={e => setCarbs(e.target.value)} /></div>
            <div className="field"><label>Grasa g</label><input type="number" placeholder="0" value={fat} onChange={e => setFat(e.target.value)} /></div>
          </div>
          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={saveFav} onChange={e => setSaveFav(e.target.checked)} />
            Guardar en favoritos
          </label>
        </div>

        <div className="confirm-sheet-actions">
          <button className="primary-btn" onClick={submit} disabled={!name.trim() || !kcal}>Agregar</button>
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

interface GoalModalProps {
  currentGoals: { kcal: number; protein: number; carbs: number; fat: number; water: number }
  onSave: (g: { kcal: number; protein: number; carbs: number; fat: number; water: number }) => void
  onClose: () => void
}

function GoalModal({ currentGoals, onSave, onClose }: GoalModalProps) {
  const [kcal, setKcal] = useState(currentGoals.kcal)
  const [protein, setProtein] = useState(currentGoals.protein)
  const [carbs, setCarbs] = useState(currentGoals.carbs)
  const [fat, setFat] = useState(currentGoals.fat)
  const [water, setWater] = useState(currentGoals.water)

  return (
    <div className="confirm-overlay open" style={{ zIndex: 300 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="confirm-sheet" style={{ maxWidth: 400 }}>
        <div className="confirm-sheet-handle" />
        <h3>Ajustar Metas Propias</h3>
        <p className="tiny muted">Personaliza tus objetivos diarios de nutrición.</p>
        <div className="panel-body" style={{ display: 'grid', gap: 'var(--space-3)', padding: 'var(--space-4) 0' }}>
          <div className="field"><label>Calorías (kcal)</label><input type="number" value={kcal} onChange={e => setKcal(Number(e.target.value))} /></div>
          <div className="food-macro-grid">
            <div className="field"><label>Proteína (g)</label><input type="number" value={protein} onChange={e => setProtein(Number(e.target.value))} /></div>
            <div className="field"><label>Carbos (g)</label><input type="number" value={carbs} onChange={e => setCarbs(Number(e.target.value))} /></div>
            <div className="field"><label>Grasa (g)</label><input type="number" value={fat} onChange={e => setFat(Number(e.target.value))} /></div>
          </div>
          <div className="field"><label>Agua (vasos)</label><input type="number" value={water} onChange={e => setWater(Number(e.target.value))} /></div>
        </div>
        <div className="confirm-sheet-actions">
          <button className="primary-btn" onClick={() => onSave({ kcal, protein, carbs, fat, water })}>Guardar cambios</button>
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
