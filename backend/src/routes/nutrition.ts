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

const nutritionRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/:date', async (request) => {
    const { sub } = request.user as { sub: string }
    const { date } = request.params as { date: string }
    return prisma.nutritionDay.findUnique({ where: { userId_date: { userId: sub, date } } })
      ?? { userId: sub, date, water: 0, meals: {} }
  })

  fastify.put('/:date', async (request) => {
    const { sub } = request.user as { sub: string }
    const { date } = request.params as { date: string }
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
    const { date, mealType } = request.params as { date: string; mealType: string }
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
    const { date, mealType, foodId } = request.params as { date: string; mealType: string; foodId: string }

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
