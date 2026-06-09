import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM    = process.env.EMAIL_FROM || 'TrueBudget <onboarding@resend.dev>';

export async function sendVerificationEmail(to: string, firstName: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your TrueBudget email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#111;margin-bottom:8px">
          💳 TrueBudget
        </h1>
        <p style="color:#444;font-size:15px;margin-bottom:24px">
          Hi ${firstName}, thanks for signing up! Please verify your email address to confirm your account.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#16a34a;color:#fff;font-size:14px;font-weight:600;
                  padding:12px 24px;border-radius:8px;text-decoration:none">
          Verify Email Address
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          This link expires in 24 hours. If you didn't create a TrueBudget account, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    // Resend returns errors as objects rather than thrown exceptions
    throw Object.assign(new Error(error.message), { statusCode: (error as any).statusCode });
  }

  return data;
}
