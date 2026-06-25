import { create } from 'zustand';
import api from '../lib/api';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

const activeRequests = {
  dashboard: false,
  wallet: false,
  keys: false,
  webhooks: false,
  tickets: false
};

const emptyDashboardData = {
  balance: 0,
  stats: {
    totalRequests: 0,
    successRate: 100,
    avgLatencyMs: 0,
    activeKeys: 0
  },
  chartTrends: [],
  pieData: [],
  transactions: [],
  invoices: [],
  apiKeys: [],
  webhooks: [],
  tickets: [],
  lastFetchedDashboard: 0,
  lastFetchedWallet: 0,
  lastFetchedKeys: 0,
  lastFetchedWebhooks: 0,
  lastFetchedTickets: 0,
  loading: {},
  errors: {}
};

const resetActiveRequests = () => {
  activeRequests.dashboard = false;
  activeRequests.wallet = false;
  activeRequests.keys = false;
  activeRequests.webhooks = false;
  activeRequests.tickets = false;
};

export const useDashboardStore = create((set, get) => ({
  ownerUserId: null,
  ...emptyDashboardData,

  fetchDashboardData: async (force = false) => {
    if (activeRequests.dashboard || get().loading.dashboard) {
      console.log("DASHBOARD FETCH SKIPPED", { section: 'dashboard', reason: 'in-flight' });
      return;
    }
    const now = Date.now();
    if (!force && now - get().lastFetchedDashboard < STALE_TIME && get().lastFetchedDashboard > 0) {
      console.log("DASHBOARD FETCH CACHE HIT", { section: 'dashboard' });
      return;
    }
    console.log("DASHBOARD FETCH START");
    activeRequests.dashboard = true;
    set(state => ({ loading: { ...state.loading, dashboard: true }, errors: { ...state.errors, dashboard: null } }));
    try {
      const res = await api.get('/api/v1/dashboard');
      if (res.data && res.data.success) {
        set({
          balance: res.data.walletBalance,
          stats: {
            totalRequests: res.data.totalRequests || 0,
            successRate: res.data.successRate || 100,
            avgLatencyMs: res.data.avgLatency || 0,
            avgLatency: res.data.avgLatency || 0,
            activeKeys: res.data.activeKeys || 0
          },
          chartTrends: res.data.trafficHistory || [],
          pieData: res.data.apiDistribution || [],
          lastFetchedDashboard: now
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to fetch dashboard data.';
      set(state => ({ errors: { ...state.errors, dashboard: errMsg } }));
      throw err;
    } finally {
      activeRequests.dashboard = false;
      set(state => ({ loading: { ...state.loading, dashboard: false } }));
    }
  },

  fetchWalletData: async (force = false) => {
    if (activeRequests.wallet || get().loading.wallet) {
      console.log("DASHBOARD FETCH SKIPPED", { section: 'wallet', reason: 'in-flight' });
      return;
    }
    const now = Date.now();
    if (!force && now - get().lastFetchedWallet < STALE_TIME && get().lastFetchedWallet > 0) {
      console.log("DASHBOARD FETCH CACHE HIT", { section: 'wallet' });
      return;
    }
    console.log("DASHBOARD FETCH START", { section: 'wallet' });
    activeRequests.wallet = true;
    set(state => ({ loading: { ...state.loading, wallet: true }, errors: { ...state.errors, wallet: null } }));
    try {
      const [txRes, invRes] = await Promise.all([
        api.get('/api/v1/wallet/transactions'),
        api.get('/api/v1/wallet/invoices')
      ]);
      set({
        transactions: txRes.data.success ? txRes.data.transactions : [],
        invoices: invRes.data.success ? invRes.data.invoices : [],
        lastFetchedWallet: now
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch wallet/billing data.';
      set(state => ({ errors: { ...state.errors, wallet: errMsg } }));
      throw err;
    } finally {
      activeRequests.wallet = false;
      set(state => ({ loading: { ...state.loading, wallet: false } }));
    }
  },

  fetchKeysData: async (force = false) => {
    if (activeRequests.keys || get().loading.keys) {
      console.log("DASHBOARD FETCH SKIPPED", { section: 'keys', reason: 'in-flight' });
      return;
    }
    const now = Date.now();
    if (!force && now - get().lastFetchedKeys < STALE_TIME && get().lastFetchedKeys > 0) {
      console.log("DASHBOARD FETCH CACHE HIT", { section: 'keys' });
      return;
    }
    console.log("DASHBOARD FETCH START", { section: 'keys' });
    activeRequests.keys = true;
    set(state => ({ loading: { ...state.loading, keys: true }, errors: { ...state.errors, keys: null } }));
    try {
      const res = await api.get('/api/v1/api-keys');
      if (res.data && res.data.success) {
        set({
          apiKeys: res.data.keys || [],
          lastFetchedKeys: now
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch API keys.';
      set(state => ({ errors: { ...state.errors, keys: errMsg } }));
      throw err;
    } finally {
      activeRequests.keys = false;
      set(state => ({ loading: { ...state.loading, keys: false } }));
    }
  },

  fetchWebhooksData: async (force = false) => {
    if (activeRequests.webhooks || get().loading.webhooks) {
      console.log("DASHBOARD FETCH SKIPPED", { section: 'webhooks', reason: 'in-flight' });
      return;
    }
    const now = Date.now();
    if (!force && now - get().lastFetchedWebhooks < STALE_TIME && get().lastFetchedWebhooks > 0) {
      console.log("DASHBOARD FETCH CACHE HIT", { section: 'webhooks' });
      return;
    }
    console.log("DASHBOARD FETCH START", { section: 'webhooks' });
    activeRequests.webhooks = true;
    set(state => ({ loading: { ...state.loading, webhooks: true }, errors: { ...state.errors, webhooks: null } }));
    try {
      const res = await api.get('/api/v1/webhooks');
      if (res.data && res.data.success) {
        set({
          webhooks: res.data.webhooks || [],
          lastFetchedWebhooks: now
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch webhooks.';
      set(state => ({ errors: { ...state.errors, webhooks: errMsg } }));
      throw err;
    } finally {
      activeRequests.webhooks = false;
      set(state => ({ loading: { ...state.loading, webhooks: false } }));
    }
  },

  fetchTicketsData: async (force = false) => {
    if (activeRequests.tickets || get().loading.tickets) {
      console.log("DASHBOARD FETCH SKIPPED", { section: 'tickets', reason: 'in-flight' });
      return;
    }
    const now = Date.now();
    if (!force && now - get().lastFetchedTickets < STALE_TIME && get().lastFetchedTickets > 0) {
      console.log("DASHBOARD FETCH CACHE HIT", { section: 'tickets' });
      return;
    }
    console.log("DASHBOARD FETCH START", { section: 'tickets' });
    activeRequests.tickets = true;
    set(state => ({ loading: { ...state.loading, tickets: true }, errors: { ...state.errors, tickets: null } }));
    try {
      const res = await api.get('/api/v1/support');
      if (res.data && res.data.success) {
        set({
          tickets: res.data.tickets || [],
          lastFetchedTickets: now
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch support tickets.';
      set(state => ({ errors: { ...state.errors, tickets: errMsg } }));
      throw err;
    } finally {
      activeRequests.tickets = false;
      set(state => ({ loading: { ...state.loading, tickets: false } }));
    }
  },

  // State mutators for key/webhook/ticket creations or deletions in UI
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setWebhooks: (webhooks) => set({ webhooks }),
  setTickets: (tickets) => set({ tickets }),
  setBalance: (balance) => set({ balance }),

  setCurrentUser: (userId) => {
    const nextUserId = userId || null;
    if (get().ownerUserId === nextUserId) return false;
    resetActiveRequests();
    set({ ...emptyDashboardData, ownerUserId: nextUserId });
    return true;
  },

  clearCache: () => {
    resetActiveRequests();
    set({ ...emptyDashboardData, ownerUserId: null });
  }
}));
