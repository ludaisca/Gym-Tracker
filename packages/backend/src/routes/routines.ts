import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { checkIsPro } from '../plugins/requirePro'

const routineSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  days: z.record(z.unknown()),
})

function randomShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(8)).map(b => chars[b % chars.length]).join('')
}

const routinesRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  // ── GET /routines/public/:code — sin autenticación ────────────────────────
  fastify.get<{ Params: { code: string } }>('/public/:code', async (req, reply) => {
    const routine = await prisma.routine.findUnique({
      where: { shareCode: req.params.code },
      select: { id: true, name: true, description: true, days: true, downloadCount: true },
    })
    if (!routine) return reply.status(404).send({ error: 'Rutina compartida no encontrada.' })
    return routine
  })

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.routine.findMany({ where: { userId: sub }, orderBy: { id: 'asc' }, take: 50 })
  })

  fastify.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = routineSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const userPlan = await prisma.user.findUnique({ where: { id: sub }, select: { plan: true, planExpiresAt: true, trialEndsAt: true } })
    if (!checkIsPro(userPlan ?? null)) {
      const count = await prisma.routine.count({ where: { userId: sub } })
      if (count >= 3) return reply.status(403).send({ error: 'Límite de 3 rutinas en plan gratuito.', code: 'REQUIRES_PRO' })
    }

    return reply.status(201).send(await prisma.routine.create({ data: { userId: sub, ...body.data, days: body.data.days as object } }))
  })

  fastify.put('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = routineSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const routine = await prisma.routine.findFirst({ where: { id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'No encontrado' })

    return prisma.routine.update({ where: { id }, data: body.data as object })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const routine = await prisma.routine.findFirst({ where: { id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'No encontrado' })
    await prisma.routine.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── POST /routines/:id/share — genera o devuelve shareCode ───────────────
  fastify.post<{ Params: { id: string } }>('/:id/share', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const routine = await prisma.routine.findFirst({ where: { id: req.params.id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'Rutina no encontrada.' })

    const shareCode = routine.shareCode ?? randomShareCode()
    const updated = await prisma.routine.update({
      where: { id: routine.id },
      data: { shareCode },
    })
    return { shareCode: updated.shareCode }
  })

  // ── DELETE /routines/:id/share — revoca el código de compartir ────────────
  fastify.delete<{ Params: { id: string } }>('/:id/share', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const routine = await prisma.routine.findFirst({ where: { id: req.params.id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'Rutina no encontrada.' })

    await prisma.routine.update({ where: { id: routine.id }, data: { shareCode: null } })
    return reply.status(204).send()
  })

  // ── POST /routines/import/:code — importa una rutina compartida ───────────
  fastify.post<{ Params: { code: string } }>('/import/:code', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const original = await prisma.routine.findUnique({ where: { shareCode: req.params.code } })
    if (!original) return reply.status(404).send({ error: 'Código inválido o rutina no encontrada.' })

    const cloned = await prisma.routine.create({
      data: {
        userId: sub,
        name: original.name,
        description: original.description,
        days: original.days as object,
      },
    })
    return reply.status(201).send(cloned)
  })

  // ── POST /routines/:id/publish — publica en marketplace ──────────────────
  fastify.post<{ Params: { id: string } }>('/:id/publish', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const userPlan = await prisma.user.findUnique({ where: { id: sub }, select: { plan: true, planExpiresAt: true, trialEndsAt: true } })
    if (!checkIsPro(userPlan ?? null)) return reply.status(403).send({ error: 'Se requiere plan Pro.', code: 'REQUIRES_PRO' })
    const routine = await prisma.routine.findFirst({ where: { id: req.params.id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'Rutina no encontrada.' })

    const updated = await prisma.routine.update({
      where: { id: routine.id },
      data: { isPublic: true },
    })
    return { isPublic: updated.isPublic }
  })

  // ── DELETE /routines/:id/publish — quita del marketplace ─────────────────
  fastify.delete<{ Params: { id: string } }>('/:id/publish', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const routine = await prisma.routine.findFirst({ where: { id: req.params.id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'Rutina no encontrada.' })

    await prisma.routine.update({ where: { id: routine.id }, data: { isPublic: false } })
    return reply.status(204).send()
  })
}

export default routinesRoutes
