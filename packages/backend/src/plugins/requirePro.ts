import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

// All features are free — Pro gates removed.
export function checkIsPro(_user: unknown): boolean {
  return true
}

export function requirePro(_fastify: FastifyInstance) {
  return async (_req: FastifyRequest, _reply: FastifyReply) => {}
}
