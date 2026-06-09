import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

const navItems = [
  { to: '/',           icon: '📊', label: 'Dashboard' },
  { to: '/bills',      icon: '📋', label: 'Bills' },
  { to: '/income',     icon: '💰', label: 'Income' },
  // { to: '/planner',    icon: '📅', label: 'Paycheck Planner' },
  { to: '/calculator', icon: '🧮', label: 'Loan Calculator' },
  // { to: '/history',    icon: '🕒', label: 'History' },
];

function VerificationBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-800">
        📬 Please verify your email address. We sent a link to <span className="font-medium">{email}</span>.
      </p>
      {sent ? (
        <span className="text-xs text-amber-700 font-medium flex-shrink-0">Sent ✓</span>
      ) : (
        <button
          onClick={resend}
          disabled={sending}
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline flex-shrink-0 disabled:opacity-50 transition-colors"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-brand-700">💳 ClearBudget</h1>
          <p className="text-xs text-gray-500 mt-1">Financial clarity</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {user?.firstName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {user && !user.emailVerified && (
          <VerificationBanner email={user.email} />
        )}
        <div className="max-w-5xl mx-auto p-8 w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
