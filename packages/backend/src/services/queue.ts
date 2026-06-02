import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { sendMail } from './email'
import { processImport } from './importTask'
import { prisma } from '../lib/prisma'

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

export interface ReminderScanJobData {
  type: 'reminder-scan'
}

type JobData = EmailJobData | ImportJobData | ReminderScanJobData

async function processReminderScan() {
  const now = new Date()
  const hh = now.getUTCHours().toString().padStart(2, '0')
  const mm = now.getUTCMinutes().toString().padStart(2, '0')
  const currentTime = `${hh}:${mm}`

  const targets = await prisma.userSettings.findMany({
    where: { reminderTime: currentTime, fcmToken: { not: null } },
    select: { userId: true, fcmToken: true },
  })
  if (targets.length === 0) return

  const { sendFcmNotification, cleanInvalidFcmToken } = await import('./fcm')
  await Promise.allSettled(
    targets.map(async (s) => {
      const ok = await sendFcmNotification(
        s.fcmToken!,
        'Hora de entrenar 💪',
        'Tienes un entrenamiento pendiente hoy. ¡A por ello!',
        { url: '/dashboard' }
      )
      if (!ok) await cleanInvalidFcmToken(prisma, s.userId)
    })
  )
}

// ── Worker (Procesador de Tareas) ─────────────────────────────────────────
let worker: Worker<JobData> | null = null

export function initWorker() {
  if (worker) return worker

  worker = new Worker<JobData>(
    'gym-tracker-bg-jobs',
    async (job: Job<JobData>) => {
      if (job.data.type !== 'reminder-scan') {
        console.log(`[Queue] Procesando tarea ${job.id} de tipo: ${job.data.type}`)
      }

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
        else if (job.data.type === 'reminder-scan') {
          await processReminderScan()
        }
      } catch (error) {
        console.error(`[Queue] Error procesando tarea ${job.id}:`, error)
        throw error
      }
    },
    { connection }
  )

  worker.on('completed', (job) => {
    if ((job.data as JobData).type !== 'reminder-scan') {
      console.log(`[Queue] Tarea completada: ${job.id}`)
    }
  })

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Tarea fallida: ${job?.id}`, err)
  })

  return worker
}

export async function registerReminderJob() {
  await backgroundQueue.add(
    'reminder-scan',
    { type: 'reminder-scan' } satisfies ReminderScanJobData,
    { repeat: { every: 60_000 }, jobId: 'reminder-scan-repeatable' }
  )
}

export async function closeWorker() {
  if (worker) {
    console.log('[Queue] Cerrando worker...')
    await worker.close()
    worker = null
  }
}
