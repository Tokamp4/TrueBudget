import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { useIncomeStore } from '../store/incomeStore';
import { useBillsStore } from '../store/billsStore';
import { BillCategory, Frequency } from '../types';
import { frequencyLabel } from '../lib/utils';
import { api } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'bank' | 'income' | 'bills';
const STEPS: Step[] = ['bank', 'income', 'bills'];

const STEP_META: Record<Step, { title: string; subtitle: string; emoji: string }> = {
  bank:   { emoji: '🏦', title: 'Connect your bank',      subtitle: 'Import transactions automatically with Plaid' },
  income: { emoji: '💵', title: 'How do you get paid?',   subtitle: 'Add your income sources so we can calculate your safe-to-spend' },
  bills:  { emoji: '📋', title: 'What bills do you have?', subtitle: 'Add your recurring bills so nothing slips through the cracks' },
};

const FREQUENCIES: Frequency[] = ['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY'];

const CATEGORIES: BillCategory[] = [
  'HOUSING', 'UTILITIES', 'FOOD', 'TRANSPORTATION',
  'HEALTHCARE', 'DEBT', 'INSURANCE', 'CHILDCARE', 'SUBSCRIPTIONS', 'OTHER',
];

const SEVERITY_OPTIONS = [
  { value: 5, label: 'Critical — eviction / utilities cut off' },
  { value: 4, label: 'High — late fees / collections risk' },
  { value: 3, label: 'Moderate — service disruption' },
  { value: 2, label: 'Minor — convenience impact' },
  { value: 1, label: 'Low — easily deferred' },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? 'w-6 bg-brand-600' : i < current ? 'w-2 bg-brand-300' : 'w-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Bank ─────────────────────────────────────────────────────────────

function BankStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState<string | null>(null); // institution name
  const [error, setError] = useState('');

  // Fetch a link token from the backend on mount
  useEffect(() => {
    api.post('/plaid/link-token')
      .then(({ data }) => setLinkToken(data.link_token))
      .catch(() => setError('Could not initialise Plaid. Check your PLAID_CLIENT_ID and PLAID-SECRET in the backend .env.'))
      .finally(() => setLoadingToken(false));
  }, []);

  // Called by react-plaid-link after the user completes the Plaid flow
  const onSuccess = useCallback(async (publicToken: string) => {
    setSyncing(true);
    setError('');
    try {
      // Exchange public token → access token stored in DB
      const { data } = await api.post('/plaid/exchange-token', { public_token: publicToken });
      // Pull transactions immediately so the dashboard has real data
      await api.post('/plaid/sync');
      setConnected(data.institution);
    } catch {
      setError('Bank connected but transaction sync failed. You can retry from settings later.');
    } finally {
      setSyncing(false);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess,
  });

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-3xl">
        🏦
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Connect your bank</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
          Link your account with Plaid to automatically pull in transactions and get a real balance for safe-to-spend.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 text-left">
          {error}
        </div>
      )}

      {connected ? (
        // Success state — show confirmation and let them continue
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 space-y-3">
          <p className="text-2xl">✅</p>
          <p className="text-sm font-semibold text-brand-700">{connected} connected!</p>
          <p className="text-xs text-gray-500">Transactions have been imported.</p>
          <button
            onClick={onNext}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-left space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sandbox test credentials</p>
            <p className="text-xs text-gray-500">Username: <span className="font-mono bg-white px-1 rounded border">user_good</span></p>
            <p className="text-xs text-gray-500">Password: <span className="font-mono bg-white px-1 rounded border">pass_good</span></p>
            <p className="text-xs text-gray-500">MFA code: <span className="font-mono bg-white px-1 rounded border">1234</span></p>
          </div>

          <button
            onClick={() => open()}
            disabled={!ready || loadingToken || syncing}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loadingToken ? 'Initialising…' : syncing ? 'Syncing transactions…' : 'Connect Bank Account'}
          </button>
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        I don't have a bank account to connect — skip this step
      </button>
    </div>
  );
}

// ─── Step 2: Income ───────────────────────────────────────────────────────────

type IncomeEntry = { name: string; amount: string; frequency: Frequency; nextPayDate: string };
const EMPTY_INCOME: IncomeEntry = { name: '', amount: '', frequency: 'BIWEEKLY', nextPayDate: '' };

function IncomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { createIncome } = useIncomeStore();
  const [entries, setEntries] = useState<IncomeEntry[]>([{ ...EMPTY_INCOME }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateEntry(i: number, patch: Partial<IncomeEntry>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function addAnother() {
    setEntries((prev) => [...prev, { ...EMPTY_INCOME }]);
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const filled = entries.filter((e) => e.name && e.amount && e.nextPayDate);
    if (filled.length === 0) { onSkip(); return; }

    setSaving(true);
    setError('');
    try {
      await Promise.all(
        filled.map((e) =>
          createIncome({
            name: e.name,
            amount: parseFloat(e.amount),
            frequency: e.frequency,
            nextPayDate: new Date(e.nextPayDate).toISOString(),
          })
        )
      );
      onNext();
    } catch {
      setError('Something went wrong saving your income. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-3xl mb-4">
          💵
        </div>
        <h2 className="text-xl font-bold text-gray-900">How do you get paid?</h2>
        <p className="text-sm text-gray-500 mt-1">Add your income sources — you can always edit these later.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
            {entries.length > 1 && (
              <button
                onClick={() => removeEntry(i)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Source name</label>
                <input
                  placeholder="e.g. Main Job, DoorDash"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.name}
                  onChange={(e) => updateEntry(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                <input
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.amount}
                  onChange={(e) => updateEntry(i, { amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.frequency}
                  onChange={(e) => updateEntry(i, { frequency: e.target.value as Frequency })}
                >
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{frequencyLabel(f)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Next pay date</label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.nextPayDate}
                  onChange={(e) => updateEntry(i, { nextPayDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addAnother}
          className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
        >
          + Add another income source
        </button>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Bills ────────────────────────────────────────────────────────────

type BillEntry = { name: string; amount: string; dueDate: string; category: BillCategory; consequenceSeverity: number };
const EMPTY_BILL: BillEntry = { name: '', amount: '', dueDate: '', category: 'OTHER', consequenceSeverity: 3 };

function BillsStep({ onFinish, onSkip }: { onFinish: () => void; onSkip: () => void }) {
  const { createBill } = useBillsStore();
  const [entries, setEntries] = useState<BillEntry[]>([{ ...EMPTY_BILL }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateEntry(i: number, patch: Partial<BillEntry>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function addAnother() {
    setEntries((prev) => [...prev, { ...EMPTY_BILL }]);
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const filled = entries.filter((e) => e.name && e.amount && e.dueDate);
    if (filled.length === 0) { onSkip(); return; }

    setSaving(true);
    setError('');
    try {
      await Promise.all(
        filled.map((e) =>
          createBill({
            name: e.name,
            amount: parseFloat(e.amount),
            dueDate: new Date(e.dueDate).toISOString(),
            category: e.category,
            consequenceSeverity: e.consequenceSeverity,
            isRecurring: true,
          })
        )
      );
      onFinish();
    } catch {
      setError('Something went wrong saving your bills. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-3xl mb-4">
          📋
        </div>
        <h2 className="text-xl font-bold text-gray-900">What bills do you have?</h2>
        <p className="text-sm text-gray-500 mt-1">Add your recurring bills — you can always add more later.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
            {entries.length > 1 && (
              <button
                onClick={() => removeEntry(i)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Bill name</label>
                <input
                  placeholder="e.g. Rent, Electricity"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.name}
                  onChange={(e) => updateEntry(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                <input
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.amount}
                  onChange={(e) => updateEntry(i, { amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.dueDate}
                  onChange={(e) => updateEntry(i, { dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.category}
                  onChange={(e) => updateEntry(i, { category: e.target.value as BillCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={entry.consequenceSeverity}
                  onChange={(e) => updateEntry(i, { consequenceSeverity: Number(e.target.value) })}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addAnother}
          className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
        >
          + Add another bill
        </button>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save & Go to Dashboard'}
        </button>
        {/* <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
        >
          Skip for now
        </button> */}
      </div>
    </div>
  );
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
    else navigate('/');
  };

  const finish = () => navigate('/');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 w-full max-w-lg shadow-sm">
        {/* Header */}
        <div className="text-center mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>

        <StepDots current={stepIndex} />

        {/* Steps */}
        {STEPS[stepIndex] === 'bank' && (
          <BankStep onNext={next} onSkip={next} />
        )}
        {STEPS[stepIndex] === 'income' && (
          <IncomeStep onNext={next} onSkip={next} />
        )}
        {STEPS[stepIndex] === 'bills' && (
          <BillsStep onFinish={finish} onSkip={finish} />
        )}
      </div>
    </div>
  );
}
