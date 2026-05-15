import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const foodEntrySchema = z.object({
  name: z.string().min(1),
  kcal: z.number(),
  protein: z.number().default(0),
  carbs: z.number().default(0),
  fat: z.number().default(0),
})

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')

const nutritionRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/:date', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = dateSchema.safeParse((request.params as { date: string }).date)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })
    const date = parsed.data
    return prisma.nutritionDay.findUnique({ where: { userId_date: { userId: sub, date } } })
      ?? { userId: sub, date, water: 0, meals: {} }
  })

  fastify.put('/:date', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsedDate = dateSchema.safeParse((request.params as { date: string }).date)
    if (!parsedDate.success) return reply.status(400).send({ error: parsedDate.error.issues[0].message })
    const date = parsedDate.data
    const body = z.object({ water: z.number().int().optional(), meals: z.record(z.unknown()).optional() }).parse(request.body)
    const safeBody = { water: body.water, meals: body.meals as Prisma.InputJsonValue | undefined }
    return prisma.nutritionDay.upsert({
      where: { userId_date: { userId: sub, date } },
      update: safeBody,
      create: { userId: sub, date, ...safeBody },
    })
  })

  fastify.post('/:date/meals/:mealType', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const params = request.params as { date: string; mealType: string }
    const parsedDate = dateSchema.safeParse(params.date)
    if (!parsedDate.success) return reply.status(400).send({ error: parsedDate.error.issues[0].message })
    const { mealType } = params
    const date = parsedDate.data
    const entry = foodEntrySchema.parse(request.body)

    const day = await prisma.nutritionDay.findUnique({ where: { userId_date: { userId: sub, date } } })
    const meals = (day?.meals as Record<string, unknown[]>) ?? {}
    const list = (meals[mealType] as unknown[]) ?? []
    const newEntry = { ...entry, id: randomUUID() }
    list.push(newEntry)
    meals[mealType] = list

    const safeMeals = meals as Prisma.InputJsonValue
    await prisma.nutritionDay.upsert({
      where: { userId_date: { userId: sub, date } },
      update: { meals: safeMeals },
      create: { userId: sub, date, meals: safeMeals },
    })
    return reply.status(201).send(newEntry)
  })

  fastify.delete('/:date/meals/:mealType/:foodId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const params = request.params as { date: string; mealType: string; foodId: string }
    const parsedDate = dateSchema.safeParse(params.date)
    if (!parsedDate.success) return reply.status(400).send({ error: parsedDate.error.issues[0].message })
    const { mealType, foodId } = params
    const date = parsedDate.data

    const day = await prisma.nutritionDay.findUnique({ where: { userId_date: { userId: sub, date } } })
    if (!day) return reply.status(204).send()

    const meals = (day.meals as Record<string, { id: string }[]>) ?? {}
    if (meals[mealType]) {
      meals[mealType] = meals[mealType].filter((e) => e.id !== foodId)
      await prisma.nutritionDay.update({ where: { userId_date: { userId: sub, date } }, data: { meals } })
    }
    return reply.status(204).send()
  })

  // ── Saved foods ──────────────────────────────────────────────────────────────
  fastify.get('/saved-foods', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.savedFood.findMany({ where: { userId: sub }, take: 200 })
  })

  fastify.post('/saved-foods', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const data = foodEntrySchema.parse(request.body)
    return reply.status(201).send(await prisma.savedFood.create({ data: { userId: sub, ...data } }))
  })

  fastify.delete('/saved-foods/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await prisma.savedFood.deleteMany({ where: { id, userId: sub } })
    return reply.status(204).send()
  })
}

export default nutritionRoutes
