import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

type Status = 'verifying' | 'success' | 'already_verified' | 'expired' | 'invalid' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    api.get(`/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        if (data.message === 'Email already verified') setStatus('already_verified');
        else setStatus('success');
      })
      .catch((err) => {
        const msg: string = err?.response?.data?.error ?? '';
        if (msg.includes('expired')) setStatus('expired');
        else if (msg.includes('Invalid')) setStatus('invalid');
        else setStatus('error');
      });
  }, [token]);

  const STATES: Record<Status, { emoji: string; title: string; body: string; cta?: string; ctaTo?: string }> = {
    verifying:        { emoji: '⏳', title: 'Verifying…',               body: 'Checking your verification link.' },
    success:          { emoji: '✅', title: 'Email verified!',           body: 'Your account is confirmed. You\'re all set.', cta: 'Go to Dashboard', ctaTo: '/' },
    already_verified: { emoji: '✅', title: 'Already verified',          body: 'This email address was already confirmed.', cta: 'Go to Dashboard', ctaTo: '/' },
    expired:          { emoji: '⏰', title: 'Link expired',              body: 'This link is older than 24 hours. Sign in and request a new one from the banner.', cta: 'Sign in', ctaTo: '/login' },
    invalid:          { emoji: '❌', title: 'Invalid link',              body: 'This verification link isn\'t valid. It may have already been used.', cta: 'Sign in', ctaTo: '/login' },
    error:            { emoji: '⚠️', title: 'Something went wrong',      body: 'We couldn\'t verify your email right now. Please try again later.', cta: 'Sign in', ctaTo: '/login' },
  };

  const s = STATES[status];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 w-full max-w-sm text-center space-y-4">
        <p className="text-4xl">{s.emoji}</p>
        <h1 className="text-xl font-bold text-gray-900">{s.title}</h1>
        <p className="text-sm text-gray-500">{s.body}</p>
        {s.cta && s.ctaTo && (
          <Link
            to={s.ctaTo}
            className="inline-block mt-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {s.cta}
          </Link>
        )}
      </div>
    </div>
  );
}
