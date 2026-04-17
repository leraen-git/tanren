import { Resend } from 'resend'

const apiKey = process.env['RESEND_API_KEY']
const resend = apiKey ? new Resend(apiKey) : null
const FROM_EMAIL = process.env['FROM_EMAIL'] ?? 'Tanren <noreply@tanren.app>'
const isDev = process.env['NODE_ENV'] === 'development'

function emailTemplate(code: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#0E0E0E;background:#fff;">
  <h1 style="color:#E8192C;font-size:28px;margin:0 0 4px 0;letter-spacing:2px;font-family:sans-serif;">TANREN</h1>
  <p style="color:#888;font-size:14px;margin:0 0 32px 0;">Your sign-in code</p>
  <div style="background:#111111;border-radius:8px;padding:32px;text-align:center;margin-bottom:24px;">
    <span style="font-size:44px;font-weight:800;letter-spacing:14px;color:#FFFFFF;">${code}</span>
  </div>
  <p style="color:#555;font-size:14px;line-height:22px;margin-bottom:32px;">
    Enter this code in the Tanren app. It expires in <strong>10 minutes</strong> and can only be used once.
  </p>
  <p style="color:#AAA;font-size:12px;line-height:18px;border-top:1px solid #EEE;padding-top:16px;">
    If you didn't request this code, you can safely ignore this email.
  </p>
</body>
</html>`
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!resend) {
    if (isDev) {
      console.log('\n┌────────────────────────────────────────┐')
      console.log(`│  DEV OTP  →  ${to}`)
      console.log(`│  Code: ${code}`)
      console.log('└────────────────────────────────────────┘\n')
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `Your Tanren code: ${code}`,
    text: `Your Tanren sign-in code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    html: emailTemplate(code),
  })

  if (error) throw new Error(`Failed to send email: ${(error as any).message ?? 'unknown error'}`)
}
