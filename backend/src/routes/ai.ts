import type { FastifyPluginAsync } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getRoutineDays, PRESET_ROUTINES } from '../lib/presetRoutines'

type GeminiBody = Record<string, unknown>

async function callGemini(apiKey: string, model: string, body: GeminiBody): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    const data = await res.json() as { candidates?: { content?: { parts?: { text: string }[] } }[]; error?: { message: string } }
    if (data.error) return { ok: false, error: `Error de Gemini: ${data.error.message}` }
    return { ok: true, text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' }
  } catch {
    return { ok: false, error: 'Error al contactar la API de IA.' }
  }
}

async function loadUserAiContext(prisma: PrismaClient, userId: string) {
  const [user, settings, sessions, customRoutines] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.workoutSession.findMany({ where: { userId }, orderBy: { weekNumber: 'asc' } }),
    prisma.routine.findMany({ where: { userId } }),
  ])
  return { user, settings, sessions, customRoutines }
}

function resolveRoutineName(id: string | null, customs: { id: string; name: string }[]): string {
  if (!id) return 'Sin rutina'
  return PRESET_ROUTINES[id]?.name ?? customs.find(r => r.id === id)?.name ?? id
}

const analyzeFoodSchema = z.object({
  imageBase64: z.string().min(1).max(2_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
})

interface ChatMessage { role: 'user' | 'assistant'; content: string; ts: string }
interface SetData { kg: string; reps: string }
interface ExerciseSession { done: boolean; sets: SetData[] }
interface DbSession {
  weekNumber: number
  dayId: string
  complete: boolean
  notes: string | null
  exercises: unknown
}

function calcWeekVolume(sessions: DbSession[], dayIds: string[], week: number): number {
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

function calcStreak(sessions: DbSession[], dayIds: string[], currentWeek: number): number {
  let streak = 0
  for (let w = currentWeek; w >= 1; w--) {
    const done = dayIds.filter(d => sessions.find(s => s.weekNumber === w && s.dayId === d)?.complete).length
    if (done >= Math.ceil(dayIds.length * 0.75)) streak++
    else break
  }
  return streak
}

function getBestKg(
  sessions: DbSession[], dayIds: string[], exName: string, upToWeek: number,
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

function buildPrompt(
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

const FOOD_PROMPT = `Analiza esta imagen de comida. Devuelve ÚNICAMENTE un JSON válido, sin markdown ni texto adicional, con esta estructura exacta:
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

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.post('/analyze-food', {
    bodyLimit: 10 * 1024 * 1024,
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = analyzeFoodSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })
    const { imageBase64, mimeType } = parsed.data

    const settings = await prisma.userSettings.findUnique({ where: { userId: sub } })
    if (!settings?.aiKey || !settings.aiProvider) {
      return reply.status(400).send({ error: 'Configura tu proveedor de IA y API key en Configuración' })
    }

    const { aiKey, aiModel } = settings
    const model = aiModel ?? 'gemini-2.5-flash-lite'

    const result = await callGemini(aiKey!, model, {
      contents: [{ parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: FOOD_PROMPT }] }]
    })
    if (!result.ok) return reply.status(502).send({ error: result.error })

    const jsonStr = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    try {
      return JSON.parse(jsonStr)
    } catch {
      return reply.status(502).send({ error: 'La IA no devolvió JSON válido. Intenta de nuevo.' })
    }
  })

  fastify.post('/analyze', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { user, settings, sessions, customRoutines } = await loadUserAiContext(prisma, sub)

    if (!settings?.aiKey || !settings.aiProvider) {
      return reply.status(400).send({ error: 'Configura tu proveedor de IA y API key en Configuración' })
    }

    const routineDays = getRoutineDays(user.activeRoutineId, customRoutines)
    const dayIds = Object.keys(routineDays)
    const prompt = buildPrompt(
      user.name, settings.goal ?? 'Hipertrofia', user.currentWeek,
      resolveRoutineName(user.activeRoutineId, customRoutines),
      dayIds,
      routineDays as Record<string, { label: string; exercises: { name: string; reps: string }[] }>,
      sessions as DbSession[],
    )

    const model = settings.aiModel ?? 'gemini-2.5-flash-lite'
    const gemini = await callGemini(settings.aiKey, model, { contents: [{ parts: [{ text: prompt }] }] })
    if (!gemini.ok) return reply.status(502).send({ error: gemini.error })
    if (!gemini.text) return reply.status(502).send({ error: 'La IA no devolvió texto. Verifica tu API key.' })
    return { result: gemini.text }
  })

  // ── Chat con memoria persistente ─────────────────────────────────
  fastify.get('/chat', async (request) => {
    const { sub } = request.user as { sub: string }
    const chat = await prisma.aIChat.findUnique({ where: { userId: sub } })
    return { messages: (chat?.messages ?? []) as unknown as ChatMessage[] }
  })

  fastify.delete('/chat', async (request) => {
    const { sub } = request.user as { sub: string }
    await prisma.aIChat.deleteMany({ where: { userId: sub } })
    return { cleared: true }
  })

  fastify.post('/chat', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = chatSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })
    const { message } = parsed.data

    const [{ user, settings, sessions, customRoutines }, chatRecord] = await Promise.all([
      loadUserAiContext(prisma, sub),
      prisma.aIChat.findUnique({ where: { userId: sub } }),
    ])

    if (!settings?.aiKey || !settings.aiProvider) {
      return reply.status(400).send({ error: 'Configura tu proveedor de IA y API key en Configuración' })
    }

    const routineDays = getRoutineDays(user.activeRoutineId, customRoutines)
    const dayIds = Object.keys(routineDays)
    const systemPrompt = buildPrompt(
      user.name, settings.goal ?? 'Hipertrofia', user.currentWeek,
      resolveRoutineName(user.activeRoutineId, customRoutines),
      dayIds,
      routineDays as Record<string, { label: string; exercises: { name: string; reps: string }[] }>,
      sessions as DbSession[],
    ) + '\n\nResponde de forma conversacional y concisa. Si el usuario hace preguntas fuera del entrenamiento, redirige amablemente al contexto del fitness.'

    const history = (chatRecord?.messages ?? []) as unknown as ChatMessage[]
    const newUserMsg: ChatMessage = { role: 'user', content: message.trim(), ts: new Date().toISOString() }

    const model = settings.aiModel ?? 'gemini-2.5-flash-lite'
    const contents = [
      ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ]
    const gemini = await callGemini(settings.aiKey, model, {
      system_instruction: { parts: [{ text: systemPrompt }] }, contents
    })
    if (!gemini.ok) return reply.status(502).send({ error: gemini.error })
    if (!gemini.text) return reply.status(502).send({ error: 'La IA no devolvió respuesta.' })

    const assistantMsg: ChatMessage = { role: 'assistant', content: gemini.text, ts: new Date().toISOString() }
    const updatedMessages = [...history, newUserMsg, assistantMsg]

    await prisma.aIChat.upsert({
      where: { userId: sub },
      update: { messages: updatedMessages as unknown as object },
      create: { userId: sub, messages: updatedMessages as unknown as object },
    })

    return { message: assistantMsg }
  })
}

export default aiRoutes
