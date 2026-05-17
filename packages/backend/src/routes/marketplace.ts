import type { FastifyPluginAsync } from 'fastify'

const marketplaceRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  // ── GET /marketplace — listado público sin autenticación ─────────────────
  fastify.get('/', async (req) => {
    const { search, limit, offset } = req.query as { search?: string; limit?: string; offset?: string }
    const take = Math.min(parseInt(limit ?? '20', 10) || 20, 50)
    const skip = parseInt(offset ?? '0', 10) || 0

    return prisma.routine.findMany({
      where: {
        isPublic: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        days: true,
        downloadCount: true,
        user: { select: { name: true } },
      },
      orderBy: { downloadCount: 'desc' },
      take,
      skip,
    })
  })

  // ── POST /marketplace/clone/:id — clonar rutina pública ──────────────────
  fastify.post<{ Params: { id: string } }>('/clone/:id', async (req, reply) => {
    // Verificar autenticación manual (no hook global porque GET es público)
    try {
      await fastify.authenticate(req, reply)
    } catch {
      return reply.status(401).send({ error: 'Autenticación requerida.' })
    }
    const { sub } = req.user as { sub: string }
    const original = await prisma.routine.findFirst({
      where: { id: req.params.id, isPublic: true },
    })
    if (!original) return reply.status(404).send({ error: 'Rutina no encontrada o no pública.' })

    const [cloned] = await prisma.$transaction([
      prisma.routine.create({
        data: {
          userId: sub,
          name: original.name,
          description: original.description,
          days: original.days as object,
        },
      }),
      prisma.routine.update({
        where: { id: original.id },
        data: { downloadCount: { increment: 1 } },
      }),
    ])

    return reply.status(201).send(cloned)
  })
}

export default marketplaceRoutes
