import nodemailer from 'nodemailer'

// ── Configuración SMTP ─────────────────────────────────────────────────────
// Variables de entorno requeridas para envío de correo:
//   SMTP_HOST     — servidor SMTP  (ej. mail.tudominio.com, smtp.gmail.com)
//   SMTP_PORT     — puerto         (465 para SSL, 587 para STARTTLS)
//   SMTP_SECURE   — "true" si el puerto usa SSL directo (465), "false" para STARTTLS
//   SMTP_USER     — usuario / dirección de correo remitente
//   SMTP_PASS     — contraseña o app-password
//   SMTP_FROM     — nombre+dirección visibles (ej. "Gym Tracker <no-reply@tudominio.com>")
//   APP_URL       — URL base del frontend   (ej. https://tuapp.com  o  http://localhost:5173)
// ──────────────────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = () => process.env.SMTP_FROM ?? 'Gym Tracker <no-reply@gymtracker.app>'
const APP_URL = () => (process.env.APP_URL ?? process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')

// En desarrollo (SMTP_HOST vacío) imprime el correo en consola en lugar de enviarlo
export async function sendMail(options: nodemailer.SendMailOptions) {
  if (!process.env.SMTP_HOST) {
    console.log('\n📧 [DEV EMAIL — no se envía, SMTP_HOST vacío]')
    console.log(`   To:      ${options.to}`)
    console.log(`   Subject: ${options.subject}`)
    const html = options.html as string
    const link = html.match(/href="([^"]+)"/)?.[1] ?? '(sin link)'
    console.log(`   Link:    ${link}\n`)
    return
  }
  await createTransporter().sendMail(options)
}

// ── Plantillas HTML ────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
        <!-- Header -->
        <tr><td style="background:#111;padding:24px 32px;border-bottom:1px solid #2a2a2a;">
          <table><tr>
            <td style="background:var(--color-primary,#14b8a6);border-radius:10px;padding:8px;width:36px;height:36px;text-align:center;line-height:36px;margin-right:12px;">
              <span style="font-size:18px;">💪</span>
            </td>
            <td style="padding-left:12px;">
              <span style="color:#fff;font-size:16px;font-weight:700;">Gym Tracker</span>
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #2a2a2a;">
          <p style="color:#555;font-size:12px;margin:0;line-height:1.6;">
            Si no solicitaste esto, ignora este correo. Este enlace expira automáticamente.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function verificationTemplate(link: string, name: string) {
  return baseTemplate('Verifica tu cuenta', `
    <h2 style="color:#fff;margin:0 0 8px;font-size:22px;">Hola, ${name} 👋</h2>
    <p style="color:#aaa;margin:0 0 24px;line-height:1.6;">
      Gracias por registrarte en Gym Tracker. Confirma tu dirección de correo para activar tu cuenta.
    </p>
    <a href="${link}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px;">
      Verificar mi cuenta
    </a>
    <p style="color:#555;font-size:13px;margin:0;">
      O copia este enlace en tu navegador:<br />
      <span style="color:#14b8a6;word-break:break-all;">${link}</span>
    </p>
    <p style="color:#555;font-size:12px;margin:20px 0 0;">Este enlace expira en 24 horas.</p>
  `)
}

function resetTemplate(link: string, name: string) {
  return baseTemplate('Restablecer contraseña', `
    <h2 style="color:#fff;margin:0 0 8px;font-size:22px;">Hola, ${name}</h2>
    <p style="color:#aaa;margin:0 0 24px;line-height:1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta.
    </p>
    <a href="${link}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px;">
      Restablecer contraseña
    </a>
    <p style="color:#555;font-size:13px;margin:0;">
      O copia este enlace en tu navegador:<br />
      <span style="color:#14b8a6;word-break:break-all;">${link}</span>
    </p>
    <p style="color:#555;font-size:12px;margin:20px 0 0;">Este enlace expira en 1 hora.</p>
  `)
}

import { backgroundQueue } from './queue'

// ── Funciones públicas ─────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const link = `${APP_URL()}/verificar-email?token=${token}`
  await backgroundQueue.add('send-verification-email', {
    type: 'email',
    to: email,
    subject: 'Verifica tu cuenta en Gym Tracker',
    html: verificationTemplate(link, name),
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const link = `${APP_URL()}/restablecer-contrasena?token=${token}`
  await backgroundQueue.add('send-reset-email', {
    type: 'email',
    to: email,
    subject: 'Restablecer contraseña — Gym Tracker',
    html: resetTemplate(link, name),
  })
}
