import { useEffect, useState } from 'react';
import { useIncomeStore } from '../store/incomeStore';
import { Frequency } from '../types';
import { formatCurrency, formatDate, frequencyLabel } from '../lib/utils';

const FREQUENCIES: Frequency[] = ['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY'];

const EMPTY_FORM = {
  name: '',
  amount: '',
  frequency: 'BIWEEKLY' as Frequency,
  nextPayDate: '',
};

export default function Income() {
  const { sources, isLoading, fetchIncome, createIncome, deleteIncome } = useIncomeStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchIncome(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createIncome({
        name: form.name,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        nextPayDate: new Date(form.nextPayDate).toISOString(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Income Sources</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Income'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-900">New Income Source</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                required
                placeholder="e.g. Main Job"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                required type="number" min="0.01" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{frequencyLabel(f)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Pay Date</label>
              <input
                required type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.nextPayDate}
                onChange={(e) => setForm({ ...form, nextPayDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit" disabled={submitting}
              className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No income sources yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{source.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {frequencyLabel(source.frequency)} · Next payday: {formatDate(source.nextPayDate)}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                {formatCurrency(source.amount)}
              </p>
              <button
                onClick={() => deleteIncome(source.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-xl leading-none"
                title="Delete income source"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
