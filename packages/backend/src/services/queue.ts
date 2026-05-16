import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { sendMail } from './email'
import { processImport } from './importTask'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// ── Cola de Tareas en Segundo Plano ───────────────────────────────────────
export const backgroundQueue = new Queue('gym-tracker-bg-jobs', { connection })

export interface EmailJobData {
  type: 'email'
  to: string
  subject: string
  html: string
}

export interface ImportJobData {
  type: 'import'
  userId: string
  payload: Record<string, unknown>
}

type JobData = EmailJobData | ImportJobData

// ── Worker (Procesador de Tareas) ─────────────────────────────────────────
let worker: Worker<JobData> | null = null

export function initWorker() {
  if (worker) return worker

  worker = new Worker<JobData>(
    'gym-tracker-bg-jobs',
    async (job: Job<JobData>) => {
      console.log(`[Queue] Procesando tarea ${job.id} de tipo: ${job.data.type}`)
      
      try {
        if (job.data.type === 'email') {
          await sendMail({
            from: process.env.SMTP_FROM ?? 'Gym Tracker <no-reply@gymtracker.app>',
            to: job.data.to,
            subject: job.data.subject,
            html: job.data.html,
          })
        }
        else if (job.data.type === 'import') {
          await processImport(job.data.userId, job.data.payload)
        }
      } catch (error) {
        console.error(`[Queue] Error procesando tarea ${job.id}:`, error)
        throw error
      }
    },
    { connection }
  )

  worker.on('completed', (job) => {
    console.log(`[Queue] Tarea completada: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Tarea fallida: ${job?.id}`, err)
  })

  return worker
}

export async function closeWorker() {
  if (worker) {
    console.log('[Queue] Cerrando worker...')
    await worker.close()
    worker = null
  }
}
