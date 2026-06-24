import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useServicesStore } from '../store/servicesStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Key, Wallet as WalletIcon, Code,
  HelpCircle, BarChart3, Radio, Shield, LogOut, Terminal, Menu, AlertTriangle, Bell, User, Eye
} from 'lucide-react';
import api from '../lib/api';
const axios = api;
import { API_BASE_URL } from '../config/api';

const getPhotoSrc = (photoUrl) => {
  if (!photoUrl) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
  }
  const cleanUrl = String(photoUrl).trim();
  if (cleanUrl.startsWith('data:image')) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith('http')) {
    if (cleanUrl.includes('/uploads/')) {
      const parts = cleanUrl.split('/uploads/');
      const relativePath = '/uploads/' + parts[1];
      const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      return `${base}${relativePath}`;
    }
    return cleanUrl;
  }
  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
    const relativePath = cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl;
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${base}${relativePath}`;
  }
  return cleanUrl;
};

import {
  ClayButton, ClayInput, ClayModal,
  ClaySidebar, ClayBadge, ClayDropdown
} from '../components/Claymorphic';
import ErrorBoundary from '../components/ErrorBoundary';
import BrandLogo from '../components/BrandLogo';

// Skeleton screen loader for individual tabs
function TabSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6 w-full text-left" aria-hidden="true">
      <div className="h-8 bg-slate-200 rounded-full w-1/4 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="h-28 bg-slate-200 rounded-[24px]" />
        <div className="h-28 bg-slate-200 rounded-[24px]" />
        <div className="h-28 bg-slate-200 rounded-[24px]" />
        <div className="h-28 bg-slate-200 rounded-[24px]" />
      </div>
      <div className="h-64 bg-slate-200 rounded-[24px] w-full" />
    </div>
  );
}

// Lazy load the sub-tab components
const DashboardHome = lazy(() => import('../components/dashboard/DashboardHome'));
const VerificationPlayground = lazy(() => import('../components/dashboard/VerificationPlayground'));
const WalletBilling = lazy(() => import('../components/dashboard/WalletBilling'));
const ApiKeyManager = lazy(() => import('../components/dashboard/ApiKeyManager'));
const UsageAnalytics = lazy(() => import('../components/dashboard/UsageAnalytics'));
const WebhooksConfig = lazy(() => import('../components/dashboard/WebhooksConfig'));
const DeveloperDocs = lazy(() => import('../components/dashboard/DeveloperDocs'));
const SupportCenter = lazy(() => import('../components/dashboard/SupportCenter'));
const SuperAdminPanel = lazy(() => import('../components/dashboard/SuperAdminPanel'));
const UserProfilePage = lazy(() => import('./UserProfilePage'));
const AdminKycManagement = lazy(() => import('./AdminKycManagement'));
const AdminUserInspection = lazy(() => import('./AdminUserInspection'));
import Forbidden from './Forbidden';

export default function Dashboard() {
  const { user, logout, accessToken, updateKycState } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const roleKey = String(user?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const isAdmin = user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';

  // Helper to resolve activeTab from path
  const getTabFromPath = (pathname) => {
    if (pathname === '/admin/kyc') return 'admin-kyc';
    if (pathname.startsWith('/admin/users/')) return 'admin-user-inspect';
    const parts = pathname.split('/');
    const subRoute = parts[2]; // e.g. "apis", "wallet", etc.
    if (!subRoute) return 'dashboard';
    return subRoute;
  };

  // Sidebar Tab state
  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const currentTab = getTabFromPath(location.pathname);
    if (isAdmin && currentTab === 'profile') {
      navigate('/dashboard/admin', { replace: true });
      return;
    }
    setActiveTab(currentTab);
    setIsDrawerOpen(false);

    // Sync Page Titles & Meta Titles
    if (currentTab === 'admin') {
      document.title = 'User Management | Dizipay';
    } else if (currentTab === 'admin-kyc') {
      document.title = 'KYC Management | Dizipay';
    } else if (currentTab === 'admin-user-inspect') {
      document.title = 'Inspect User | Dizipay';
    } else if (currentTab === 'profile') {
      document.title = 'My Profile | Dizipay';
    } else {
      const capTab = currentTab === 'apis' ? 'APIs' : (currentTab.charAt(0).toUpperCase() + currentTab.slice(1));
      document.title = `${capTab} | Dizipay`;
    }
  }, [location.pathname, isAdmin, navigate]);

  // Hook into the central dashboard store
  const {
    balance,
    stats,
    transactions,
    invoices,
    apiKeys,
    webhooks,
    tickets,
    fetchDashboardData,
    fetchWalletData,
    fetchKeysData,
    fetchWebhooksData,
    fetchTicketsData,
    setApiKeys,
    setWebhooks,
    setTickets,
    setBalance,
    loading: storeLoading,
    errors: storeErrors
  } = useDashboardStore();

  const { fetchServices } = useServicesStore();

  // Modal forms states
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState('*');
  const [newKeyIp, setNewKeyIp] = useState('');

  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [activeWebhookId, setActiveWebhookId] = useState(null);

  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('API Integration');
  const [newTicketPriority, setNewTicketPriority] = useState('MEDIUM');

  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);

  const [verifyService, setVerifyService] = useState('PAN');
  const [playgroundInputs, setPlaygroundInputs] = useState({});
  const [playLoading, setPlayLoading] = useState(false);
  const [playResponse, setPlayResponse] = useState(null);
  const [servicesList, setServicesList] = useState([]);

  // Modals visibility state
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [kycHistory, setKycHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fullKycData, setFullKycData] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const notifDropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (notifsLoading) return;
    setNotifsLoading(true);
    try {
      const res = await axios.get('/api/v1/notifications');
      if (res.data.success) {
        const notifs = res.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotifsLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await axios.post('/api/v1/notifications/mark-all-read');
      if (res.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        showToast('All notifications marked as read');
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const res = await axios.post(`/api/v1/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isProfileModalOpen) {
      setLoadingHistory(true);
      axios.get('/api/v1/kyc/status')
        .then(res => {
          setFullKycData(res.data);
          setKycHistory(res.data.verificationHistory || []);
          updateKycState({
            kycStatus: res.data.kycStatus,
            kycLevel: res.data.kycLevel,
            aadhaarVerified: res.data.aadhaarVerified,
            aadhaarNumberMasked: res.data.aadhaarNumberMasked,
            aadhaarName: res.data.aadhaarName,
            aadhaarDob: res.data.aadhaarDob,
            aadhaarGender: res.data.aadhaarGender,
            aadhaarAddress: res.data.aadhaarAddress,
            aadhaarPhotoUrl: res.data.aadhaarPhotoUrl,
            kycApprovedAt: res.data.kycApprovedAt,
            phoneNumber: res.data.phoneNumber
          });
        })
        .catch(err => console.error('Failed to fetch profile kyc history:', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [isProfileModalOpen]);

  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Sync API default auth header and fetch initial minimal dashboard summary
  useEffect(() => {
    if (!accessToken) {
      navigate('/login');
    } else {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      const isApproved = user?.kycStatus === 'KYC_APPROVED' || user?.kycStatus === 'APPROVED' || isAdmin;
      if (isApproved && !storeLoading?.dashboard) {
        fetchDashboardData().catch(err => {
          console.error('Failed to load initial dashboard stats:', err);
        });
      }
      fetchNotifications();
    }
  }, [accessToken, user?.kycStatus, isAdmin]);

  // Route Guard to redirect non-KYC users away from restricted tabs
  useEffect(() => {
    if (user) {
      const isKycApproved = user.kycStatus === 'KYC_APPROVED' || user.kycStatus === 'APPROVED' || isAdmin;
      if (!isKycApproved) {
        const restrictedTabs = ['apis', 'wallet', 'keys', 'analytics', 'webhooks'];
        if (restrictedTabs.includes(activeTab)) {
          showToast('Complete KYC verification first');
          navigate('/dashboard');
        }
      }
    }
  }, [activeTab, user, navigate]);

  // Lazy load tab data only when the tab is accessed
  useEffect(() => {
    if (!accessToken) return;

    const lazyLoadData = async () => {
      try {
        const isApproved = user?.kycStatus === 'KYC_APPROVED' || user?.kycStatus === 'APPROVED' || isAdmin;
        if (activeTab === 'dashboard') {
          if (!isApproved) return;
          await Promise.all([
            fetchWalletData(),
            fetchKeysData()
          ]);
        } else if (activeTab === 'wallet') {
          if (!isApproved) return;
          await fetchWalletData();
        } else if (activeTab === 'keys') {
          if (!isApproved) return;
          await fetchKeysData();
        } else if (activeTab === 'apis') {
          if (!isApproved) return;
          const svcs = await fetchServices(isAdmin);
          setServicesList(svcs || []);
          await fetchKeysData();
        } else if (activeTab === 'webhooks') {
          if (!isApproved) return;
          await fetchWebhooksData();
        } else if (activeTab === 'support') {
          await fetchTicketsData();
        }
      } catch (err) {
        console.error(`Lazy load error for tab ${activeTab}:`, err);
      }
    };

    lazyLoadData();
  }, [activeTab, accessToken]);

  // Sync playground inputs when the target service changes
  useEffect(() => {
    setPlayResponse(null);
    if (servicesList.length > 0) {
      const activeService = servicesList.find(s => s.key === verifyService);
      if (activeService) {
        const initial = {};
        activeService.inputFields.forEach(f => {
          initial[f.name] = '';
        });
        setPlaygroundInputs(initial);
      }
    }
  }, [verifyService, servicesList]);

  // API Key management
  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const perms = newKeyPermissions === '*' ? ['*'] : [newKeyPermissions];
      const ipList = newKeyIp
        .split(',')
        .map(ip => ip.trim())
        .filter(Boolean);

      if (ipList.length === 0) {
        showToast('At least one IP address is required.');
        return;
      }

      const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      const ipv6Pattern = /^[0-9a-fA-F:]+$/;

      const invalidIps = ipList.filter(ip => {
        if (ipv4Pattern.test(ip)) {
          const parts = ip.split('.').map(Number);
          return parts.some(part => part < 0 || part > 255);
        }
        return !ipv6Pattern.test(ip) || ip.includes('*') || ip === '0.0.0.0/0';
      });

      if (invalidIps.length > 0) {
        showToast(`Invalid IP address format: ${invalidIps.join(', ')}`);
        return;
      }

      const res = await axios.post('/api/v1/api-keys', {
        name: newKeyName,
        permissions: perms,
        ipWhitelist: ipList
      });
      if (res.data.success) {
        setApiKeys([...apiKeys, res.data.key]);
        setNewKeyName('');
        setNewKeyIp('');
        setIsKeyModalOpen(false);
        showToast('API Key generated successfully!');
        fetchNotifications();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'Failed to generate key.');
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    try {
      const res = await axios.delete(`/api/v1/api-keys/${keyId}`);
      if (res.data.success) {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
        showToast('API Key revoked.');
      }
    } catch (err) {
      showToast('Failed to revoke API key.');
    }
  };

  // Webhook actions
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/v1/webhooks', { url: newWebhookUrl });
      if (res.data.success) {
        setWebhooks([...webhooks, res.data.webhook]);
        setNewWebhookUrl('');
        setIsWebhookModalOpen(false);
        showToast('Webhook registered successfully!');
        fetchNotifications();
      }
    } catch (err) {
      showToast('Failed to register webhook.');
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm('Delete Webhook target configuration?')) return;
    try {
      const res = await axios.delete(`/api/v1/webhooks/${webhookId}`);
      if (res.data.success) {
        setWebhooks(webhooks.filter(w => w.id !== webhookId));
        showToast('Webhook deleted.');
      }
    } catch (err) {
      showToast('Failed to delete webhook.');
    }
  };

  const handleFetchWebhookLogs = async (webhookId) => {
    try {
      setActiveWebhookId(webhookId);
      const res = await axios.get(`/api/v1/webhooks/${webhookId}/logs`);
      setWebhookLogs(res.data.logs);
    } catch (err) {
      showToast('Failed to fetch webhook execution logs.');
    }
  };

  // Support actions
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/v1/support', {
        subject: newTicketSubject,
        description: newTicketDesc,
        category: newTicketCategory,
        priority: newTicketPriority
      });
      if (res.data.success) {
        setTickets([res.data.ticket, ...tickets]);
        setNewTicketSubject('');
        setNewTicketDesc('');
        setIsTicketModalOpen(false);
        showToast('Support ticket created.');
        fetchNotifications();
      }
    } catch (err) {
      showToast('Failed to create ticket.');
    }
  };

  // Recharge action
  const handleRechargeWallet = async (e) => {
    e.preventDefault();
    showToast('Wallet recharge is temporarily unavailable');
  };

  // Interactive Playground trigger
  const handleVerifyPlayground = async (e) => {
    e.preventDefault();

    const serviceDef = servicesList.find(s => s.key === verifyService);
    if (!serviceDef) return;

    for (const field of serviceDef.inputFields) {
      const val = (playgroundInputs[field.name] || '').trim();
      if (field.required && !val) {
        showToast(`${field.label || field.name} is required`);
        return;
      }
    }

    setPlayLoading(true);
    setPlayResponse(null);

    const activeKey = apiKeys.find(k => k.status === 'ACTIVE');
    if (!activeKey && !isAdmin) {
      setPlayLoading(false);
      showToast('Please generate an active API key first before calling verifications.');
      return;
    }

    const requestKey = activeKey ? activeKey.key : 'admin_sandbox_bypass_key';

    try {
      let options = {
        headers: { 'x-api-key': requestKey }
      };

      let res;
      if (serviceDef.method === 'GET') {
        const queryParams = new URLSearchParams();
        queryParams.append('api_key', requestKey);
        serviceDef.inputFields.forEach(field => {
          queryParams.append(field.name, playgroundInputs[field.name] || '');
        });
        res = await axios.get(`${serviceDef.endpoint}?${queryParams.toString()}`, options);
      } else {
        const postBody = {};
        if (verifyService === 'PAN_TRACK') {
          postBody.api_key = requestKey;
        }
        serviceDef.inputFields.forEach(field => {
          postBody[field.name] = playgroundInputs[field.name] || '';
        });
        res = await axios.post(serviceDef.endpoint, postBody, options);
      }

      setPlayResponse(res.data);
      // Refresh balance
      const balRes = await axios.get('/api/v1/wallet');
      if (balRes.data.success) setBalance(balRes.data.balance);
      showToast('Verification query processed!');
    } catch (err) {
      setPlayResponse(err.response?.data || { error: { message: err.message || 'Verification transaction failed.' } });
      showToast('Verification failed.');
    } finally {
      setPlayLoading(false);
    }
  };

  const handleActivateService = async (serviceId) => {
    try {
      const res = await axios.post(`/api/v1/services/${serviceId}/activate`);
      if (res.data.success) {
        showToast('Service activated successfully!');
        setBalance(res.data.balance);
        fetchDashboardData();
        fetchNotifications();
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Activation failed.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  const COLORS = ['#7C5CFF', '#00D4FF', '#36FFA1', '#F59E0B', '#EF4444'];

  const isInitialDashboardLoading = storeLoading.dashboard && balance === 0;
  const initialDashboardError = storeErrors.dashboard;

  const isAdminTab = ['admin', 'admin-kyc', 'admin-user-inspect'].includes(activeTab);
  if (isAdminTab && !isAdmin) {
    return <Forbidden />;
  }

  return (
    <div className="min-h-[100dvh] lg:pl-64 pl-0 bg-background text-text selection:bg-primary selection:text-white font-sans antialiased overflow-x-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 px-6 py-3.5 bg-white border border-slate-200 shadow-xl rounded-full text-xs font-semibold text-slate-900 animate-bounce">
          ⚡ {toastMessage}
        </div>
      )}

      {/* Backdrop overlay for mobile drawer */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-35 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* CLAY SIDEBAR */}
      <ClaySidebar className={`p-5 transition-transform duration-300 ease-in-out z-40 lg:translate-x-0 lg:z-30 ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-6 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <BrandLogo isAdmin={isAdmin} />
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2 w-full">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'apis', label: 'Verification APIs', icon: Terminal },
              { id: 'wallet', label: 'Wallet Billing', icon: WalletIcon },
              { id: 'keys', label: 'API Keys Manager', icon: Key },
              { id: 'analytics', label: 'Usage Analytics', icon: BarChart3 },
              { id: 'webhooks', label: 'Webhooks Target', icon: Radio },
              { id: 'docs', label: 'Developer Docs', icon: Code },
              { id: 'support', label: 'Support Center', icon: HelpCircle }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id === 'dashboard' ? '/dashboard' : `/dashboard/${item.id}`)}
                  aria-label={`Open ${item.label} tab`}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold font-display transition-colors duration-200 ${
                    activeTab === item.id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-655 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Admin control panel link visible only to Super Admins / Admins */}
            {(isAdmin) && (
              <>
                <button
                  onClick={() => navigate('/dashboard/admin')}
                  aria-label="Open User Management controls"
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold font-display mt-4 border h-[44px] transition-colors duration-200 ${
                    activeTab === 'admin'
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-750'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <Shield className="w-4.5 h-4.5 shrink-0" aria-hidden="true" />
                  <span>User Management</span>
                </button>
                <button
                  onClick={() => navigate('/admin/kyc')}
                  aria-label="Open KYC Management controls"
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-full text-sm font-semibold font-display mt-2 border h-[44px] transition-colors duration-200 ${
                    activeTab === 'admin-kyc'
                      ? 'bg-violet-600 text-white border-violet-650'
                      : 'border-violet-250 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                >
                  <Shield className="w-4.5 h-4.5 shrink-0" aria-hidden="true" />
                  <span>KYC Management</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="w-full flex flex-col gap-2 border-t border-slate-100 pt-3 font-sans shrink-0">
          <div className="flex items-center justify-between w-full gap-1">
            {isAdmin ? (
              <div className="flex items-center gap-3 text-left p-1.5 rounded-2xl border border-transparent flex-1 min-w-0 animate-fade-in select-none">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold shrink-0">
                  {user?.email ? user.email[0].toUpperCase() : 'A'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold truncate text-slate-900">{user?.email}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{user?.role}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate('/dashboard/profile')}
                className="flex items-center gap-3 text-left hover:bg-slate-50 p-1.5 rounded-2xl transition-all duration-200 cursor-pointer outline-none border border-transparent hover:border-slate-200 flex-1 min-w-0 animate-fade-in"
                aria-label="View user profile and KYC history"
              >
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold shrink-0" aria-hidden="true">
                  {user?.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold truncate text-slate-900">{user?.email}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{user?.role}</span>
                </div>
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full shrink-0 border border-transparent active:scale-95 transition-all outline-none"
                title="Quick Profile View"
                aria-label="Open quick profile details modal"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            aria-label="Logout"
            className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-full text-xs font-bold font-display bg-red-600 border border-red-600 text-white shadow-sm hover:bg-red-700 transition-colors duration-200"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Logout
          </button>
        </div>
      </ClaySidebar>

      {/* DASHBOARD CONTENT BODY */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 min-h-[100dvh] w-full">
        {user && !(user.kycStatus === 'KYC_APPROVED' || user.kycStatus === 'APPROVED' || isAdmin) && (
          <div className="w-full p-5 bg-amber-50 border border-amber-200 rounded-[24px] flex flex-col md:flex-row justify-between items-center gap-4 text-left shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 font-display">⚠️ KYC Verification Required</h4>
                <p className="text-xs text-amber-700 font-sans mt-0.5">Complete PAN & Aadhaar verification to unlock Wallet, APIs, Marketplace and Verification Services.</p>
              </div>
            </div>
            <ClayButton variant="primary" onClick={() => navigate('/kyc')} className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white border-none py-2 px-5 text-xs font-bold shrink-0">
              Complete KYC
            </ClayButton>
          </div>
        )}

        {/* Header Widget */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 shadow-sm p-5 md:p-8 rounded-[24px] gap-4 w-full">
          <div className="text-left flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden p-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all active:scale-95 outline-none shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-4xl font-black font-display text-slate-900 capitalize truncate">
                {activeTab === 'admin' ? 'User Management' : (activeTab === 'apis' ? 'APIs Portal' : `${activeTab} Portal`)}
              </h2>
              <p className="text-slate-500 font-medium text-xs md:text-sm mt-0.5 leading-snug">
                {activeTab === 'admin' ? 'Manage global platform users, roles, wallets, and subscriptions.' : 'Manage settings, pricing models, and billing reports.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {/* Notifications Bell Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-750 transition-all outline-none"
                aria-label="Toggle notifications dropdown"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-clay bg-white border border-slate-200 shadow-clay-card-hover z-50 p-4 flex flex-col gap-3 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 font-display">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-violet-600 hover:text-violet-750 hover:underline uppercase tracking-wide"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <span className="text-xs text-slate-400 text-center py-6 block font-sans">No notifications yet.</span>
                    ) : (
                      <>
                        {/* Group KYC Notifications */}
                        {(() => {
                          const kycNotifs = notifications.filter(n => n.title.includes('KYC') || n.title.includes('PAN') || n.title.includes('Aadhaar'));
                          const generalNotifs = notifications.filter(n => !(n.title.includes('KYC') || n.title.includes('PAN') || n.title.includes('Aadhaar')));

                          return (
                            <div className="flex flex-col gap-4 text-xs">
                              {kycNotifs.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  <span className="text-[10px] font-bold text-violet-650 uppercase tracking-wider">KYC Verification Alerts</span>
                                  {kycNotifs.map(n => (
                                    <div
                                      key={n.id}
                                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                                      className={`p-3 border rounded-2xl transition-all cursor-pointer text-left relative flex flex-col gap-1 ${
                                        n.isRead ? 'bg-slate-50/50 border-slate-150' : 'bg-violet-50/20 border-violet-100/50 hover:bg-violet-50/40'
                                      }`}
                                    >
                                      {!n.isRead && (
                                        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                                      )}
                                      <div className="flex justify-between items-start pr-4">
                                        <strong className="text-[11px] text-slate-800 font-display">{n.title}</strong>
                                      </div>
                                      <p className="text-[10px] text-slate-600 leading-relaxed font-sans">{n.message}</p>
                                      <span className="text-[9px] text-slate-450 font-mono mt-1">{new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {generalNotifs.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Platform Updates</span>
                                  {generalNotifs.map(n => (
                                    <div
                                      key={n.id}
                                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                                      className={`p-3 border rounded-2xl transition-all cursor-pointer text-left relative flex flex-col gap-1 ${
                                        n.isRead ? 'bg-slate-50/50 border-slate-150' : 'bg-violet-50/20 border-violet-100/50 hover:bg-violet-50/40'
                                      }`}
                                    >
                                      {!n.isRead && (
                                        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                                      )}
                                      <div className="flex justify-between items-start pr-4">
                                        <strong className="text-[11px] text-slate-800 font-display">{n.title}</strong>
                                      </div>
                                      <p className="text-[10px] text-slate-650 leading-relaxed font-sans">{n.message}</p>
                                      <span className="text-[9px] text-slate-450 font-mono mt-1">{new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#0F172A] px-5 py-2.5 md:px-6 md:py-3 rounded-2xl md:rounded-full border border-slate-800 shadow-sm text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end gap-2 sm:gap-0">
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Wallet Balance</span>
              <span className="text-base md:text-lg font-bold font-display text-emerald-400">₹{parseFloat(balance).toFixed(2)}</span>
            </div>
          </div>
        </header>

        {/* TABS RESOLVER CONTAINER WITH SUSPENSE & COMPACT ERROR BOUNDARY */}
        <ErrorBoundary compact onRetry={fetchDashboardData}>
          <Suspense fallback={<TabSkeleton />}>
            {isInitialDashboardLoading ? (
              <TabSkeleton />
            ) : initialDashboardError ? (
              <div className="p-8 text-center border border-red-500/20 bg-red-500/5 rounded-clay flex flex-col items-center gap-4 text-left">
                <span className="text-red-400 font-bold font-display">Failed to load dashboard data</span>
                <p className="text-xs text-muted max-w-sm">{initialDashboardError}</p>
                <ClayButton variant="primary" className="py-2.5 px-6 text-xs font-semibold" onClick={() => fetchDashboardData(true)}>
                  Retry Loading
                </ClayButton>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <ErrorBoundary compact>
                    <DashboardHome
                      balance={balance}
                      stats={stats}
                      apiKeys={apiKeys}
                      transactions={transactions}
                      user={user}
                      setActiveTab={(tab) => navigate(tab === 'dashboard' ? '/dashboard' : `/dashboard/${tab}`)}
                    />
                  </ErrorBoundary>
                )}
                {activeTab === 'apis' && (
                  <ErrorBoundary compact>
                    <VerificationPlayground
                      user={user}
                      servicesList={servicesList}
                      verifyService={verifyService}
                      setVerifyService={setVerifyService}
                      playgroundInputs={playgroundInputs}
                      setPlaygroundInputs={setPlaygroundInputs}
                      playLoading={playLoading}
                      playResponse={playResponse}
                      handleVerifyPlayground={handleVerifyPlayground}
                      handleActivateService={handleActivateService}
                    />
                  </ErrorBoundary>
                )}
                {activeTab === 'wallet' && (
                  <ErrorBoundary compact>
                    <WalletBilling
                      rechargeAmount={rechargeAmount}
                      setRechargeAmount={setRechargeAmount}
                      handleRechargeWallet={handleRechargeWallet}
                      invoices={invoices}
                      copyToClipboard={copyToClipboard}
                    />
                  </ErrorBoundary>
                )}
                {activeTab === 'keys' && (
                  <ErrorBoundary compact>
                    <ApiKeyManager
                      apiKeys={apiKeys}
                      handleRevokeKey={handleRevokeKey}
                      setIsKeyModalOpen={setIsKeyModalOpen}
                      copyToClipboard={copyToClipboard}
                    />
                  </ErrorBoundary>
                )}
                {activeTab === 'analytics' && (
                  <ErrorBoundary compact>
                    <UsageAnalytics COLORS={COLORS} />
                  </ErrorBoundary>
                )}
                {activeTab === 'webhooks' && (
                  <ErrorBoundary compact>
                    <WebhooksConfig
                      webhooks={webhooks}
                      newWebhookUrl={newWebhookUrl}
                      setNewWebhookUrl={setNewWebhookUrl}
                      handleCreateWebhook={handleCreateWebhook}
                      handleDeleteWebhook={handleDeleteWebhook}
                      handleFetchWebhookLogs={handleFetchWebhookLogs}
                      activeWebhookId={activeWebhookId}
                      webhookLogs={webhookLogs}
                    />
                  </ErrorBoundary>
                )}
                {activeTab === 'docs' && (
                  <ErrorBoundary compact>
                    <DeveloperDocs />
                  </ErrorBoundary>
                )}
                {activeTab === 'support' && (
                  <ErrorBoundary compact>
                    <SupportCenter
                      tickets={tickets}
                      newTicketSubject={newTicketSubject}
                      setNewTicketSubject={setNewTicketSubject}
                      newTicketDesc={newTicketDesc}
                      setNewTicketDesc={setNewTicketDesc}
                      newTicketCategory={newTicketCategory}
                      setNewTicketCategory={setNewTicketCategory}
                      newTicketPriority={newTicketPriority}
                      setNewTicketPriority={setNewTicketPriority}
                      handleCreateTicket={handleCreateTicket}
                      setIsTicketModalOpen={setIsTicketModalOpen}
                    />
                  </ErrorBoundary>
                )}
                {activeTab === 'admin' && (
                  <ErrorBoundary compact>
                    <SuperAdminPanel />
                  </ErrorBoundary>
                )}
                {activeTab === 'profile' && !isAdmin && (
                  <ErrorBoundary compact>
                    <UserProfilePage />
                  </ErrorBoundary>
                )}
                {activeTab === 'admin-kyc' && (
                  <ErrorBoundary compact>
                    <AdminKycManagement />
                  </ErrorBoundary>
                )}
                {activeTab === 'admin-user-inspect' && (
                  <ErrorBoundary compact>
                    <AdminUserInspection />
                  </ErrorBoundary>
                )}
              </>
            )}
          </Suspense>
        </ErrorBoundary>

      </main>

      {/* CLAY MODAL 1: CREATE API KEY */}
      <ClayModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} title="Generate API Key Credentials">
        <form onSubmit={handleCreateKey} className="flex flex-col gap-4 text-left">
          <ClayInput
            label="API Key Friendly Name"
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Production server Key"
            required
          />
          <ClayDropdown
            label="Rate Limit Options"
            options={[
              { label: '60 requests / minute', value: '60' },
              { label: '120 requests / minute', value: '120' },
              { label: '300 requests / minute', value: '300' }
            ]}
            selected={'60'}
            onChange={() => {}}
          />
          <ClayDropdown
            label="Key Permission Scope"
            options={[
              { label: 'Full Access (*)', value: '*' },
              { label: 'PAN Verification only', value: 'pan:verify' },
              { label: 'GSTIN Verification only', value: 'gst:verify' }
            ]}
            selected={newKeyPermissions}
            onChange={setNewKeyPermissions}
          />
          <div className="w-full flex flex-col">
            <ClayInput
              label="IP Address Whitelist (Required)"
              type="text"
              value={newKeyIp}
              onChange={(e) => setNewKeyIp(e.target.value)}
              placeholder="127.0.0.1, 192.168.1.10"
              required
            />
            <p className="text-[10px] text-slate-500 font-semibold -mt-2.5 ml-2 mb-4 leading-relaxed">
              Enter one or more IPv4/IPv6 addresses separated by commas.<br />
              Only these addresses can use this API key.
            </p>
          </div>
          <ClayButton type="submit" variant="primary" className="w-full mt-4">
            Construct API Key
          </ClayButton>
        </form>
      </ClayModal>

      {/* CLAY MODAL 2: REGISTER WEBHOOK */}
      <ClayModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} title="Register Webhook Endpoint">
        <form onSubmit={handleCreateWebhook} className="flex flex-col gap-4 text-left">
          <ClayInput
            label="Postback Target URL"
            type="url"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
            placeholder="https://myserver.com/webhooks/dizipay"
            required
          />
          <ClayButton type="submit" variant="primary" className="w-full mt-4">
            Register Webhook URL
          </ClayButton>
        </form>
      </ClayModal>

      {/* CLAY MODAL 3: SUBMIT SUPPORT TICKET */}
      <ClayModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} title="Submit Support Request">
        <form onSubmit={handleCreateTicket} className="flex flex-col gap-4 text-left">
          <ClayInput
            label="Ticket Subject"
            type="text"
            value={newTicketSubject}
            onChange={(e) => setNewTicketSubject(e.target.value)}
            placeholder="Describe the issue briefly"
            required
          />
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-2 font-display ml-1">Details description</label>
            <textarea
              className="w-full bg-white text-slate-900 rounded-[16px] p-4 border border-slate-300 shadow-sm outline-none text-xs focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
              rows="4"
              value={newTicketDesc}
              onChange={(e) => setNewTicketDesc(e.target.value)}
              placeholder="Include requestIds or error codes..."
              required
            />
          </div>
          <ClayButton type="submit" variant="primary" className="w-full mt-4">
            Submit Support Request
          </ClayButton>
        </form>
      </ClayModal>

      {/* PAYMENT RECHARGE SUCCESS MODAL */}
      <ClayModal isOpen={paymentSuccessModal} onClose={() => setPaymentSuccessModal(false)} title="Payment Recharge Confirmed">
        <div className="text-center flex flex-col items-center gap-4 py-4 font-sans">
          <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent text-3xl animate-bounce">
            ✓
          </div>
          <h4 className="text-lg font-bold font-display text-slate-900">Deposit Successful!</h4>
          <p className="text-xs text-slate-650 leading-relaxed">
            Your wallet balance has been topped up. You can view the credit transaction invoice in the billing ledger.
          </p>
          <ClayButton variant="primary" onClick={() => setPaymentSuccessModal(false)} className="px-8 mt-2">
            Awesome
          </ClayButton>
        </div>
      </ClayModal>

      {/* CLAY MODAL: USER PROFILE & KYC HISTORY */}
      <ClayModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="My User Profile Details">
        <div className="flex flex-col gap-6 text-left font-sans">
          {/* Profile Data Info */}
          <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="w-24 h-28 shrink-0 relative">
              <img 
                src={getPhotoSrc(fullKycData?.aadhaarPhotoUrl || user?.aadhaarPhotoUrl)} 
                alt="Aadhaar Avatar" 
                className="w-24 h-28 object-cover rounded-xl border border-slate-350 shadow-sm"
                style={{ display: (fullKycData?.aadhaarPhotoUrl || user?.aadhaarPhotoUrl) ? 'block' : 'none' }}
                onError={(e) => { 
                  e.target.style.display = 'none'; 
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div 
                className="w-24 h-28 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600 font-bold text-xl uppercase"
                style={{ display: (fullKycData?.aadhaarPhotoUrl || user?.aadhaarPhotoUrl) ? 'none' : 'flex' }}
              >
                {(fullKycData?.aadhaarName || user?.aadhaarName || user?.name || 'US').slice(0, 2)}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs w-full">
              <div>
                <span className="text-slate-500 font-medium block">Full Name</span>
                <strong className="text-slate-900 text-sm">{user?.name || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Role Permissions</span>
                <strong className="text-slate-900 text-sm">{user?.role || 'Client User'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Email Address</span>
                <strong className="text-slate-900 font-mono">{user?.email || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Phone Number</span>
                <strong className="text-slate-900 font-mono">{user?.phone || '—'}</strong>
              </div>
              <div className="sm:col-span-2 h-px bg-slate-200 my-1" />
              <div>
                <span className="text-slate-500 font-medium block">KYC Status</span>
                <ClayBadge status={fullKycData?.kycStatus || user?.kycStatus || 'PENDING_KYC'}>
                  {fullKycData?.kycStatus || user?.kycStatus || 'PENDING_KYC'}
                </ClayBadge>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Aadhaar Name</span>
                <strong className="text-slate-900">{fullKycData?.aadhaarName || user?.aadhaarName || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Date of Birth</span>
                <strong className="text-slate-900 font-mono">{fullKycData?.aadhaarDob || user?.aadhaarDob || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Gender</span>
                <strong className="text-slate-900">{fullKycData?.aadhaarGender || user?.aadhaarGender || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Masked Aadhaar</span>
                <strong className="text-slate-900 font-mono">{fullKycData?.aadhaarNumberMasked || user?.aadhaarNumberMasked || 'Not Linked'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Approval Date</span>
                <strong className="text-slate-900 font-sans">
                  {(fullKycData?.kycApprovedAt || user?.kycApprovedAt) 
                    ? new Date(fullKycData?.kycApprovedAt || user?.kycApprovedAt).toLocaleDateString() 
                    : '—'}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 font-medium block">Aadhaar Address</span>
                <p className="text-slate-755 leading-relaxed mt-0.5">{fullKycData?.aadhaarAddress || user?.aadhaarAddress || '—'}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 -mb-2 border-t border-slate-100 pt-3">
            <ClayButton
              variant="primary"
              onClick={() => {
                setIsProfileModalOpen(false);
                navigate('/dashboard/profile');
              }}
              className="text-xs px-4 py-2 flex items-center gap-1.5 h-[34px]"
            >
              <User className="w-3.5 h-3.5" /> View Full Profile
            </ClayButton>
          </div>

          {/* KYC History Logs */}
          <div className="flex flex-col gap-4">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display mb-1">KYC History Log Timeline</h5>
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Loading history...</div>
            ) : kycHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl">
                No KYC verification history logs found.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-200 ml-3 flex flex-col gap-6 font-sans">
                {kycHistory.map((h) => (
                  <div key={h.id} className="relative group text-left">
                    {/* Node Bullet Dot */}
                    <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-slate-300 ring-4 ring-slate-100 group-hover:bg-violet-500 group-hover:ring-violet-100 transition-all duration-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    {/* Node Info */}
                    <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-4 rounded-2xl transition-all duration-300 shadow-sm flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString()}
                        </span>
                        <ClayBadge status={h.status}>{h.status}</ClayBadge>
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-1 font-display">
                        {h.status === 'PAN_VERIFIED' ? 'PAN Card Verification' : 
                         (h.status === 'AADHAAR_OTP_SENT' ? 'Aadhaar OTP Dispatched' : 
                          (h.status === 'KYC_APPROVED' ? 'KYC Verification Approved' : 
                           (h.status === 'KYC_REJECTED' ? 'KYC Verification Rejected' : h.status)))}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {h.remarks || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ClayModal>


    </div>
  );
}
