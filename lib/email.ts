const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://carnival-chi.vercel.app'
const FROM = 'AtomFlow <notifications@atomflow.email>'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  }).catch(() => {})
}

export function emailGoalSubmitted(opts: { employeeName: string; managerEmail: string }): [string, string, string] {
  const subject = `Goals submitted for review — ${opts.employeeName}`
  const html = `
    <p>Hi,</p>
    <p><strong>${opts.employeeName}</strong> has submitted their goals for your approval.</p>
    <p><a href="${APP_URL}/manager/approvals">Review goals →</a></p>
    <hr/>
    <p style="color:#94a3b8;font-size:12px">AtomFlow · Goal Setting &amp; Tracking Portal</p>
  `
  return [opts.managerEmail, subject, html]
}

export function emailGoalApproved(opts: { employeeName: string; employeeEmail: string }): [string, string, string] {
  const subject = 'Your goals have been approved'
  const html = `
    <p>Hi ${opts.employeeName},</p>
    <p>Your goals have been <strong>approved</strong> and are now locked.</p>
    <p>If you need to make changes, you can request an unlock from the Goals page.</p>
    <p><a href="${APP_URL}/employee/goals">View my goals →</a></p>
    <hr/>
    <p style="color:#94a3b8;font-size:12px">AtomFlow · Goal Setting &amp; Tracking Portal</p>
  `
  return [opts.employeeEmail, subject, html]
}

export function emailGoalReturned(opts: { employeeName: string; employeeEmail: string; reason: string }): [string, string, string] {
  const subject = 'Your goals have been returned for rework'
  const html = `
    <p>Hi ${opts.employeeName},</p>
    <p>Your goals have been <strong>returned for rework</strong> by your manager.</p>
    <p><strong>Reason:</strong> ${opts.reason}</p>
    <p>Please update your goals and resubmit.</p>
    <p><a href="${APP_URL}/employee/goals">Edit my goals →</a></p>
    <hr/>
    <p style="color:#94a3b8;font-size:12px">AtomFlow · Goal Setting &amp; Tracking Portal</p>
  `
  return [opts.employeeEmail, subject, html]
}
