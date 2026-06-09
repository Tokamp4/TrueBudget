import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type Status = 'idle' | 'loading' | 'success' | 'invalid' | 'error';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>(token ? 'idle' : 'invalid');
  const [errorMsg, setErrorMsg] = useState('');
  const called = useRef(false);

  // Eagerly flag missing token without a round-trip
  useEffect(() => {
    if (!token) setStatus('invalid');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (called.current) return;

    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    called.current = true;
    setStatus('loading');
    setErrorMsg('');

    try {
      await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      called.current = false;
      const msg: string = err?.response?.data?.error ?? '';
      if (msg.includes('expired') || msg.includes('Invalid')) {
        setStatus('invalid');
      } else {
        setErrorMsg(msg || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    }
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 w-full max-w-sm text-center space-y-4">
          <p className="text-4xl">❌</p>
          <h1 className="text-xl font-bold text-gray-900">Invalid or expired link</h1>
          <p className="text-sm text-gray-500">
            This password reset link isn't valid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block mt-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 w-full max-w-sm text-center space-y-4">
          <p className="text-4xl">✅</p>
          <h1 className="text-xl font-bold text-gray-900">Password updated!</h1>
          <p className="text-sm text-gray-500">
            Your password has been reset. Redirecting you to sign in…
          </p>
          <Link to="/login" className="inline-block text-sm text-brand-700 hover:underline">
            Sign in now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">💳 TrueBudget</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a new password</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              minLength={8}
              required
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErrorMsg(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {status === 'loading' ? 'Saving…' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
