import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { useAuthStore } from '../store/authStore';
import { useHealthStore } from '../store/incomeStore';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

function AccountRow({
  account,
  onDisconnect,
}: {
  account: { id: string; name: string; subtype: string | null };
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.delete(`/plaid/accounts/${account.id}`);
      onDisconnect();
    } catch {
      setDisconnecting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 capitalize">{account.subtype ?? 'account'}</span>
        <span className="text-gray-200">·</span>
        <span className="text-xs text-gray-600">{account.name}</span>
      </div>

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Remove and delete its transactions?</span>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            {disconnecting ? 'Removing…' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs text-gray-300 hover:text-red-500 transition-colors"
        >
          Disconnect
        </button>
      )}
    </li>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { banks, fetchBanks } = useHealthStore();
  const mounted = useRef(true);

  // ── Plaid ────────────────────────────────────────────────────────────────
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [plaidError, setPlaidError] = useState('');
  const [newlyConnected, setNewlyConnected] = useState('');

  useEffect(() => {
    // Reset on every mount (StrictMode unmounts + remounts, so this must be
    // set here rather than at useRef initialisation time).
    mounted.current = true;
    fetchBanks();
    api.post('/plaid/link-token')
      .then(({ data }) => { if (mounted.current) setLinkToken(data.link_token); })
      .catch(() => { if (mounted.current) setPlaidError('Could not initialise Plaid. Try refreshing the page.'); })
      .finally(() => { if (mounted.current) setLoadingToken(false); });
    return () => { mounted.current = false; };
  }, []);

  const onPlaidSuccess = useCallback(async (publicToken: string) => {
    setSyncing(true);
    setPlaidError('');
    setNewlyConnected('');
    try {
      const { data } = await api.post('/plaid/exchange-token', { public_token: publicToken });
      await api.post('/plaid/sync');
      if (mounted.current) {
        setNewlyConnected(data.institution);
        fetchBanks();
      }
    } catch {
      if (mounted.current) setPlaidError('Bank connected but transaction sync failed. You can try syncing again later.');
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, []);

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess: onPlaidSuccess });

  // ── Account deletion ──────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleting) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete('/auth/me', { data: { password } });
      logout();
      navigate('/login');
    } catch (err: any) {
      if (!mounted.current) return;
      const msg = err?.response?.data?.error;
      if (err?.response?.status === 401) {
        setDeleteError('Incorrect password. Please try again.');
      } else if (typeof msg === 'string') {
        setDeleteError(msg);
      } else {
        setDeleteError('Something went wrong. Please try again.');
      }
    } finally {
      if (mounted.current) setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account.</p>
      </div>

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Account</h2>
        <p className="text-sm text-gray-500">
          Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
        </p>
      </div>

      {/* Connected banks */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Connected banks</h2>
          <button
            onClick={() => open()}
            disabled={!ready || loadingToken || syncing}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {syncing ? 'Syncing…' : loadingToken ? 'Initialising…' : '+ Connect bank'}
          </button>
        </div>

        {plaidError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {plaidError}
          </div>
        )}

        {newlyConnected && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            ✅ <span className="font-medium">{newlyConnected}</span> connected and synced.
          </div>
        )}

        {banks.length === 0 ? (
          <p className="text-sm text-gray-400">No banks connected yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {banks.map((bank) => (
              <li key={bank.id} className="py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-base flex-shrink-0">
                    🏦
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{bank.institution}</p>
                    <p className="text-xs text-gray-400">Connected {formatDate(bank.createdAt)}</p>
                  </div>
                </div>
                {bank.accounts.length > 0 && (
                  <ul className="ml-11 space-y-1.5">
                    {bank.accounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onDisconnect={() => fetchBanks()}
                      />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Danger zone */}
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
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {deleteError}
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
                onChange={(e) => { setPassword(e.target.value); setDeleteError(''); }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setConfirmOpen(false); setPassword(''); setDeleteError(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
