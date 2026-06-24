import axios from 'axios';
import { API_BASE_URL } from '../config/api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically attach Authorization header from localStorage
api.interceptors.request.use(
  (config) => {
    // Prevent duplicate /api/v1 prefixes
    if (config.baseURL && config.url) {
      if (config.url.startsWith('/api/v1')) {
        if (config.baseURL.endsWith('/api/v1') || config.baseURL === '/api/v1') {
          config.url = config.url.substring(7);
        }
      } else if (config.url.startsWith('api/v1')) {
        if (config.baseURL.endsWith('/api/v1') || config.baseURL === '/api/v1') {
          config.url = config.url.substring(6);
        }
      }
    }

    const token = localStorage.getItem('vh_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle responses, global unauthorized redirect, and NSDL sanitization
api.interceptors.response.use(
  (response) => {
    const url = response.config.url || '';
    
    // Sanitize services list returned to the UI components
    if (url.includes('/api/v1/services') || url.includes('/services')) {
      if (response.data && response.data.success && Array.isArray(response.data.services)) {
        response.data.services = response.data.services.map(s => {
          let name = s.name || '';
          let description = s.description || '';
          let inputFields = s.inputFields;
          let sampleResponse = s.sampleResponse;

          if (name.includes('NSDL')) {
            name = name.replace(/NSDL\s*/g, '').trim();
          }
          if (s.key === 'PAN_DECODE') {
            name = 'PAN Decode';
          } else if (s.key === 'PAN_TRACK') {
            name = 'PAN Track';
          }

          if (description.includes('NSDL')) {
            description = description.replace(/NSDL\s*/g, 'national ').trim();
          }
          if (s.key === 'PAN_DECODE') {
            description = 'Decode detailed registries for cardholder category, issuing authority, and profile logs.';
          } else if (s.key === 'PAN_TRACK') {
            description = 'Track dispatch, processing status, and SpeedPost AWB details of PAN card applications.';
          }

          if (Array.isArray(inputFields)) {
            inputFields = inputFields.map(f => {
              let label = f.label || '';
              if (label.includes('NSDL')) {
                label = label.replace(/\(NSDL\)/g, '').replace(/NSDL/g, '').trim();
              }
              return { ...f, label };
            });
          }

          if (sampleResponse && sampleResponse.data && sampleResponse.data.issuingAuthority === 'NSDL') {
            sampleResponse = {
              ...sampleResponse,
              data: {
                ...sampleResponse.data,
                issuingAuthority: 'UTI/ITD'
              }
            };
          }

          return {
            ...s,
            name,
            description,
            inputFields,
            sampleResponse
          };
        });
      }
    } else if (url.includes('/api/v1/docs') || url.includes('/docs')) {
      if (response.data) {
        let str = JSON.stringify(response.data);
        str = str.replace(/NSDL/g, 'National Database');
        response.data = JSON.parse(str);
      }
    }

    return response;
  },
  (error) => {
    if (error.response && error.response.status === 429) {
      console.log("RATE LIMIT HIT");
    }
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;
      const errorMsg = error.response.data && (error.response.data.error || error.response.data.message || '');
      const isJwtInvalid = typeof errorMsg === 'string' && (
        errorMsg.toLowerCase().includes('token') ||
        errorMsg.toLowerCase().includes('jwt') ||
        errorMsg.toLowerCase().includes('access token') ||
        errorMsg.toLowerCase().includes('missing or invalid') ||
        errorMsg.toLowerCase().includes('unauthorized') ||
        errorMsg.toLowerCase().includes('not found')
      );

      const isVerificationRequest = originalRequest && (
        (originalRequest.headers && originalRequest.headers['x-api-key']) ||
        (originalRequest.url && (
          originalRequest.url.includes('/verify') || 
          originalRequest.url.includes('/gateway') ||
          originalRequest.url.includes('/GstVerify') ||
          originalRequest.url.includes('/PanToGst') ||
          originalRequest.url.includes('/nsdl_decode') ||
          originalRequest.url.includes('/pancard_status') ||
          originalRequest.url.includes('/gst') ||
          originalRequest.url.includes('/pan') ||
          originalRequest.url.includes('/aadhaar') ||
          originalRequest.url.includes('/voter') ||
          originalRequest.url.includes('/ration')
        ))
      );

      if (isJwtInvalid && !isVerificationRequest) {
        if (originalRequest._retry) {
          console.warn('Refresh token retry failed, logging out.');
          localStorage.removeItem('vh_token');
          localStorage.removeItem('vh_refresh_token');
          localStorage.removeItem('vh_user');
          const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || window.location.pathname === '/kyc';
          if (isProtectedRoute && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem('vh_refresh_token');
        if (!refreshToken) {
          console.warn('No refresh token available, logging out.');
          localStorage.removeItem('vh_token');
          localStorage.removeItem('vh_user');
          const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || window.location.pathname === '/kyc';
          if (isProtectedRoute && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;

        return new Promise((resolve, reject) => {
          axios
            .post(`${API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`}/auth/refresh`, { refreshToken })
            .then(({ data }) => {
              if (data && data.accessToken) {
                localStorage.setItem('vh_token', data.accessToken);
                if (data.refreshToken) {
                  localStorage.setItem('vh_refresh_token', data.refreshToken);
                }
                api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
                processQueue(null, data.accessToken);
                resolve(api(originalRequest));
              } else {
                throw new Error('No access token returned');
              }
            })
            .catch((err) => {
              processQueue(err, null);
              localStorage.removeItem('vh_token');
              localStorage.removeItem('vh_refresh_token');
              localStorage.removeItem('vh_user');
              const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || window.location.pathname === '/kyc';
              if (isProtectedRoute && window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
