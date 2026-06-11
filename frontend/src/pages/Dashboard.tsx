import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHealthStore, useIncomeStore } from '../store/incomeStore';
import { useBillsStore } from '../store/billsStore';
import { formatCurrency, severityColor, severityLabel, daysUntil, formatDate, healthScoreColor } from '../lib/utils';

function ScoreRing({ score }: { score: number }) {
  const color = healthScoreColor(score);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

export default function Dashboard() {
  const { snapshot, fetchScore } = useHealthStore();
  const { bills, fetchBills } = useBillsStore();
  const { sources } = useIncomeStore();

  useEffect(() => {
    fetchScore();
    fetchBills();
  }, []);

  useEffect(() => {
    if (bills.length > 0) fetchScore();
  }, [bills]);

  useEffect(() => {
    if (sources.length > 0) fetchScore();
  }, [sources]);

  const isEmpty = bills.length === 0 && sources.length === 0;

  const pastDueBills = bills
    .filter((b) => !b.isPaid && daysUntil(b.dueDate) < 0)
    .sort((a, b) => b.consequenceSeverity - a.consequenceSeverity);

  const urgentBills = bills.filter((b) => !b.isPaid && daysUntil(b.dueDate) >= 0 && daysUntil(b.dueDate) <= 7);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {isEmpty ? (
        <div className="bg-white rounded-xl border border-gray-200 px-8 py-16 flex flex-col items-center gap-6 text-center">
          <div className="text-5xl">📊</div>
          <div>
            <p className="text-gray-900 font-semibold text-lg">Your financial overview lives here</p>
            <p className="text-gray-400 text-sm mt-2 max-w-md">
              Once you add your income sources and bills, the dashboard will show your health score,
              safe-to-spend amount, days until your next payday, and any bills coming up in the next 7 days.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md text-left">
            {[
              { icon: '💵', title: 'Safe to Spend', desc: 'What you can spend after covering upcoming bills' },
              { icon: '📅', title: 'Days to Payday', desc: 'Countdown to your next income deposit' },
              { icon: '❤️', title: 'Health Score', desc: 'A 0–100 score based on your bill pay rate and buffer' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl mb-2">{icon}</p>
                <p className="text-xs font-semibold text-gray-700">{title}</p>
                <p className="text-xs text-gray-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <Link
              to="/income"
              className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              + Add income source
            </Link>
            <Link
              to="/bills"
              className="px-5 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              + Add a bill
            </Link>
          </div>
        </div>
      ) : (
        <>
      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Safe to spend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Safe to Spend</p>
          <p className="text-3xl font-bold text-brand-600">
            {snapshot ? formatCurrency(snapshot.safeToSpend ?? 0) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">After upcoming bills</p>
        </div>

        {/* Days until pay */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Days Until Payday</p>
          <p className="text-3xl font-bold text-gray-800">
            {snapshot?.daysUntilNextPay ?? '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Next income incoming</p>
        </div>

        {/* Health score */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          {snapshot?.score != null ? (
            <>
              <ScoreRing score={snapshot.score} />
              <div>
                <p className="text-sm text-gray-500">Health Score</p>
                <p className="text-xs text-gray-400 mt-1">
                  Buffer: {snapshot.bufferDays.toFixed(1)} days
                </p>
                <p className="text-xs text-gray-400">
                  Bill rate: {Math.round(snapshot.billPayRate * 100)}%
                </p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Health Score</p>
              <p className="text-2xl font-bold text-gray-300 mt-1">—</p>
              <p className="text-xs text-gray-400 mt-1">Add bills or transactions to unlock</p>
            </div>
          )}
        </div>
      </div>

      {/* Past due bills — only shown when there are overdue unpaid bills */}
      {pastDueBills.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-1">
            ⚠️ Past Due
          </h2>
          <p className="text-xs text-red-500 mb-4">
            {pastDueBills.length} unpaid {pastDueBills.length === 1 ? 'bill has' : 'bills have'} passed their due date. Pay these as soon as possible.
          </p>
          <div className="space-y-3">
            {pastDueBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-3 flex-wrap py-2 border-b border-red-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{bill.name}</p>
                  <p className="text-xs text-red-500">
                    {Math.abs(daysUntil(bill.dueDate))} {Math.abs(daysUntil(bill.dueDate)) === 1 ? 'day' : 'days'} overdue · due {formatDate(bill.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(bill.consequenceSeverity)}`}>
                    {severityLabel(bill.consequenceSeverity)}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent bills */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          🚨 Due in Next 7 Days
        </h2>
        {urgentBills.length === 0 ? (
          <p className="text-sm text-gray-400">No urgent bills — you're clear this week.</p>
        ) : (
          <div className="space-y-3">
            {urgentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-3 flex-wrap py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{bill.name}</p>
                  <p className="text-xs text-gray-500">Due {formatDate(bill.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(bill.consequenceSeverity)}`}>
                    {severityLabel(bill.consequenceSeverity)}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
