import 'dotenv/config'
import { buildApp } from './app'

const required: [string, number][] = [
  ['JWT_SECRET', 32],
  ['DATABASE_URL', 10],
]
for (const [name, minLen] of required) {
  const val = process.env[name]
  if (!val || val.length < minLen) {
    console.error(`❌ ${name} debe estar definida y tener al menos ${minLen} caracteres`)
    process.exit(1)
  }
}

const PORT = parseInt(process.env.PORT ?? '3001')

buildApp().then((app) => {
  app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  })

  // ── Graceful Shutdown (Escalado sin cortes) ──────────────
  const gracefulShutdown = async (signal: string) => {
    app.log.info(`Recibida señal ${signal}. Cerrando servidor graceful...`)
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
})
