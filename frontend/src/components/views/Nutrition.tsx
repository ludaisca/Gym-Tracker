import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../../store'
import { nutritionApi } from '../../api/nutrition'
import { aiApi, type FoodAnalysisResult } from '../../api/ai'
import type { NutritionDay, FoodEntry, MealType, SavedFood } from '../../types/domain'

const MEAL_DEFS: { id: MealType; label: string; icon: string }[] = [
  { id: 'desayuno', label: 'Desayuno', icon: '🌅' },
  { id: 'almuerzo', label: 'Almuerzo', icon: '☀️' },
  { id: 'cena',     label: 'Cena',     icon: '🌙' },
  { id: 'snack',    label: 'Snack',    icon: '🍎' },
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
  const { user } = useAuthStore()
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

  const loadDay = useCallback(async (d: string) => {
    const data = await nutritionApi.getDay(d).catch(() => null)
    setDay(data)
  }, [])

  useEffect(() => { loadDay(date) }, [date, loadDay])
  useEffect(() => { nutritionApi.getSavedFoods().then(setSavedFoods).catch(() => {}) }, [])

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

  async function updateWater(delta: number) {
    const newWater = Math.max(0, water + delta)
    const updated = await nutritionApi.updateDay(date, { water: newWater })
    setDay(updated)
  }

  async function removeFood(mealType: MealType, foodId: string) {
    await nutritionApi.removeFood(date, mealType, foodId)
    loadDay(date)
  }

  const circum = 251
  const calsPercent = Math.min(1, macros.kcal / goals.kcal)
  const offset = circum - calsPercent * circum
  const over = macros.kcal > goals.kcal
  const remaining = goals.kcal - macros.kcal
  const isToday = date === todayISO()

  return (
    <>
      <section className="card">
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

        <div className="nut-summary">
          <div className="nut-cal-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle className="nut-cal-ring-bg" cx="48" cy="48" r="40" />
              <circle
                className={`nut-cal-ring-prog${over ? ' over' : ''}`}
                cx="48" cy="48" r="40"
                strokeDasharray={circum}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="nut-cal-center">
              <div className="nut-cal-num">{macros.kcal}</div>
              <div className="nut-cal-label">kcal</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              {over
                ? <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>+{Math.abs(remaining)} kcal sobre el objetivo</span>
                : <><strong>{remaining}</strong> kcal restantes de {goals.kcal}</>
              }
            </div>
            <div className="nut-macro-bars">
              {[
                { label: 'Proteínas', val: macros.protein, goal: goals.protein, cls: 'protein' },
                { label: 'Carbos',    val: macros.carbs,   goal: goals.carbs,   cls: 'carbs' },
                { label: 'Grasas',    val: macros.fat,     goal: goals.fat,     cls: 'fat' },
              ].map(({ label, val, goal, cls }) => (
                <div key={cls} className="nut-macro-row">
                  <div className="nut-macro-name">{label}</div>
                  <div className="nut-macro-bar-wrap">
                    <div className={`nut-macro-bar ${cls}`} style={{ width: `${Math.min(100, Math.round(val / goal * 100))}%` }} />
                  </div>
                  <div className="nut-macro-val">{val}/{goal}g</div>
                </div>
              ))}
            </div>
          </div>
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
                >💧</span>
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
                <div className="nut-saved-chip" style={{ cursor: 'default' }}>
                  ⭐ {f.name} <span style={{ opacity: .6 }}>{f.kcal}kcal</span>
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
