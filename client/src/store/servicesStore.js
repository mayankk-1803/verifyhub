import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useServicesStore = create(
  persist(
    (set, get) => ({
      services: [],
      pricingRules: [],
      lastFetchedServices: 0,
      lastFetchedPricing: 0,

      fetchServices: async (force = false) => {
        const now = Date.now();
        // Cache for 5 minutes unless forced
                if (!force && get().services.length > 0 && now - get().lastFetchedServices < 10 * 60 * 1000) {
          return get().services;
        }

        try {
          const res = await api.get('/api/v1/services');
          if (res.data && res.data.success) {
            set({
              services: res.data.services || [],
              lastFetchedServices: now
            });
            return res.data.services;
          }
        } catch (err) {
          console.error('Failed to fetch services catalog:', err);
        }
        return get().services;
      },

      fetchPricingRules: async (force = false) => {
        const now = Date.now();
        if (!force && get().pricingRules.length > 0 && now - get().lastFetchedPricing < 10 * 60 * 1000) {
          return get().pricingRules;
        }

        try {
          const res = await api.get('/api/v1/admin/pricing');
          if (res.data && res.data.success) {
            set({
              pricingRules: res.data.rules || res.data.pricingRules || [],
              lastFetchedPricing: now
            });
            return res.data.rules || res.data.pricingRules || [];
          }
        } catch (err) {
          console.error('Failed to fetch pricing rules:', err);
        }
        return get().pricingRules;
      },

      clearCache: () => set({ services: [], pricingRules: [], lastFetchedServices: 0, lastFetchedPricing: 0 })
    }),
    {
      name: 'vh-services-cache',
    }
  )
);
