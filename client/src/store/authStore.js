import { create } from 'zustand';
import api from '../lib/api';
import { useDashboardStore } from './dashboardStore';
const axios = api;

const clearDashboardSession = () => {
  useDashboardStore.getState().clearCache();
};

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('vh_user')) || null,
  accessToken: localStorage.getItem('vh_token') || null,
  refreshToken: localStorage.getItem('vh_refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('vh_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('vh_token', accessToken);
      localStorage.setItem('vh_refresh_token', refreshToken);
      localStorage.setItem('vh_user', JSON.stringify(user));
      clearDashboardSession();

      // Attach header globally
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to authenticate user.';
      set({ error: msg, loading: false });
      return false;
    }
  },

  sendOtp: async (phone) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/v1/auth/send-otp', { phone });
      set({ loading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to send OTP.';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/v1/auth/verify-otp', { phone, otp });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('vh_token', accessToken);
      localStorage.setItem('vh_refresh_token', refreshToken);
      localStorage.setItem('vh_user', JSON.stringify(user));
      clearDashboardSession();

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to verify OTP.';
      set({ error: msg, loading: false });
      return false;
    }
  },

  register: async (name, email, phone, password, organizationName) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/v1/auth/register', {
        name,
        email,
        phone,
        password,
        organizationName
      });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('vh_token', accessToken);
      localStorage.setItem('vh_refresh_token', refreshToken);
      localStorage.setItem('vh_user', JSON.stringify(user));
      clearDashboardSession();

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (error) {
      const msg = error.response?.data?.error || 'Registration failed.';
      set({ error: msg, loading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      const token = get().accessToken;
      if (token) {
        await axios.post('/api/v1/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Logout request failed: ', err);
    } finally {
      localStorage.removeItem('vh_token');
      localStorage.removeItem('vh_refresh_token');
      localStorage.removeItem('vh_user');

      delete axios.defaults.headers.common['Authorization'];
      clearDashboardSession();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  clearError: () => set({ error: null }),

  updateKycState: (kycData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...kycData };
      localStorage.setItem('vh_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  }
}));


// Re-hydrate authorization header if token is cached
const storedToken = localStorage.getItem('vh_token');
if (storedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}
