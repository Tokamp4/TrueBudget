import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Status = 'idle' | 'loading' | 'sent' | 'error';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('sent');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">💳 TrueBudget</h1>
          <p className="text-gray-500 text-sm mt-1">Reset your password</p>
        </div>

        {status === 'sent' ? (
          <div className="text-center space-y-4">
            <p className="text-4xl">📬</p>
            <p className="text-sm text-gray-700 font-medium">Check your inbox</p>
            <p className="text-sm text-gray-500">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>,
              we've sent a password reset link. It expires in 1 hour.
            </p>
            <Link to="/login" className="inline-block text-sm text-brand-700 hover:underline mt-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                {errorMsg}
              </div>
            )}

            <p className="text-sm text-gray-500 mb-5">
              Enter your account email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                {status === 'loading' ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              <Link to="/login" className="text-brand-700 hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
