import { create } from 'zustand';
import { Bill } from '../types';
import { api } from '../lib/api';

interface BillsState {
  bills: Bill[];
  isLoading: boolean;
  fetchBills: () => Promise<void>;
  createBill: (data: Omit<Bill, 'id' | 'isPaid' | 'priorityScore'>) => Promise<void>;
  updateBill: (id: string, data: Partial<Bill>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  togglePaid: (id: string, isPaid: boolean) => Promise<void>;
}

export const useBillsStore = create<BillsState>((set, get) => ({
  bills: [],
  isLoading: false,

  fetchBills: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/bills');
      set({ bills: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createBill: async (data) => {
    const { data: bill } = await api.post('/bills', data);
    set({ bills: [...get().bills, bill] });
  },

  updateBill: async (id, data) => {
    const { data: updated } = await api.put(`/bills/${id}`, data);
    set({ bills: get().bills.map((b) => (b.id === id ? updated : b)) });
  },

  deleteBill: async (id) => {
    await api.delete(`/bills/${id}`);
    set({ bills: get().bills.filter((b) => b.id !== id) });
  },

  togglePaid: async (id, isPaid) => {
    await api.put(`/bills/${id}`, { isPaid });
    set({ bills: get().bills.map((b) => (b.id === id ? { ...b, isPaid } : b)) });
  },
}));
