import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useBillsStore } from '../store/billsStore';
import { useIncomeStore } from '../store/incomeStore';
import { Frequency } from '../types';
import { formatCurrency, formatDate, frequencyLabel } from '../lib/utils';

interface RawSuggestion {
  merchant: string;
  amount: number;
  cadence: string;
  nextDate: string;
  type: 'INCOME' | 'EXPENSE';
  confidence: 'high' | 'medium';
  sourceTransactionIds: string[];
}

interface EditableSuggestion extends RawSuggestion {
  id: string;
  editing: boolean;
  name: string;
  amountStr: string;
  dateStr: string;
}

function toEditable(s: RawSuggestion): EditableSuggestion {
  return {
    ...s,
    id: s.sourceTransactionIds.join('-'),
    editing: false,
    name: s.merchant,
    amountStr: String(s.amount),
    dateStr: s.nextDate.slice(0, 10),
  };
}

const CONFIDENCE_STYLES: Record<'high' | 'medium', string> = {
  high: 'text-green-700 bg-green-50',
  medium: 'text-yellow-700 bg-yellow-50',
};

function SuggestionCard({
  item,
  saving,
  onConfirm,
  onDismiss,
  onEditToggle,
  onEditChange,
}: {
  item: EditableSuggestion;
  saving: boolean;
  onConfirm: (item: EditableSuggestion) => void;
  onDismiss: (id: string) => void;
  onEditToggle: (id: string) => void;
  onEditChange: (id: string, patch: Partial<EditableSuggestion>) => void;
}) {
  if (item.editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={item.name}
              onChange={(e) => onEditChange(item.id, { name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
            <input
              type="number" min="0.01" step="0.01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={item.amountStr}
              onChange={(e) => onEditChange(item.id, { amountStr: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {item.type === 'INCOME' ? 'Next pay date' : 'Next due date'}
            </label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={item.dateStr}
              onChange={(e) => onEditChange(item.id, { dateStr: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEditToggle(item.id)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(item)}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save & Confirm'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{item.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_STYLES[item.confidence]}`}>
            {item.confidence === 'high' ? 'High confidence' : 'Medium confidence'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {frequencyLabel(item.cadence)} · Next {item.type === 'INCOME' ? 'expected' : 'due'} {formatDate(item.dateStr)}
        </p>
      </div>

      <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
        {formatCurrency(Number(item.amountStr) || 0)}
      </p>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => onConfirm(item)}
          disabled={saving}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Confirm'}
        </button>
        <button
          onClick={() => onEditToggle(item.id)}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDismiss(item.id)}
          className="text-gray-300 hover:text-red-500 transition-colors text-2xl leading-none"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function Suggestions() {
  const navigate = useNavigate();
  const { createBill } = useBillsStore();
  const { createIncome } = useIncomeStore();

  const [bills, setBills] = useState<EditableSuggestion[]>([]);
  const [income, setIncome] = useState<EditableSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [initiallyEmpty, setInitiallyEmpty] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  useEffect(() => {
    api.get('/plaid/suggestions')
      .then(({ data }) => {
        const b = (data.bills as RawSuggestion[]).map(toEditable);
        const i = (data.income as RawSuggestion[]).map(toEditable);
        setBills(b);
        setIncome(i);
        setInitiallyEmpty(b.length === 0 && i.length === 0);
      })
      .catch(() => setError('Could not load suggestions. You can add things manually instead.'))
      .finally(() => setLoading(false));
  }, []);

  // Once every suggestion has been actioned, move on to the dashboard
  useEffect(() => {
    if (!loading && !initiallyEmpty && bills.length === 0 && income.length === 0) {
      const t = setTimeout(() => navigate('/'), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, initiallyEmpty, bills.length, income.length, navigate]);

  function billPayload(item: EditableSuggestion) {
    return {
      name: item.name,
      amount: parseFloat(item.amountStr),
      dueDate: new Date(item.dateStr).toISOString(),
      category: 'OTHER' as const,
      consequenceSeverity: 3,
      isRecurring: true,
    };
  }

  function incomePayload(item: EditableSuggestion) {
    return {
      name: item.name,
      amount: parseFloat(item.amountStr),
      frequency: item.cadence as Frequency,
      nextPayDate: new Date(item.dateStr).toISOString(),
    };
  }

  async function confirmBill(item: EditableSuggestion) {
    setSavingId(item.id);
    try {
      await createBill(billPayload(item));
      setBills((prev) => prev.filter((b) => b.id !== item.id));
    } finally {
      setSavingId(null);
    }
  }

  async function confirmIncome(item: EditableSuggestion) {
    setSavingId(item.id);
    try {
      await createIncome(incomePayload(item));
      setIncome((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setSavingId(null);
    }
  }

  function dismissBill(id: string) {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  function dismissIncome(id: string) {
    setIncome((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleBillEdit(id: string) {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, editing: !b.editing } : b)));
  }

  function toggleIncomeEdit(id: string) {
    setIncome((prev) => prev.map((i) => (i.id === id ? { ...i, editing: !i.editing } : i)));
  }

  function editBill(id: string, patch: Partial<EditableSuggestion>) {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function editIncome(id: string, patch: Partial<EditableSuggestion>) {
    setIncome((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function confirmAll() {
    setConfirmingAll(true);
    try {
      const billsToConfirm = bills.filter((b) => !b.editing);
      const incomeToConfirm = income.filter((i) => !i.editing);

      await Promise.all([
        ...billsToConfirm.map((b) => createBill(billPayload(b))),
        ...incomeToConfirm.map((i) => createIncome(incomePayload(i))),
      ]);

      const confirmedBillIds = new Set(billsToConfirm.map((b) => b.id));
      const confirmedIncomeIds = new Set(incomeToConfirm.map((i) => i.id));
      setBills((prev) => prev.filter((b) => !confirmedBillIds.has(b.id)));
      setIncome((prev) => prev.filter((i) => !confirmedIncomeIds.has(i.id)));
    } finally {
      setConfirmingAll(false);
    }
  }

  const isEmpty = !loading && bills.length === 0 && income.length === 0;
  const hasUnedited = bills.some((b) => !b.editing) || income.some((i) => !i.editing);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-3xl mb-4">
            🔍
          </div>
          <h1 className="text-xl font-bold text-gray-900">We found some recurring patterns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review what we detected from your bank transactions — confirm, tweak, or dismiss each one.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center">Looking for patterns…</p>
        ) : isEmpty ? (
          <div className="bg-white rounded-xl border border-gray-200 px-8 py-16 flex flex-col items-center gap-4 text-center">
            <div className="text-5xl">🤷</div>
            <div>
              <p className="text-gray-900 font-semibold text-base">
                {initiallyEmpty ? 'No recurring patterns found yet' : 'All done!'}
              </p>
              <p className="text-gray-400 text-sm mt-1 max-w-sm">
                {initiallyEmpty
                  ? "We couldn't detect any recurring patterns yet. Add your bills manually."
                  : 'Taking you to your dashboard…'}
              </p>
            </div>
            {initiallyEmpty && (
              <div className="flex gap-3 mt-2">
                <Link
                  to="/bills"
                  className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                >
                  + Add a bill
                </Link>
                <Link
                  to="/income"
                  className="px-5 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  + Add income
                </Link>
              </div>
            )}
            {initiallyEmpty && (
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
              >
                Skip — go to dashboard
              </button>
            )}
          </div>
        ) : (
          <>
            {bills.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Recurring payments found</h2>
                {bills.map((item) => (
                  <SuggestionCard
                    key={item.id}
                    item={item}
                    saving={savingId === item.id}
                    onConfirm={confirmBill}
                    onDismiss={dismissBill}
                    onEditToggle={toggleBillEdit}
                    onEditChange={editBill}
                  />
                ))}
              </div>
            )}

            {income.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Recurring income found</h2>
                {income.map((item) => (
                  <SuggestionCard
                    key={item.id}
                    item={item}
                    saving={savingId === item.id}
                    onConfirm={confirmIncome}
                    onDismiss={dismissIncome}
                    onEditToggle={toggleIncomeEdit}
                    onEditChange={editIncome}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div className="flex gap-3">
                <Link to="/bills" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  + Add a bill manually
                </Link>
                <span className="text-gray-300">·</span>
                <Link to="/income" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  + Add income manually
                </Link>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={confirmAll}
                  disabled={confirmingAll || !hasUnedited}
                  className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {confirmingAll ? 'Saving…' : 'Confirm all'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
