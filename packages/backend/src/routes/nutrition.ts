import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { isUCError } from '../use-cases/errors'
import {
  getNutritionDay, getBatchNutrition, upsertNutritionDay,
  addMealEntry, removeMealEntry,
  listSavedFoods, createSavedFood, deleteSavedFood,
} from '../use-cases/nutrition'

const foodEntrySchema = z.object({
  name: z.string().min(1),
  kcal: z.number(),
  protein: z.number().default(0),
  carbs: z.number().default(0),
  fat: z.number().default(0),
})

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')

const nutritionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/batch', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { dates } = request.query as { dates?: string }
    if (!dates) return reply.status(400).send({ error: 'Parámetro dates requerido' })

    const dateList = dates.split(',').map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 30)
    if (dateList.length === 0) return reply.status(400).send({ error: 'Ninguna fecha válida (formato YYYY-MM-DD)' })

    return getBatchNutrition(fastify.repos.nutrition, sub, dateList)
  })

  fastify.get('/:date', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = dateSchema.safeParse((request.params as { date: string }).date)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })
    return getNutritionDay(fastify.repos.nutrition, sub, parsed.data)
  })

  fastify.put('/:date', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsedDate = dateSchema.safeParse((request.params as { date: string }).date)
    if (!parsedDate.success) return reply.status(400).send({ error: parsedDate.error.issues[0].message })
    const body = z.object({ water: z.number().int().optional(), meals: z.record(z.unknown()).optional() }).parse(request.body)
    return upsertNutritionDay(fastify.repos.nutrition, sub, parsedDate.data, { water: body.water, meals: body.meals as object | undefined })
  })

  fastify.post('/:date/meals/:mealType', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const params = request.params as { date: string; mealType: string }
    const parsedDate = dateSchema.safeParse(params.date)
    if (!parsedDate.success) return reply.status(400).send({ error: parsedDate.error.issues[0].message })
    const entry = foodEntrySchema.parse(request.body)
    const result = await addMealEntry(fastify.repos.nutrition, sub, parsedDate.data, params.mealType, entry)
    return reply.status(201).send(result)
  })

  fastify.delete('/:date/meals/:mealType/:foodId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const params = request.params as { date: string; mealType: string; foodId: string }
    const parsedDate = dateSchema.safeParse(params.date)
    if (!parsedDate.success) return reply.status(400).send({ error: parsedDate.error.issues[0].message })
    await removeMealEntry(fastify.repos.nutrition, sub, parsedDate.data, params.mealType, params.foodId)
    return reply.status(204).send()
  })

  fastify.get('/saved-foods', async (request) => {
    const { sub } = request.user as { sub: string }
    return listSavedFoods(fastify.repos.nutrition, sub)
  })

  fastify.post('/saved-foods', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const data = foodEntrySchema.parse(request.body)
    return reply.status(201).send(await createSavedFood(fastify.repos.nutrition, sub, data))
  })

  fastify.delete('/saved-foods/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await deleteSavedFood(fastify.repos.nutrition, sub, id)
    return reply.status(204).send()
  })
}

export default nutritionRoutes
