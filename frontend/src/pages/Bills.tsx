import { useEffect, useState } from 'react';
import { useBillsStore } from '../store/billsStore';
import { BillCategory } from '../types';
import { formatCurrency, formatDate, daysUntil, severityColor, severityLabel } from '../lib/utils';

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

const EMPTY_FORM = {
  name: '',
  amount: '',
  dueDate: '',
  category: 'OTHER' as BillCategory,
  consequenceSeverity: 3,
  isRecurring: true,
  notes: '',
};

export default function Bills() {
  const { bills, isLoading, fetchBills, createBill, togglePaid, deleteBill } = useBillsStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchBills(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBill({
        name: form.name,
        amount: parseFloat(form.amount),
        dueDate: new Date(form.dueDate).toISOString(),
        category: form.category,
        consequenceSeverity: form.consequenceSeverity,
        isRecurring: form.isRecurring,
        notes: form.notes || undefined,
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
        <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Bill'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-900">New Bill</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                required
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                required type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as BillCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consequence Severity</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.consequenceSeverity}
                onChange={(e) => setForm({ ...form, consequenceSeverity: Number(e.target.value) })}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox" id="isRecurring"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                className="rounded border-gray-300 w-4 h-4"
              />
              <label htmlFor="isRecurring" className="text-sm text-gray-700">Recurring bill</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit" disabled={submitting}
              className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Bill'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading bills…</p>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No bills yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {bills.map((bill) => {
            const days = daysUntil(bill.dueDate);
            return (
              <div
                key={bill.id}
                className={`flex items-center gap-4 p-4 transition-opacity ${bill.isPaid ? 'opacity-40' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={bill.isPaid}
                  onChange={(e) => togglePaid(bill.id, e.target.checked)}
                  className="rounded border-gray-300 w-4 h-4 flex-shrink-0 cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium text-gray-900 ${bill.isPaid ? 'line-through' : ''}`}>
                      {bill.name}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(bill.consequenceSeverity)}`}>
                      {severityLabel(bill.consequenceSeverity)}
                    </span>
                    {bill.isRecurring && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {bill.category.charAt(0) + bill.category.slice(1).toLowerCase()} · Due {formatDate(bill.dueDate)}
                    {!bill.isPaid && (
                      <span className={`ml-2 font-medium ${
                        days < 0 ? 'text-red-600' : days <= 3 ? 'text-orange-500' : 'text-gray-500'
                      }`}>
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? 'Due today'
                          : `${days}d left`}
                      </span>
                    )}
                  </p>
                </div>

                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {formatCurrency(bill.amount)}
                </p>

                <button
                  onClick={() => deleteBill(bill.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-xl leading-none"
                  title="Delete bill"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
