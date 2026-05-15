import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await prisma.$connect()
  fastify.decorate('prisma', prisma)
  fastify.addHook('onClose', async () => prisma.$disconnect())
})

export default prismaPlugin
