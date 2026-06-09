import { useEffect, useState } from 'react';
import { useBillsStore } from '../store/billsStore';
import { Bill, BillCategory } from '../types';
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

type FormShape = typeof EMPTY_FORM;

function billToForm(bill: Bill): FormShape {
  return {
    name: bill.name,
    amount: String(bill.amount),
    dueDate: bill.dueDate.slice(0, 10),
    category: bill.category,
    consequenceSeverity: bill.consequenceSeverity,
    isRecurring: bill.isRecurring,
    notes: bill.notes ?? '',
  };
}

function BillForm({
  title,
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  title: string;
  form: FormShape;
  onChange: (f: FormShape) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            required type="number" min="0.01" step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.amount}
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            required type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.dueDate}
            onChange={(e) => onChange({ ...form, dueDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value as BillCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consequence Severity</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.consequenceSeverity}
            onChange={(e) => onChange({ ...form, consequenceSeverity: Number(e.target.value) })}
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox" id={`recurring-${title}`}
            checked={form.isRecurring}
            onChange={(e) => onChange({ ...form, isRecurring: e.target.checked })}
            className="rounded border-gray-300 w-4 h-4"
          />
          <label htmlFor={`recurring-${title}`} className="text-sm text-gray-700">Recurring bill</label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit" disabled={submitting}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function Bills() {
  const { bills, isLoading, fetchBills, createBill, updateBill, togglePaid, deleteBill } = useBillsStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchBills(); }, []);

  const sortedBills = [...bills].sort((a, b) =>
    sortBy === 'priority'
      ? (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
      : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    try {
      await createBill({
        name: addForm.name,
        amount: parseFloat(addForm.amount),
        dueDate: new Date(addForm.dueDate).toISOString(),
        category: addForm.category,
        consequenceSeverity: addForm.consequenceSeverity,
        isRecurring: addForm.isRecurring,
        notes: addForm.notes || undefined,
      });
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    } finally {
      setAddSubmitting(false);
    }
  }

  function startEdit(bill: Bill) {
    setEditingId(bill.id);
    setEditForm(billToForm(bill));
    setShowAddForm(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      await updateBill(editingId, {
        name: editForm.name,
        amount: parseFloat(editForm.amount),
        dueDate: new Date(editForm.dueDate).toISOString(),
        category: editForm.category,
        consequenceSeverity: editForm.consequenceSeverity,
        isRecurring: editForm.isRecurring,
        notes: editForm.notes || undefined,
      });
      setEditingId(null);
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
        {bills.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setSortBy('priority')}
                className={`px-3 py-1.5 transition-colors ${sortBy === 'priority' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}
              >
                Priority
              </button>
              <button
                onClick={() => setSortBy('dueDate')}
                className={`px-3 py-1.5 transition-colors ${sortBy === 'dueDate' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}
              >
                Due Date
              </button>
            </div>
            <button
              onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              {showAddForm ? 'Cancel' : '+ Add Bill'}
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <BillForm
          title="New Bill"
          form={addForm}
          onChange={setAddForm}
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
          submitting={addSubmitting}
          submitLabel="Save Bill"
        />
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading bills…</p>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-8 py-16 flex flex-col items-center gap-4">
          <div className="text-5xl">🧾</div>
          <div className="text-center">
            <p className="text-gray-900 font-semibold text-base">No bills yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Add your recurring bills and due dates so TrueBudget can track what's coming up and prioritize what matters most.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            + Add your first bill
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {sortedBills.map((bill) => {
            const days = daysUntil(bill.dueDate);

            if (editingId === bill.id) {
              return (
                <div key={bill.id} className="p-4">
                  <BillForm
                    title={`Edit — ${bill.name}`}
                    form={editForm}
                    onChange={setEditForm}
                    onSubmit={handleEdit}
                    onCancel={() => setEditingId(null)}
                    submitting={editSubmitting}
                    submitLabel="Save Changes"
                  />
                </div>
              );
            }

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
                        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                      </span>
                    )}
                  </p>
                </div>

                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {formatCurrency(bill.amount)}
                </p>

                <button
                  onClick={() => startEdit(bill)}
                  className="text-gray-300 hover:text-brand-600 transition-colors flex-shrink-0 text-sm"
                  title="Edit bill"
                >
                  Edit
                </button>

                {confirmDeleteId === bill.id ? (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-gray-500">Delete?</span>
                    <button
                      onClick={() => { deleteBill(bill.id); setConfirmDeleteId(null); }}
                      className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConfirmDeleteId(bill.id); setEditingId(null); }}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-2xl leading-none"
                    title="Delete bill"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
