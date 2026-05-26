import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { Redis } from 'ioredis'
import type { Repositories } from '../repositories'
import { PrismaUserRepository } from '../repositories/prisma/PrismaUserRepository'
import { PrismaRoutineRepository } from '../repositories/prisma/PrismaRoutineRepository'
import { PrismaSessionRepository } from '../repositories/prisma/PrismaSessionRepository'
import { PrismaNutritionRepository } from '../repositories/prisma/PrismaNutritionRepository'
import { PrismaNoteRepository } from '../repositories/prisma/PrismaNoteRepository'
import { PrismaChallengeRepository } from '../repositories/prisma/PrismaChallengeRepository'

declare module 'fastify' {
  interface FastifyInstance {
    repos: Repositories
  }
}

const repositoriesPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const { prisma } = fastify
  // redis may be undefined if REDIS_URL is not set (dev without Redis)
  const redis = (fastify.redis as Redis | undefined) ?? null

  fastify.decorate('repos', {
    users:      new PrismaUserRepository(prisma),
    routines:   new PrismaRoutineRepository(prisma),
    sessions:   new PrismaSessionRepository(prisma, redis),
    nutrition:  new PrismaNutritionRepository(prisma),
    notes:      new PrismaNoteRepository(prisma),
    challenges: new PrismaChallengeRepository(prisma),
  } satisfies Repositories)
})

export default repositoriesPlugin
