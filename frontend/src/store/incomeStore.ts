import { create } from 'zustand';
import { IncomeSource, HealthSnapshot, ConnectedBank } from '../types';
import { api } from '../lib/api';

// ---- Income Store ----
interface IncomeState {
  sources: IncomeSource[];
  isLoading: boolean;
  fetchIncome: () => Promise<void>;
  createIncome: (data: Omit<IncomeSource, 'id'>) => Promise<void>;
  updateIncome: (id: string, data: Partial<IncomeSource>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeState>((set, get) => ({
  sources: [],
  isLoading: false,

  fetchIncome: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/income');
      set({ sources: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createIncome: async (data) => {
    const { data: source } = await api.post('/income', data);
    set({ sources: [...get().sources, source] });
  },

  updateIncome: async (id, data) => {
    const { data: updated } = await api.put(`/income/${id}`, data);
    set({ sources: get().sources.map((s) => (s.id === id ? updated : s)) });
  },

  deleteIncome: async (id) => {
    await api.delete(`/income/${id}`);
    set({ sources: get().sources.filter((s) => s.id !== id) });
  },
}));

// ---- Health Store ----
interface HealthState {
  snapshot: HealthSnapshot | null;
  history: HealthSnapshot[];
  banks: ConnectedBank[];
  isLoading: boolean;
  fetchScore: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchBanks: () => Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  snapshot: null,
  history: [],
  banks: [],
  isLoading: false,

  fetchScore: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/health/score');
      set({ snapshot: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHistory: async () => {
    const { data } = await api.get('/health/history');
    set({ history: data });
  },

  fetchBanks: async () => {
    const { data } = await api.get('/plaid/banks');
    set({ banks: data });
  },
}));
