import type { UserSettings } from '@prisma/client'
import type { SessionRepository } from '../repositories/SessionRepository'
import type { UserRepository } from '../repositories/UserRepository'
import { decryptValue } from '../lib/crypto'
import { getRoutineDays, PRESET_ROUTINES } from '../lib/presetRoutines'
import type { RoutineRepository } from '../repositories/RoutineRepository'
import { ucErr, UCError } from './errors'

export const AI_TIMEOUT_MS = 30_000
export const ERR_AI_UNAVAILABLE = 'El servicio de IA no está disponible. Intenta más tarde.'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

export interface SetData { kg: string; reps: string }
export interface ExerciseSession { done: boolean; sets: SetData[] }
export interface DbSession {
  weekNumber: number
  dayId: string
  complete: boolean
  notes: string | null
  exercises: unknown
}

// ── Pure computation helpers ────────────────────────────────────────────────

export function calcWeekVolume(sessions: DbSession[], dayIds: string[], week: number): number {
  return dayIds.reduce((total, day) => {
    const s = sessions.find(x => x.weekNumber === week && x.dayId === day)
    if (!s) return total
    const exs = s.exercises as ExerciseSession[]
    return total + exs.reduce((a, ex) =>
      a + ex.sets.reduce((b, set) => {
        const kg = parseFloat(set.kg); const reps = parseFloat(set.reps)
        return b + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
      }, 0)
    , 0)
  }, 0)
}

export function calcStreak(sessions: DbSession[], dayIds: string[], currentWeek: number): number {
  let streak = 0
  for (let w = currentWeek; w >= 1; w--) {
    const done = dayIds.filter(d => sessions.find(s => s.weekNumber === w && s.dayId === d)?.complete).length
    if (done >= Math.ceil(dayIds.length * 0.75)) streak++
    else break
  }
  return streak
}

export function getBestKg(
  sessions: DbSession[],
  dayIds: string[],
  exName: string,
  upToWeek: number,
  routineDays: Record<string, { exercises: { name: string }[] }>
): number {
  let best = 0
  for (let w = 1; w <= upToWeek; w++) {
    for (const day of dayIds) {
      const s = sessions.find(x => x.weekNumber === w && x.dayId === day)
      if (!s) continue
      const dayExs = routineDays[day]?.exercises ?? []
      ;(s.exercises as ExerciseSession[]).forEach((ex, idx) => {
        if (dayExs[idx]?.name === exName) {
          ex.sets.forEach(set => {
            const kg = parseFloat(set.kg)
            if (!isNaN(kg) && kg > best) best = kg
          })
        }
      })
    }
  }
  return best
}

export function buildPrompt(
  userName: string,
  goal: string,
  currentWeek: number,
  routineName: string,
  dayIds: string[],
  routineDays: Record<string, { label: string; exercises: { name: string; reps: string }[] }>,
  sessions: DbSession[],
): string {
  const streak = calcStreak(sessions, dayIds, currentWeek)
  const totalWeeks = Math.max(...sessions.map(s => s.weekNumber), currentWeek)

  const volLines: string[] = []
  for (let w = Math.max(1, currentWeek - 7); w <= currentWeek; w++) {
    const vol = Math.round(calcWeekVolume(sessions, dayIds, w))
    const completed = dayIds.filter(d => sessions.find(s => s.weekNumber === w && s.dayId === d)?.complete).length
    const marker = w === currentWeek ? ' ← semana actual' : ''
    volLines.push(`  Semana ${w}: ${vol > 0 ? (vol / 1000).toFixed(1) + 'k kg×reps' : '0'}, ${completed}/${dayIds.length} sesiones${marker}`)
  }

  const sessionLines: string[] = []
  for (const day of dayIds) {
    const s = sessions.find(x => x.weekNumber === currentWeek && x.dayId === day)
    const dayLabel = routineDays[day]?.label ?? day
    if (!s) { sessionLines.push(`  ${dayLabel} (${day}): sin datos`); continue }
    sessionLines.push(`  ${dayLabel} (${day}): ${s.complete ? 'COMPLETADA' : 'en progreso'}${s.notes ? ` — nota: "${s.notes}"` : ''}`)
    const exDefs = routineDays[day]?.exercises ?? []
    ;(s.exercises as ExerciseSession[]).forEach((ex, idx) => {
      const exName = exDefs[idx]?.name ?? `Ejercicio ${idx + 1}`
      const doneSets = ex.sets.filter(set => parseFloat(set.kg) > 0 || parseFloat(set.reps) > 0)
      if (doneSets.length === 0) return
      sessionLines.push(`    • ${exName}: ${doneSets.map(set => `${set.kg}kg×${set.reps}`).join(', ')}`)
    })
  }

  const prLines: string[] = []
  const seen = new Set<string>()
  for (const day of dayIds) {
    for (const exDef of (routineDays[day]?.exercises ?? [])) {
      if (seen.has(exDef.name)) continue
      seen.add(exDef.name)
      const best = getBestKg(sessions, dayIds, exDef.name, totalWeeks, routineDays)
      if (best > 0) prLines.push(`  • ${exDef.name}: ${best} kg`)
    }
  }

  return `Eres un entrenador personal experto. Analiza el progreso del atleta y proporciona recomendaciones concretas y motivadoras en español.

## PERFIL DEL ATLETA
- Nombre: ${userName}
- Objetivo: ${goal}
- Rutina activa: ${routineName}
- Semana actual: ${currentWeek} de ${totalWeeks} totales
- Racha: ${streak} semana${streak !== 1 ? 's' : ''} consecutiva${streak !== 1 ? 's' : ''} (≥75% sesiones completadas)

## DÍAS DE ENTRENAMIENTO
${dayIds.map(d => `  • ${routineDays[d]?.label ?? d} (${d})`).join('\n')}

## TENDENCIA DE VOLUMEN (últimas semanas)
${volLines.join('\n')}

## DETALLE SEMANA ACTUAL (semana ${currentWeek})
${sessionLines.join('\n')}

## RÉCORDS HISTÓRICOS (mejor peso por ejercicio)
${prLines.length > 0 ? prLines.join('\n') : '  Sin datos suficientes aún.'}

## TU TAREA
Responde con estas secciones:
1. **Resumen del progreso** — 2-3 oraciones sobre tendencias de volumen y racha
2. **Puntos fuertes** — ejercicios donde progresa bien (con datos específicos)
3. **Áreas a mejorar** — recomendaciones concretas de carga o técnica
4. **Objetivo próxima semana** — 1-2 acciones específicas

Sé directo, motivador, usa los datos del historial. Máximo 350 palabras.`
}

export const FOOD_PROMPT = `Analiza esta imagen de comida. Devuelve ÚNICAMENTE un JSON válido, sin markdown ni texto adicional, con esta estructura exacta:
{
  "dish_name": "nombre del plato",
  "items": [{"name":"","kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"confidence":0}],
  "total_kcal": 0,
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "hidden_suggestions": ["ingredientes ocultos probables: aceites, salsas, aderezos"],
  "confidence_overall": 0,
  "notes": ""
}
Estimá porciones visualmente. Valores numéricos enteros o 1 decimal. Responde SOLO el JSON.`

// ── AI provider calling helpers ─────────────────────────────────────────────

export async function callGoogle(
  aiKey: string,
  model: string,
  body: object,
  signal: AbortSignal
): Promise<{ text: string | null; error: string | null }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
  )
  const data = await res.json() as { candidates?: { content?: { parts?: { text: string }[] } }[]; error?: { message: string } }
  if (data.error) return { text: null, error: data.error.message }
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '', error: null }
}

export async function callOpenAI(
  aiKey: string,
  model: string,
  body: object,
  signal: AbortSignal
): Promise<{ text: string | null; error: string | null }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiKey}` },
    body: JSON.stringify(body),
    signal,
  })
  const data = await res.json() as { choices?: { message?: { content: string } }[]; error?: { message: string } }
  if (data.error) return { text: null, error: data.error.message }
  return { text: data.choices?.[0]?.message?.content ?? '', error: null }
}

export async function callAnthropic(
  aiKey: string,
  model: string,
  body: object,
  signal: AbortSignal
): Promise<{ text: string | null; error: string | null }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': aiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    signal,
  })
  const data = await res.json() as { content?: { text: string }[]; error?: { message: string } }
  if (data.error) return { text: null, error: data.error.message }
  return { text: data.content?.[0]?.text ?? '', error: null }
}

// ── Use case functions ──────────────────────────────────────────────────────

export async function analyzeFood(
  userId: string,
  settings: UserSettings | null,
  imageBase64: string,
  mimeType: string
): Promise<object | UCError> {
  if (!settings?.aiKey || !settings.aiProvider) {
    return ucErr('Configura tu proveedor de IA y API key en Configuración', 400)
  }
  const { aiProvider, aiKey: encKey, aiModel } = settings
  const aiKey = decryptValue(encKey) ?? encKey ?? ''
  const signal = AbortSignal.timeout(AI_TIMEOUT_MS)

  let raw = ''
  if (aiProvider === 'google') {
    const model = aiModel ?? 'gemini-2.5-flash-lite'
    const { text, error } = await callGoogle(aiKey, model, {
      contents: [{ parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: FOOD_PROMPT }] }]
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    raw = text ?? ''
  } else if (aiProvider === 'openai') {
    const model = aiModel ?? 'gpt-4o-mini'
    const { text, error } = await callOpenAI(aiKey, model, {
      model, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: 'text', text: FOOD_PROMPT },
      ]}],
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    raw = text ?? ''
  } else if (aiProvider === 'anthropic') {
    const model = aiModel ?? 'claude-haiku-4-5-20251001'
    const { text, error } = await callAnthropic(aiKey, model, {
      model, max_tokens: 1024,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
        { type: 'text', text: FOOD_PROMPT },
      ]}],
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    raw = text ?? ''
  } else {
    return ucErr(`Proveedor desconocido: ${aiProvider}`, 400)
  }

  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(jsonStr) as object
  } catch {
    return ucErr('La IA no devolvió JSON válido. Intenta de nuevo.', 502)
  }
}

export async function analyzeWorkout(
  repos: { sessions: SessionRepository; users: UserRepository; routines: RoutineRepository },
  userId: string,
  settingsRecord: UserSettings | null
): Promise<{ result: string } | UCError> {
  if (!settingsRecord?.aiKey || !settingsRecord.aiProvider) {
    return ucErr('Configura tu proveedor de IA y API key en Configuración', 400)
  }

  const [user, sessions, customRoutines] = await Promise.all([
    repos.users.findByIdWithSettings(userId),
    repos.sessions.findAll(userId),
    repos.routines.findAll(userId),
  ])
  if (!user) return ucErr('Usuario no encontrado.', 404)

  const { aiProvider, aiKey: encKey, aiModel } = settingsRecord
  const aiKey = decryptValue(encKey) ?? encKey ?? ''
  const routineDays = getRoutineDays(user.activeRoutineId, customRoutines)
  const dayIds = Object.keys(routineDays)

  let routineName = 'Sin rutina'
  if (user.activeRoutineId) {
    routineName = PRESET_ROUTINES[user.activeRoutineId]?.name
      ?? customRoutines.find(r => r.id === user.activeRoutineId)?.name
      ?? user.activeRoutineId
  }

  const prompt = buildPrompt(
    user.name, settingsRecord.goal ?? 'Hipertrofia', user.currentWeek,
    routineName, dayIds,
    routineDays as Record<string, { label: string; exercises: { name: string; reps: string }[] }>,
    sessions as DbSession[],
  )

  const signal = AbortSignal.timeout(AI_TIMEOUT_MS)
  let result = ''

  if (aiProvider === 'google') {
    const { text, error } = await callGoogle(aiKey, aiModel ?? 'gemini-2.5-flash-lite', {
      contents: [{ parts: [{ text: prompt }] }]
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    result = text ?? ''
  } else if (aiProvider === 'openai') {
    const { text, error } = await callOpenAI(aiKey, aiModel ?? 'gpt-4o-mini', {
      model: aiModel ?? 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }]
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    result = text ?? ''
  } else if (aiProvider === 'anthropic') {
    const { text, error } = await callAnthropic(aiKey, aiModel ?? 'claude-haiku-4-5-20251001', {
      model: aiModel ?? 'claude-haiku-4-5-20251001', max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    result = text ?? ''
  } else {
    return ucErr(`Proveedor desconocido: ${aiProvider}`, 400)
  }

  if (!result) return ucErr(ERR_AI_UNAVAILABLE, 502)
  return { result }
}

export async function chatWithAI(
  repos: { sessions: SessionRepository; users: UserRepository; routines: RoutineRepository },
  userId: string,
  settingsRecord: UserSettings | null,
  message: string,
  history: ChatMessage[]
): Promise<{ message: ChatMessage; updatedMessages: ChatMessage[] } | UCError> {
  if (!settingsRecord?.aiKey || !settingsRecord.aiProvider) {
    return ucErr('Configura tu proveedor de IA y API key en Configuración', 400)
  }

  const [user, sessions, customRoutines] = await Promise.all([
    repos.users.findByIdWithSettings(userId),
    repos.sessions.findAll(userId),
    repos.routines.findAll(userId),
  ])
  if (!user) return ucErr('Usuario no encontrado.', 404)

  const { aiProvider, aiKey: encKey, aiModel } = settingsRecord
  const aiKey = decryptValue(encKey) ?? encKey ?? ''
  const routineDays = getRoutineDays(user.activeRoutineId, customRoutines)
  const dayIds = Object.keys(routineDays)
  const routineName = user.activeRoutineId
    ? (PRESET_ROUTINES[user.activeRoutineId]?.name ?? customRoutines.find(r => r.id === user.activeRoutineId)?.name ?? user.activeRoutineId)
    : 'Sin rutina'

  const systemPrompt = buildPrompt(
    user.name, settingsRecord.goal ?? 'Hipertrofia', user.currentWeek,
    routineName, dayIds,
    routineDays as Record<string, { label: string; exercises: { name: string; reps: string }[] }>,
    sessions as DbSession[],
  ) + '\n\nResponde de forma conversacional y concisa. Si el usuario hace preguntas fuera del entrenamiento, redirige amablemente al contexto del fitness.'

  const signal = AbortSignal.timeout(AI_TIMEOUT_MS)
  const newUserMsg: ChatMessage = { role: 'user', content: message.trim(), ts: new Date().toISOString() }

  let reply_text = ''

  if (aiProvider === 'google') {
    const model = aiModel ?? 'gemini-2.5-flash-lite'
    const contents = [
      ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ]
    const { text, error } = await callGoogle(aiKey, model, {
      system_instruction: { parts: [{ text: systemPrompt }] }, contents
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    reply_text = text ?? ''
  } else if (aiProvider === 'openai') {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message.trim() },
    ]
    const { text, error } = await callOpenAI(aiKey, aiModel ?? 'gpt-4o-mini', {
      model: aiModel ?? 'gpt-4o-mini', messages
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    reply_text = text ?? ''
  } else if (aiProvider === 'anthropic') {
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message.trim() },
    ]
    const { text, error } = await callAnthropic(aiKey, aiModel ?? 'claude-haiku-4-5-20251001', {
      model: aiModel ?? 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemPrompt, messages
    }, signal)
    if (error) return ucErr(ERR_AI_UNAVAILABLE, 502)
    reply_text = text ?? ''
  } else {
    return ucErr(`Proveedor desconocido: ${aiProvider}`, 400)
  }

  if (!reply_text) return ucErr(ERR_AI_UNAVAILABLE, 502)

  const assistantMsg: ChatMessage = { role: 'assistant', content: reply_text, ts: new Date().toISOString() }
  const updatedMessages = [...history, newUserMsg, assistantMsg]

  return { message: assistantMsg, updatedMessages }
}
