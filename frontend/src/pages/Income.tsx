import { useEffect, useState } from 'react';
import { useIncomeStore } from '../store/incomeStore';
import { Frequency, IncomeSource } from '../types';
import { formatCurrency, formatDate, frequencyLabel } from '../lib/utils';

const FREQUENCIES: Frequency[] = ['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY'];

const EMPTY_FORM = {
  name: '',
  amount: '',
  frequency: 'BIWEEKLY' as Frequency,
  nextPayDate: '',
};

type FormShape = typeof EMPTY_FORM;

function incomeToForm(source: IncomeSource): FormShape {
  return {
    name: source.name,
    amount: String(source.amount),
    frequency: source.frequency,
    nextPayDate: source.nextPayDate.slice(0, 10),
  };
}

function IncomeForm({
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
            placeholder="e.g. Main Job"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.frequency}
            onChange={(e) => onChange({ ...form, frequency: e.target.value as Frequency })}
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
            min={new Date().toISOString().slice(0, 10)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.nextPayDate}
            onChange={(e) => onChange({ ...form, nextPayDate: e.target.value })}
          />
        </div>
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

export default function Income() {
  const { sources, isLoading, fetchIncome, createIncome, updateIncome, deleteIncome } = useIncomeStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => { fetchIncome(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    try {
      await createIncome({
        name: addForm.name,
        amount: parseFloat(addForm.amount),
        frequency: addForm.frequency,
        nextPayDate: new Date(addForm.nextPayDate).toISOString(),
      });
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    } finally {
      setAddSubmitting(false);
    }
  }

  function startEdit(source: IncomeSource) {
    setEditingId(source.id);
    setEditForm(incomeToForm(source));
    setShowAddForm(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      await updateIncome(editingId, {
        name: editForm.name,
        amount: parseFloat(editForm.amount),
        frequency: editForm.frequency,
        nextPayDate: new Date(editForm.nextPayDate).toISOString(),
      });
      setEditingId(null);
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Income Sources</h1>
        <button
          onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Income'}
        </button>
      </div>

      {showAddForm && (
        <IncomeForm
          title="New Income Source"
          form={addForm}
          onChange={setAddForm}
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
          submitting={addSubmitting}
          submitLabel="Save"
        />
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No income sources yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {sources.map((source) => {
            if (editingId === source.id) {
              return (
                <div key={source.id} className="p-4">
                  <IncomeForm
                    title={`Edit — ${source.name}`}
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
                  onClick={() => startEdit(source)}
                  className="text-gray-300 hover:text-brand-600 transition-colors flex-shrink-0 text-sm"
                  title="Edit income source"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteIncome(source.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-xl leading-none"
                  title="Delete income source"
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
