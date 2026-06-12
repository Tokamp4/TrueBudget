import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleting) return;

    setDeleting(true);
    setError('');
    try {
      await api.delete('/auth/me', { data: { password } });
      logout();
      navigate('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (err?.response?.status === 401) {
        setError('Incorrect password. Please try again.');
      } else if (typeof msg === 'string') {
        setError(msg);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Account</h2>
        <p className="text-sm text-gray-500">
          Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-red-200 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="text-sm text-gray-500 mt-1">
            Permanently delete your account and all associated data — bills, income sources,
            transactions, and connected banks. This action cannot be undone.
          </p>
        </div>

        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Delete account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Enter your password to confirm
              </label>
              <input
                type="password"
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setPassword('');
                  setError('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting || !password}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : 'Permanently delete my account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
