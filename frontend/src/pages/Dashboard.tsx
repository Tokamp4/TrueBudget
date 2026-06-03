import { useEffect } from 'react';
import { useHealthStore } from '../store/incomeStore';
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

  useEffect(() => {
    fetchScore();
    fetchBills();
  }, []);

  // Re-fetch health score whenever bill state changes (e.g. marked paid)
  // so safe-to-spend and score stay in sync with the Bills page.
  useEffect(() => {
    if (bills.length > 0) fetchScore();
  }, [bills]);

  const urgentBills = bills.filter((b) => !b.isPaid && daysUntil(b.dueDate) <= 7);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Top cards */}
      <div className="grid grid-cols-3 gap-4">
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
          {snapshot && <ScoreRing score={snapshot.score} />}
          <div>
            <p className="text-sm text-gray-500">Health Score</p>
            <p className="text-xs text-gray-400 mt-1">
              Buffer: {snapshot?.bufferDays.toFixed(1)} days
            </p>
            <p className="text-xs text-gray-400">
              Bill rate: {snapshot ? Math.round(snapshot.billPayRate * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

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
              <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{bill.name}</p>
                  <p className="text-xs text-gray-500">Due {formatDate(bill.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
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
    </div>
  );
}
