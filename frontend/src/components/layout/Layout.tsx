import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

const navItems = [
  { to: '/',           icon: '📊', label: 'Dashboard' },
  { to: '/bills',      icon: '📋', label: 'Bills' },
  { to: '/income',     icon: '💰', label: 'Income' },
  // { to: '/planner',    icon: '📅', label: 'Paycheck Planner' },
  { to: '/calculator', icon: '🧮', label: 'Loan Calculator' },
  { to: '/settings',   icon: '⚙️', label: 'Settings' },
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
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-brand-700">💳 TrueBudget</h1>
          <p className="text-xs text-gray-500 mt-1">Financial clarity</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
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
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-brand-700">💳 TrueBudget</h1>
        </div>

        {user && !user.emailVerified && (
          <VerificationBanner email={user.email} />
        )}
        <div className="max-w-5xl mx-auto p-4 sm:p-8 w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
