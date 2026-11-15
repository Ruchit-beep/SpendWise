// Sends email over an HTTPS API (Brevo or Resend). No SMTP, so it also works on hosts that block SMTP ports.
// Configure ONE of: BREVO_API_KEY or RESEND_API_KEY, plus MAIL_FROM ("SpendWise <you@example.com>").

function parseFrom(from) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || '');
  return m ? { name: m[1].replace(/^"|"$/g, '') || 'SpendWise', email: m[2] } : { name: 'SpendWise', email: (from || '').trim() };
}

export async function sendMail({ to, subject, text, html }) {
  if (process.env.NODE_ENV === 'test') {
    globalThis.__lastMail = { to, subject, text };
    return;
  }
  const from = process.env.MAIL_FROM;
  if (process.env.BREVO_API_KEY && from) {
    const sender = parseFrom(from);
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
    if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  if (process.env.RESEND_API_KEY && from) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  // No provider configured: never fail the request, and never print reset links in production logs.
  console.warn(`[mail] No email provider configured (set BREVO_API_KEY or RESEND_API_KEY and MAIL_FROM). Not sent: "${subject}" to ${to}`);
  if (process.env.NODE_ENV !== 'production') console.log(`[mail:dev]\n${text}`);
}
