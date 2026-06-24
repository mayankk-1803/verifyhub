import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ClayCard, ClayButton, ClayInput, ClayDropdown, ClayBadge, ClayTabs, ClayModal } from '../Claymorphic';
import { Shield, Users, ArrowLeftRight, CreditCard, Activity, Key, Unlock, RefreshCw, KeyRound, Plus, Minus, Trash2, Eye, UserCheck, UserX, Calendar, Search, Settings, Wrench, Coins, ListCollapse, Database, Phone } from 'lucide-react';
import VirtualList from '../VirtualList';
import { useServicesStore } from '../../store/servicesStore';

export default function SuperAdminPanel() {
    const navigate = useNavigate();
    const [activeSubTab, setActiveSubTab] = useState('users');
    // Tabs: 'users', 'wallet', 'services', 'subscriptions', 'pricing', 'api-keys', 'audit-logs', 'tickets', 'settings'

    // Search & Pagination state for Users
    const [userSearch, setUserSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [sortBy, setSortBy] = useState('newest');

    // Modals for wallet adjustments & password reset
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showDebitModal, setShowDebitModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);

    const [creditForm, setCreditForm] = useState({ userId: '', userName: '', amount: '', reason: '' });
    const [debitForm, setDebitForm] = useState({ userId: '', userName: '', amount: '', reason: '' });
    const [resetPassForm, setResetPassForm] = useState({ userId: '', userName: '', password: '' });
    const [phoneForm, setPhoneForm] = useState({ userId: '', userName: '', currentPhone: '', phone: '' });
    const [actionLoading, setActionLoading] = useState({});

    const isPlaceholderEmail = (user) => {
        const email = String(user?.email || '').trim().toLowerCase();
        const phone = String(user?.phone || '').replace(/\D/g, '');
        return Boolean(phone && email === `${phone}@dizipay.in`);
    };

    const getDisplayEmail = (user) => isPlaceholderEmail(user) ? 'Phone Only Account' : (user?.email || 'No Email');
    const getUserLabel = (user) => user?.name || (isPlaceholderEmail(user) ? user?.phone : user?.email) || user?.phone || 'User';
    const getSafeActionMessage = (err, fallback = 'Unable to complete this action.') => err?.response?.data?.message || fallback;
    const isActionBusy = (key) => Boolean(actionLoading[key]);
    const beginAction = (key) => {
        if (actionLoading[key]) return false;
        setActionLoading(prev => ({ ...prev, [key]: true }));
        return true;
    };
    const endAction = (key) => setActionLoading(prev => ({ ...prev, [key]: false }));

    // Search & Pagination state for Subscriptions
    const [subSearch, setSubSearch] = useState('');
    const [subPage, setSubPage] = useState(1);
    const [subLimit] = useState(10);

    // Selected user for Detail Drawer
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [extendDays, setExtendDays] = useState('30');
    const [availableServices, setAvailableServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);

    // Dynamic services management
    const [adminServices, setAdminServices] = useState([]);
    const [editingAdminService, setEditingAdminService] = useState(null);
    const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', activationFee: '49' });

    // Admin Data states
    const [adminUsers, setAdminUsers] = useState([]);
    const [adminSubscriptions, setAdminSubscriptions] = useState([]);
    const [adminRoutes, setAdminRoutes] = useState([]);
    const [adminProviders, setAdminProviders] = useState([]);
    const [adminPricingRules, setAdminPricingRules] = useState([]);
    const [adminAuditLogs, setAdminAuditLogs] = useState([]);
    const [adminTickets, setAdminTickets] = useState([]);
    const [verificationLogs, setVerificationLogs] = useState([]);
    const [adminApiKeys, setAdminApiKeys] = useState([]);
    const [adminSettings, setAdminSettings] = useState([]);

    // Create User Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'Client User'
    });

    // Delete Confirmation state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [userToDelete, setUserToDelete] = useState(null);

    // Adjustments states
    const [adminAdjustUserId, setAdminAdjustUserId] = useState('');
    const [adminAdjustAmount, setAdminAdjustAmount] = useState('');
    const [adminAdjustType, setAdminAdjustType] = useState('CREDIT');
    const [adminAdjustDesc, setAdminAdjustDesc] = useState('');

    // Password reset inline state
    const [newPassword, setNewPassword] = useState('');

    // Edit Setting State
    const [editingSetting, setEditingSetting] = useState(null);
    const [settingValue, setSettingValue] = useState('');
    const [settingDesc, setSettingDesc] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setUserSearch(searchInput);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchInput]);

    // Loading states
    const [tabLoading, setTabLoading] = useState(false);
    const [tabError, setTabError] = useState(null);

    const fetchUsers = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const res = await api.get(`/api/v1/admin/users?page=${currentPage}&limit=${pageSize}&search=${userSearch}&sortBy=${sortBy}`);
            setAdminUsers(res.data.users || []);
            setTotalUsers(res.data.total || 0);
            setTotalPages(Math.ceil((res.data.total || 0) / pageSize));
        } catch (err) {
            console.error(err);
            setTabError('Failed to load users catalog.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchSubscriptions = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const res = await api.get('/api/v1/admin/subscriptions');
            setAdminSubscriptions(res.data.subscriptions || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load subscriptions.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchRoutingAndPricing = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const routeRes = await api.get('/api/v1/admin/routing');
            setAdminRoutes(routeRes.data.routes || []);
            setAdminProviders(routeRes.data.providers || []);

            const cachedPricingRules = await useServicesStore.getState().fetchPricingRules();
            setAdminPricingRules(cachedPricingRules || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load routing/pricing rules.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchWalletAndTickets = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const usersRes = await api.get('/api/v1/admin/users?limit=1000');
            setAdminUsers(usersRes.data.users || []);

            const ticketRes = await api.get('/api/v1/admin/tickets');
            setAdminTickets(ticketRes.data.tickets || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load ticket & wallet adjust records.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchAuditsAndLogs = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const auditRes = await api.get('/api/v1/admin/audit');
            setAdminAuditLogs(auditRes.data.logs || []);

            const logRes = await api.get('/api/v1/admin/requests');
            setVerificationLogs(logRes.data.requests || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load audit logging records.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchApiKeys = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const res = await api.get('/api/v1/admin/api-keys');
            setAdminApiKeys(res.data.apiKeys || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load API keys directory.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchSettings = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const res = await api.get('/api/v1/admin/settings');
            setAdminSettings(res.data.settings || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load global system settings.');
        } finally {
            setTabLoading(false);
        }
    };

    const fetchAllServices = async () => {
        try {
            const res = await api.get('/api/v1/services');
            if (res.data && res.data.success) {
                setAvailableServices(res.data.services || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAdminServices = async () => {
        if (tabLoading) return;
        setTabLoading(true);
        setTabError(null);
        try {
            const res = await api.get('/api/v1/admin/services');
            setAdminServices(res.data.services || []);
        } catch (err) {
            console.error(err);
            setTabError('Failed to load services directory.');
        } finally {
            setTabLoading(false);
        }
    };

    useEffect(() => {
        fetchAllServices();
    }, []);

    useEffect(() => {
        if (activeSubTab === 'users') {
            fetchUsers();
        } else if (activeSubTab === 'subscriptions') {
            fetchSubscriptions();
        } else if (activeSubTab === 'routing' || activeSubTab === 'pricing') {
            fetchRoutingAndPricing();
        } else if (activeSubTab === 'services') {
            fetchAdminServices();
        } else if (activeSubTab === 'wallet' || activeSubTab === 'tickets') {
            fetchWalletAndTickets();
        } else if (activeSubTab === 'audit-logs') {
            fetchAuditsAndLogs();
        } else if (activeSubTab === 'api-keys') {
            fetchApiKeys();
        } else if (activeSubTab === 'settings') {
            fetchSettings();
        }
    }, [activeSubTab, currentPage, userSearch, sortBy, pageSize]);

    const refreshCurrentTab = () => {
        if (activeSubTab === 'users') fetchUsers();
        else if (activeSubTab === 'subscriptions') fetchSubscriptions();
        else if (activeSubTab === 'services') fetchAdminServices();
        else if (activeSubTab === 'pricing') fetchRoutingAndPricing();
        else if (activeSubTab === 'routing') fetchRoutingAndPricing();
        else if (activeSubTab === 'wallet') fetchWalletAndTickets();
        else if (activeSubTab === 'tickets') fetchWalletAndTickets();
        else if (activeSubTab === 'audit-logs') fetchAuditsAndLogs();
        else if (activeSubTab === 'api-keys') fetchApiKeys();
        else if (activeSubTab === 'settings') fetchSettings();
    };

    const handleExportCsv = async () => {
        try {
            const res = await api.get(`/api/v1/admin/users?limit=10000&search=${userSearch}&sortBy=${sortBy}`);
            const usersToExport = res.data.users || [];
            
            const headers = [
                'User ID',
                'Name',
                'Email',
                'Phone',
                'PAN Number',
                'Masked Aadhaar',
                'KYC Status',
                'PAN Verified',
                'Aadhaar Verified',
                'Created Date',
                'Approved Date',
                'Rejected Date',
                'Remarks'
            ];

            const rows = usersToExport.map(u => [
                u.id,
                `"${(u.name || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.phone || '').replace(/"/g, '""')}"`,
                `"${(u.panNumber || '').replace(/"/g, '""')}"`,
                `"${(u.aadhaarNumberMasked || '').replace(/"/g, '""')}"`,
                `"${(u.kycStatus || '').replace(/"/g, '""')}"`,
                u.panVerified ? 'true' : 'false',
                u.aadhaarVerified ? 'true' : 'false',
                u.createdAt ? new Date(u.createdAt).toISOString() : '',
                u.kycApprovedAt ? new Date(u.kycApprovedAt).toISOString() : '',
                u.kycRejectedAt ? new Date(u.kycRejectedAt).toISOString() : '',
                `"${(u.kycRemarks || '').replace(/"/g, '""')}"`
            ]);

            const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `kyc_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Failed to export CSV:', err);
            alert('Failed to export CSV: ' + (err.response?.data?.error || err.message));
        }
    };

    const openUserDrawer = async (user) => {
        const key = `view-${user.id}`;
        if (!beginAction(key)) return;
        try {
            const res = await api.get(`/api/v1/admin/users/${user.id}`);
            if (res.data.success) {
                setSelectedUser(res.data.user);
                setIsDrawerOpen(true);
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to load user details.'));
        } finally {
            endAction(key);
        }
    };

    const handleCreateUserSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/v1/admin/users', createUserForm);
            if (res.data.success) {
                alert('User created successfully.');
                setShowCreateModal(false);
                setCreateUserForm({ name: '', email: '', phone: '', password: '', role: 'Client User' });
                fetchUsers();
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create user.');
        }
    };

    const triggerDeletePrompt = (user) => {
        setUserToDelete(user);
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const openPhoneModal = (user) => {
        setPhoneForm({
            userId: user.id,
            userName: getUserLabel(user),
            currentPhone: user.phone || '',
            phone: user.phone || ''
        });
        setShowPhoneModal(true);
    };

    const handleDeleteUserSubmit = async () => {
        if (deleteConfirmText !== 'DELETE USER') {
            alert('Please type "DELETE USER" exactly to confirm deletion.');
            return;
        }
        if (!userToDelete || !beginAction('delete-user')) return;
        try {
            const res = await api.delete(`/api/v1/admin/users/${userToDelete.id}`, {
                data: { confirmation: deleteConfirmText }
            });
            if (res.data.success) {
                alert('User deleted successfully.');
                setShowDeleteModal(false);
                setUserToDelete(null);
                setDeleteConfirmText('');
                if (selectedUser && selectedUser.id === userToDelete.id) {
                    setIsDrawerOpen(false);
                    setSelectedUser(null);
                }
                fetchUsers();
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to delete user because related records exist.'));
        } finally {
            endAction('delete-user');
        }
    };

    const handleStatusChange = async (userId, newStatus) => {
        const key = `status-${userId}`;
        if (!beginAction(key)) return;
        try {
            const res = await api.put(`/api/v1/admin/users/${userId}/status`, { status: newStatus });
            if (res.data.success) {
                alert('User status updated successfully.');
                if (selectedUser && selectedUser.id === userId) {
                    setSelectedUser({ ...selectedUser, status: newStatus });
                }
                refreshCurrentTab();
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to update user status.'));
        } finally {
            endAction(key);
        }
    };

    const handlePasswordResetSubmit = async (e) => {
        e.preventDefault();
        if (!newPassword) return;
        try {
            const res = await api.post(`/api/v1/admin/users/${selectedUser.id}/reset-password`, { password: newPassword });
            if (res.data.success) {
                alert('Password updated successfully.');
                setNewPassword('');
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update password.');
        }
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        const cleanPhone = String(phoneForm.phone || '').replace(/\D/g, '');
        if (!/^\d{10}$/.test(cleanPhone)) {
            alert('Invalid phone number');
            return;
        }
        if (!beginAction('update-phone')) return;
        try {
            const res = await api.patch(`/api/v1/admin/users/${phoneForm.userId}/phone`, { phone: cleanPhone });
            if (res.data.success) {
                alert(res.data.message || 'Phone number updated successfully');
                setShowPhoneModal(false);
                setPhoneForm({ userId: '', userName: '', currentPhone: '', phone: '' });
                if (selectedUser && selectedUser.id === phoneForm.userId) {
                    setSelectedUser({ ...selectedUser, phone: cleanPhone, phoneNumber: cleanPhone, phoneVerified: true });
                }
                fetchUsers();
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to update phone number.'));
        } finally {
            endAction('update-phone');
        }
    };

    const handleOtpReset = async (userId) => {
        const key = `otp-${userId}`;
        if (!beginAction(key)) return;
        try {
            const res = await api.post(`/api/v1/admin/users/${userId}/reset-otp`);
            if (res.data.success) {
                alert('User OTP lockouts and limits cleared.');
                refreshCurrentTab();
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to reset user OTP.'));
        } finally {
            endAction(key);
        }
    };

    const handleToggleService = async (userId, serviceId, isCurrentlyActive) => {
        try {
            const endpoint = isCurrentlyActive
                ? `/api/v1/admin/users/${userId}/services/${serviceId}/deactivate`
                : `/api/v1/admin/users/${userId}/services/${serviceId}/activate`;

            const res = await api.post(endpoint);
            if (res.data.success) {
                alert(isCurrentlyActive ? 'Service deactivated.' : 'Service activated.');
                refreshCurrentTab();
                if (selectedUser && selectedUser.id === userId) {
                    const updatedSubs = isCurrentlyActive
                        ? selectedUser.subscriptions.map(sub => sub.serviceId === serviceId ? { ...sub, status: 'INACTIVE' } : sub)
                        : [...(selectedUser.subscriptions || []), { serviceId, status: 'ACTIVE', activatedAt: new Date() }];
                    setSelectedUser({ ...selectedUser, subscriptions: updatedSubs });
                }
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update service subscription.');
        }
    };

    const handleExtendService = async (userId, serviceId, daysVal) => {
        try {
            const res = await api.post(`/api/v1/admin/users/${userId}/services/${serviceId}/extend`, { days: daysVal });
            if (res.data.success) {
                alert(`Subscription extended by ${daysVal} days.`);
                refreshCurrentTab();
                if (selectedUser && selectedUser.id === userId) {
                    const updatedSubs = selectedUser.subscriptions.map(sub =>
                        sub.serviceId === serviceId ? { ...sub, expiresAt: res.data.subscription.expiresAt } : sub
                    );
                    setSelectedUser({ ...selectedUser, subscriptions: updatedSubs });
                }
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to extend subscription.');
        }
    };

    const handleUpdateProviderRoute = async (routeId, fields) => {
        try {
            const res = await api.put(`/api/v1/admin/routing/${routeId}`, fields);
            if (res.data.success) {
                alert('Provider routing updated!');
                fetchRoutingAndPricing();
            }
        } catch (err) {
            alert('Failed to edit provider route.');
        }
    };

    const handleUpdatePricingRule = async (ruleId, fields) => {
        try {
            const res = await api.put(`/api/v1/admin/pricing/${ruleId}`, fields);
            if (res.data.success) {
                alert('Pricing margin adjusted!');
                fetchRoutingAndPricing();
            }
        } catch (err) {
            alert('Failed to edit pricing rule.');
        }
    };

    const handleAdminWalletAdjustSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/v1/admin/wallet/adjust', {
                userId: adminAdjustUserId,
                amount: adminAdjustAmount,
                type: adminAdjustType,
                description: adminAdjustDesc
            });
            if (res.data.success) {
                alert(`Wallet successfully adjusted! New balance: ₹${parseFloat(res.data.balance).toFixed(2)}`);
                setAdminAdjustUserId('');
                setAdminAdjustAmount('');
                setAdminAdjustDesc('');
                refreshCurrentTab();
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Adjustment failed.');
        }
    };

    const handleCreditSubmit = async (e) => {
        e.preventDefault();
        if (!beginAction('credit-wallet')) return;
        try {
            const res = await api.post('/api/v1/admin/wallet/adjust', {
                userId: creditForm.userId,
                amount: creditForm.amount,
                type: 'CREDIT',
                description: creditForm.reason || 'Manual admin credit adjustment'
            });
            if (res.data.success) {
                alert(`Wallet successfully credited! New balance: ₹${parseFloat(res.data.balance).toFixed(2)}`);
                setShowCreditModal(false);
                setCreditForm({ userId: '', userName: '', amount: '', reason: '' });
                refreshCurrentTab();
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to credit wallet.'));
        } finally {
            endAction('credit-wallet');
        }
    };

    const handleDebitSubmit = async (e) => {
        e.preventDefault();
        if (!beginAction('debit-wallet')) return;
        try {
            const res = await api.post('/api/v1/admin/wallet/adjust', {
                userId: debitForm.userId,
                amount: debitForm.amount,
                type: 'DEBIT',
                description: debitForm.reason || 'Manual admin debit adjustment'
            });
            if (res.data.success) {
                alert(`Wallet successfully debited! New balance: ₹${parseFloat(res.data.balance).toFixed(2)}`);
                setShowDebitModal(false);
                setDebitForm({ userId: '', userName: '', amount: '', reason: '' });
                refreshCurrentTab();
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to debit wallet.'));
        } finally {
            endAction('debit-wallet');
        }
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!beginAction('reset-password')) return;
        try {
            const res = await api.post(`/api/v1/admin/users/${resetPassForm.userId}/reset-password`, {
                password: resetPassForm.password
            });
            if (res.data.success) {
                alert('Password reset successfully.');
                setShowResetPasswordModal(false);
                setResetPassForm({ userId: '', userName: '', password: '' });
            }
        } catch (err) {
            alert(getSafeActionMessage(err, 'Unable to reset password.'));
        } finally {
            endAction('reset-password');
        }
    };

    const handleTicketStatusChange = async (ticketId, newStatus) => {
        try {
            const res = await api.put(`/api/v1/admin/tickets/${ticketId}/status`, { status: newStatus });
            if (res.data.success) {
                alert('Ticket status changed: ' + newStatus);
                fetchWalletAndTickets();
            }
        } catch (err) {
            alert('Failed to update ticket status.');
        }
    };

    const handleSaveSetting = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/api/v1/admin/settings/${editingSetting.key}`, {
                value: settingValue,
                description: settingDesc
            });
            if (res.data.success) {
                alert('Setting updated successfully.');
                setEditingSetting(null);
                fetchSettings();
            }
        } catch (err) {
            alert('Failed to update setting.');
        }
    };

    // Filter Subscriptions based on subSearch
    const filteredSubscriptions = adminSubscriptions.filter(sub => {
        const emailMatch = (sub.user?.email || '').toLowerCase().includes(subSearch.toLowerCase());
        const phoneMatch = (sub.user?.phone || '').toLowerCase().includes(subSearch.toLowerCase());
        const serviceMatch = (sub.service?.name || '').toLowerCase().includes(subSearch.toLowerCase());
        return emailMatch || phoneMatch || serviceMatch;
    });

    const subTotal = filteredSubscriptions.length;
    const subTotalPages = Math.ceil(subTotal / subLimit);
    const subStartIndex = (subPage - 1) * subLimit;
    const subPaginatedList = filteredSubscriptions.slice(subStartIndex, subStartIndex + subLimit);

    return (
        <div className="flex flex-col gap-6 w-full text-left max-w-full overflow-x-hidden">
            {/* 9 Admin Tabs Selection Header */}
            <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-[24px] shadow-sm flex-wrap gap-4">
                <div className="overflow-x-auto flex-1 pb-1 md:pb-0 flex gap-2 scrollbar-none">
                    {[
                        { id: 'users', label: '1. Users' },
                        { id: 'wallet', label: '2. Wallet Management' },
                        { id: 'services', label: '3. Services' },
                        { id: 'subscriptions', label: '4. Subscriptions' },
                        { id: 'pricing', label: '5. Pricing' },
                        { id: 'api-keys', label: '6. API Keys' },
                        { id: 'audit-logs', label: '7. Audit Logs' },
                        { id: 'tickets', label: '8. Support Tickets' },
                        { id: 'settings', label: '9. System Settings' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveSubTab(tab.id);
                                setCurrentPage(1);
                                setSubPage(1);
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-bold font-display whitespace-nowrap transition-all duration-300 ${activeSubTab === tab.id
                                    ? 'bg-violet-600 text-white shadow-md'
                                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="text-xs font-bold text-slate-500 font-display flex items-center gap-1.5 whitespace-nowrap">
                    <Shield className="w-4 h-4 text-violet-600 animate-pulse" />
                    Dizipay User Management Control Center
                </div>
            </div>

            {tabError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center text-xs font-semibold">
                    ⚠️ {tabError}
                </div>
            )}

            {/* Main Tab Render Container */}
            {tabLoading ? (
                <div className="animate-pulse flex flex-col gap-6 w-full text-left py-12">
                    <div className="h-6 bg-slate-200 rounded-full w-1/4 mb-4" />
                    <div className="h-40 bg-slate-200 rounded-[24px] w-full" />
                </div>
            ) : (
                <>
                    {/* TAB 1: USERS */}
                    {activeSubTab === 'users' && (
                        <div className="flex flex-col gap-4 w-full">
                            <div className="flex justify-between items-center flex-wrap gap-4 bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm">
                                <div className="flex flex-col">
                                    <h3 className="text-base font-bold text-slate-900 font-display">User Accounts Directory</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Total Users: {totalUsers}</p>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(e) => {
                                                setSearchInput(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            placeholder="Search name, email, phone..."
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-xs focus:border-violet-500 outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => {
                                                setSortBy(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs focus:border-violet-500 outline-none font-semibold text-slate-700 h-[38px]"
                                        >
                                            <option value="newest">Sort: Newest</option>
                                            <option value="oldest">Sort: Oldest</option>
                                            <option value="lastLogin">Sort: Last Login</option>
                                            <option value="walletBalance">Sort: Wallet Balance</option>
                                        </select>
                                    </div>
                                    <ClayButton
                                        variant="secondary"
                                        onClick={handleExportCsv}
                                        className="py-2.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                                    >
                                        Export CSV
                                    </ClayButton>
                                    <ClayButton
                                        variant="primary"
                                        onClick={() => setShowCreateModal(true)}
                                        className="py-2.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                                    >
                                        <Plus className="w-4 h-4" /> Create User
                                    </ClayButton>
                                </div>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-x-auto">
                                <table className="min-w-[1360px] w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">ID</th>
                                            <th className="px-6 py-4 min-w-[150px]">Name</th>
                                            <th className="px-6 py-4 min-w-[260px]">Email / Phone</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Wallet</th>
                                            <th className="px-6 py-4">Created Date</th>
                                            <th className="px-6 py-4">Last Login</th>
                                            <th className="px-6 py-4 text-right min-w-[300px] sticky right-0 z-10 bg-slate-50 shadow-[-16px_0_24px_-24px_rgba(15,23,42,0.55)]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {adminUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-semibold text-slate-500">{u.id}</td>
                                                <td 
                                                    className="px-6 py-4 font-semibold text-slate-800 hover:text-violet-650 hover:underline cursor-pointer text-left"
                                                    onClick={() => navigate(`/admin/users/${u.id}`)}
                                                >
                                                    {u.name || '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{getDisplayEmail(u)}</span>
                                                        <span className="text-slate-400 mt-0.5 font-mono text-[10px]">{u.phone || 'No Phone'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{u.Role?.name || 'Client User'}</td>
                                                <td className="px-6 py-4">
                                                    <ClayBadge status={u.status}>{u.status}</ClayBadge>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-violet-750">
                                                    ₹{u.Wallet ? parseFloat(u.Wallet.balance).toFixed(2) : '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 sticky right-0 z-10 bg-white shadow-[-16px_0_24px_-24px_rgba(15,23,42,0.55)]">
                                                    <div className="flex justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openUserDrawer(u)}
                                                        className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-100"
                                                        title="View User Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCreditForm({ userId: u.id, userName: getUserLabel(u), amount: '', reason: '' });
                                                            setShowCreditModal(true);
                                                        }}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                                        title="Credit Wallet"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDebitForm({ userId: u.id, userName: getUserLabel(u), amount: '', reason: '' });
                                                            setShowDebitModal(true);
                                                        }}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                                        title="Debit Wallet"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openPhoneModal(u)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                                        title="Manage Phone"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <button
    onClick={() => {
        if (isPlaceholderEmail(u)) return;
        setResetPassForm({ userId: u.id, userName: getUserLabel(u), password: '' });
        setShowResetPasswordModal(true);
    }}
    disabled={isPlaceholderEmail(u)}
    className="p-1.5 text-amber-600 hover:bg-amber-550 rounded-lg transition-colors border border-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title={isPlaceholderEmail(u) ? 'Email-based password reset unavailable.' : 'Reset Password'}
>
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOtpReset(u.id)}
                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                                                        title="Reset OTP Limits"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    {u.status === 'SUSPENDED' ? (
                                                        <button
                                                            onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100"
                                                            title="Activate User"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-550 rounded-lg border border-amber-100"
                                                            title="Suspend User"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => triggerDeletePrompt(u)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Users view */}
                            <div className="lg:hidden flex flex-col gap-4">
                                {adminUsers.map((u) => (
                                    <div key={u.id} className="p-5 bg-white border border-slate-200 rounded-[20px] shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{getDisplayEmail(u)}</span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">{u.phone ? `Phone: ${u.phone}` : 'No phone linked'}</span>
                                            </div>
                                            <ClayBadge status={u.status}>{u.status}</ClayBadge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-100 py-3 my-1">
                                            <div>
                                                <span className="text-slate-500 block">Name</span>
                                                <span className="font-semibold text-slate-800">{u.name || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Role</span>
                                                <span className="font-semibold text-slate-800">{u.Role?.name || 'Client User'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Wallet</span>
                                                <span className="font-bold text-violet-700">₹{u.Wallet ? parseFloat(u.Wallet.balance).toFixed(2) : '0.00'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Created At</span>
                                                <span className="text-slate-700">{new Date(u.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-start">
                                            <button
                                                onClick={() => openUserDrawer(u)}
                                                className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg border border-violet-100"
                                                title="View User Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCreditForm({ userId: u.id, userName: getUserLabel(u), amount: '', reason: '' });
                                                    setShowCreditModal(true);
                                                }}
                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100"
                                                title="Credit Wallet"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDebitForm({ userId: u.id, userName: getUserLabel(u), amount: '', reason: '' });
                                                    setShowDebitModal(true);
                                                }}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-100"
                                                title="Debit Wallet"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openPhoneModal(u)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100"
                                                title="Manage Phone"
                                            >
                                                <Phone className="w-4 h-4" />
                                            </button>
                                            <button
    onClick={() => {
        if (isPlaceholderEmail(u)) return;
        setResetPassForm({ userId: u.id, userName: getUserLabel(u), password: '' });
        setShowResetPasswordModal(true);
    }}
    disabled={isPlaceholderEmail(u)}
    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title={isPlaceholderEmail(u) ? 'Email-based password reset unavailable.' : 'Reset Password'}
>
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOtpReset(u.id)}
                                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                                                title="Reset OTP Limits"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            {u.status === 'SUSPENDED' ? (
                                                <button
                                                    onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100"
                                                    title="Activate User"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-100"
                                                    title="Suspend User"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => triggerDeletePrompt(u)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination controls */}
                            {(totalPages > 1 || totalUsers > 10) && (
                                <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm flex-wrap gap-2 text-xs font-sans">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500">
                                            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Show:</span>
                                            <select
                                                value={pageSize}
                                                onChange={(e) => {
                                                    setPageSize(parseInt(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="bg-white border border-slate-250 rounded px-2 py-1 outline-none text-[11px] font-semibold text-slate-700"
                                            >
                                                <option value="10">10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                            </select>
                                        </div>
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 rounded-lg border border-slate-250 bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                                            >
                                                Prev
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`w-8 h-8 rounded-lg font-bold border transition-colors ${currentPage === p
                                                            ? 'bg-violet-600 border-violet-600 text-white'
                                                            : 'border-slate-250 hover:bg-slate-100 text-slate-700'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 rounded-lg border border-slate-250 bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: WALLET MANAGEMENT */}
                    {activeSubTab === 'wallet' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
                            {/* Wallet Adjustment Form */}
                            <div className="lg:col-span-5 text-left">
                                <ClayCard className="flex flex-col gap-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
                                    <div>
                                        <h4 className="text-sm font-bold font-display text-slate-900 mb-4 flex items-center gap-1.5">
                                            <CreditCard className="w-4 h-4 text-violet-600" /> Admin Wallet Adjustment Manager
                                        </h4>
                                        <form onSubmit={handleAdminWalletAdjustSubmit} className="flex flex-col gap-4">
                                            <ClayDropdown
                                                label="Select Target User"
                                                options={adminUsers.map(u => ({ label: u.email || `${u.phone} (Phone)`, value: u.id }))}
                                                selected={adminAdjustUserId}
                                                onChange={setAdminAdjustUserId}
                                                className="w-full"
                                            />
                                            <ClayInput
                                                label="Adjustment Amount (₹)"
                                                type="number"
                                                step="0.01"
                                                value={adminAdjustAmount}
                                                onChange={(e) => setAdminAdjustAmount(e.target.value)}
                                                placeholder="e.g. 100.00"
                                                required
                                            />
                                            <ClayDropdown
                                                label="Adjustment Action"
                                                options={[
                                                    { label: 'Credit (Add Funds)', value: 'CREDIT' },
                                                    { label: 'Debit (Subtract Funds)', value: 'DEBIT' }
                                                ]}
                                                selected={adminAdjustType}
                                                onChange={setAdminAdjustType}
                                                className="w-full"
                                            />
                                            <ClayInput
                                                label="Remarks / Audit Log Reason"
                                                type="text"
                                                value={adminAdjustDesc}
                                                onChange={(e) => setAdminAdjustDesc(e.target.value)}
                                                placeholder="Manual admin adjustment"
                                            />
                                            <ClayButton type="submit" variant="primary" className="w-full mt-2">
                                                Execute Adjustment
                                            </ClayButton>
                                        </form>
                                    </div>
                                </ClayCard>
                            </div>

                            {/* Wallet Balances list for user reference */}
                            <div className="lg:col-span-7 flex flex-col gap-4 text-left">
                                <h4 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
                                    <Coins className="w-4 h-4 text-violet-600" /> Wallet Balance Ledger reference
                                </h4>
                                <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                                <th className="px-6 py-3">User</th>
                                                <th className="px-6 py-3">Balance</th>
                                                <th className="px-6 py-3">Currency</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {adminUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-3 font-semibold text-slate-800">{getDisplayEmail(u) || u.phone}</td>
                                                    <td className="px-6 py-3 font-mono font-bold text-violet-700">
                                                        ₹{u.Wallet ? parseFloat(u.Wallet.balance).toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-400 font-mono">INR</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SERVICES */}
                    {activeSubTab === 'services' && (
                        <div className="flex flex-col gap-4 w-full animate-fadeIn font-sans">
                            <div className="flex justify-between items-center bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm">
                                <div className="flex flex-col text-left">
                                    <h3 className="text-base font-bold text-slate-900 font-display">System Dynamic Services</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Edit service configs, track total activations, and check revenue streams.</p>
                                </div>
                            </div>
                            <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Service Key</th>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Method / Endpoint</th>
                                            <th className="px-6 py-4">Usage Fee</th>
                                            <th className="px-6 py-4">Activation Fee</th>
                                            <th className="px-6 py-4">Total Activations</th>
                                            <th className="px-6 py-4">Revenue Stream</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {adminServices.map((svc) => (
                                            <tr key={svc.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-900">{svc.key}</td>
                                                <td className="px-6 py-4 font-semibold text-slate-800">{svc.name}</td>
                                                <td className="px-6 py-4 font-mono">
                                                    <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{svc.method}</span>
                                                    <span className="text-slate-500 text-[10px]">{svc.endpoint}</span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-slate-700 font-semibold">{svc.price || '₹1.00'}</td>
                                                <td className="px-6 py-4 font-mono text-slate-700 font-semibold">₹{parseFloat(svc.activationFee || 49.0).toFixed(2)}</td>
                                                <td className="px-6 py-4 font-bold text-slate-850 font-sans">{svc.totalActivations || 0}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-emerald-600">₹{parseFloat(svc.activationRevenue || 0.0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAdminService(svc);
                                                            setServiceForm({
                                                                name: svc.name,
                                                                description: svc.description || '',
                                                                price: svc.price || '',
                                                                activationFee: parseFloat(svc.activationFee || 49.0).toString()
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white font-bold rounded-lg text-xs"
                                                    >
                                                        Edit Config
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SUBSCRIPTIONS */}
                    {activeSubTab === 'subscriptions' && (
                        <div className="flex flex-col gap-4 w-full">
                            <div className="flex justify-between items-center flex-wrap gap-4 bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm">
                                <div className="flex flex-col">
                                    <h3 className="text-base font-bold text-slate-900 font-display">Service Subscriptions Directory</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Control active tenant verifications and manual lifespans</p>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={subSearch}
                                        onChange={(e) => {
                                            setSubSearch(e.target.value);
                                            setSubPage(1);
                                        }}
                                        placeholder="Search user email, service name..."
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-xs focus:border-violet-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Subscriptions Grid View */}
                            <div className="hidden lg:block w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Service</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Activated At</th>
                                            <th className="px-6 py-4">Expires At</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {subPaginatedList.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-900">{sub.user?.email || sub.user?.phone || 'Unknown User'}</span>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-700">{sub.service?.name}</td>
                                                <td className="px-6 py-4">
                                                    <ClayBadge status={sub.status}>{sub.status}</ClayBadge>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-sans">
                                                    {sub.activatedAt ? new Date(sub.activatedAt).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-sans">
                                                    {sub.expiresAt ? new Date(sub.expiresAt).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            placeholder="Days"
                                                            defaultValue="30"
                                                            id={`days-ext-${sub.id}`}
                                                            className="w-16 px-2 py-1 border border-slate-250 bg-white rounded-lg text-xs"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const days = document.getElementById(`days-ext-${sub.id}`)?.value || '30';
                                                                handleExtendService(sub.userId, sub.serviceId, days);
                                                            }}
                                                            className="px-2.5 py-1 rounded bg-violet-50 text-violet-700 font-bold border border-violet-100 hover:bg-violet-100 text-[10px]"
                                                        >
                                                            Extend
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleService(sub.userId, sub.serviceId, sub.status === 'ACTIVE')}
                                                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border ${sub.status === 'ACTIVE'
                                                                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                                                : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                                                            }`}
                                                    >
                                                        {sub.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Subscriptions Mobile */}
                            <div className="lg:hidden flex flex-col gap-4">
                                {subPaginatedList.map((sub) => (
                                    <div key={sub.id} className="p-5 bg-white border border-slate-200 rounded-[20px] shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-900 truncate max-w-[70%]">{sub.user?.email || sub.user?.phone}</span>
                                            <ClayBadge status={sub.status}>{sub.status}</ClayBadge>
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-slate-500">Service:</span> <span className="font-semibold text-slate-800">{sub.service?.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                            <input
                                                type="number"
                                                placeholder="Days"
                                                defaultValue="30"
                                                id={`days-ext-mob-${sub.id}`}
                                                className="w-12 px-1.5 py-1 border border-slate-250 bg-white rounded text-xs"
                                            />
                                            <button
                                                onClick={() => {
                                                    const days = document.getElementById(`days-ext-mob-${sub.id}`)?.value || '30';
                                                    handleExtendService(sub.userId, sub.serviceId, days);
                                                }}
                                                className="px-2 py-1 bg-violet-50 text-violet-700 font-bold border border-violet-100 rounded text-[10px]"
                                            >
                                                Extend
                                            </button>
                                            <button
                                                onClick={() => handleToggleService(sub.userId, sub.serviceId, sub.status === 'ACTIVE')}
                                                className={`px-3 py-1 text-xs font-bold rounded-lg border ${sub.status === 'ACTIVE' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
                                                    }`}
                                            >
                                                Toggle
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: PRICING */}
                    {activeSubTab === 'pricing' && (
                        <div className="flex flex-col gap-8 w-full">
                            {/* Hot-Swap routing */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-base font-bold font-display text-slate-900">Provider Active Routing</h3>
                                <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                                <th className="px-6 py-4">Service Type</th>
                                                <th className="px-6 py-4">Primary Provider</th>
                                                <th className="px-6 py-4">Backup Provider</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Swap Route</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {adminRoutes.map((route) => (
                                                <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold font-mono text-slate-900">{route.serviceType}</td>
                                                    <td className="px-6 py-4 font-semibold text-slate-800">{route.primaryProviderName}</td>
                                                    <td className="px-6 py-4 text-slate-500">{route.backupProviderName}</td>
                                                    <td className="px-6 py-4">
                                                        <ClayBadge status={route.activeStatus ? 'ACTIVE' : 'FAILED'}>
                                                            {route.activeStatus ? 'ACTIVE' : 'OFFLINE'}
                                                        </ClayBadge>
                                                    </td>
                                                    <td className="px-6 py-4 flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateProviderRoute(route.id, {
                                                                primaryProviderId: route.primaryProviderId === 1 ? 2 : 1
                                                            })}
                                                            className="px-2 py-1 rounded bg-slate-100 border border-slate-250 text-[10px] font-bold"
                                                        >
                                                            Swap Primary
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pricing markups rules */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-base font-bold font-display text-slate-900">Pricing Markup Rules</h3>
                                <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                                <th className="px-6 py-4">Service</th>
                                                <th className="px-6 py-4">Provider Cost</th>
                                                <th className="px-6 py-4">Selling Price</th>
                                                <th className="px-6 py-4">Margin Markup</th>
                                                <th className="px-6 py-4 text-right">Adjust Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {adminPricingRules.map((rule) => (
                                                <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{rule.serviceType}</td>
                                                    <td className="px-6 py-4 font-mono">₹{parseFloat(rule.providerCost).toFixed(2)}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-800">₹{parseFloat(rule.sellingPrice).toFixed(2)}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-violet-600">₹{parseFloat(rule.margin).toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdatePricingRule(rule.id, {
                                                                providerCost: parseFloat(rule.providerCost),
                                                                sellingPrice: parseFloat(rule.sellingPrice) + 0.50
                                                            })}
                                                            className="px-2 py-1 rounded bg-slate-100 text-[10px]"
                                                        >
                                                            + ₹0.50
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdatePricingRule(rule.id, {
                                                                providerCost: parseFloat(rule.providerCost),
                                                                sellingPrice: Math.max(parseFloat(rule.providerCost), parseFloat(rule.sellingPrice) - 0.50)
                                                            })}
                                                            className="px-2 py-1 rounded bg-slate-100 text-[10px]"
                                                        >
                                                            - ₹0.50
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: API KEYS */}
                    {activeSubTab === 'api-keys' && (
                        <div className="flex flex-col gap-4 w-full">
                            <h3 className="text-base font-bold text-slate-900 font-display">System-Wide Whitelisted API Keys</h3>
                            <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Key ID</th>
                                            <th className="px-6 py-4">Masked Value</th>
                                            <th className="px-6 py-4">Name Label</th>
                                            <th className="px-6 py-4">Owner User</th>
                                            <th className="px-6 py-4">Rate Limit</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {adminApiKeys.map((key) => (
                                            <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-semibold text-slate-500">{key.id}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-slate-700">{key.keyMasked}</td>
                                                <td className="px-6 py-4 font-semibold text-slate-800">{key.name}</td>
                                                <td className="px-6 py-4 text-slate-600">{key.user?.email || key.user?.phone}</td>
                                                <td className="px-6 py-4 font-mono">{key.rateLimit} req/min</td>
                                                <td className="px-6 py-4">
                                                    <ClayBadge status={key.status}>{key.status}</ClayBadge>
                                                </td>
                                            </tr>
                                        ))}
                                        {adminApiKeys.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-slate-500">No active API keys found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: AUDIT LOGS */}
                    {activeSubTab === 'audit-logs' && (
                        <div className="flex flex-col gap-8 w-full">
                            <div className="flex flex-col gap-4 w-full">
                                <h3 className="text-base font-bold text-slate-900 font-display">System Audit Logs Actions</h3>
                                <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                                <th className="px-6 py-3">Admin</th>
                                                <th className="px-6 py-3">Action</th>
                                                <th className="px-6 py-3">Target Entity</th>
                                                <th className="px-6 py-3">Details</th>
                                                <th className="px-6 py-3">IP Address</th>
                                                <th className="px-6 py-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {adminAuditLogs.slice(0, 10).map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-3 font-semibold text-slate-800">{log.user?.email || 'System'}</td>
                                                    <td className="px-6 py-3 font-mono font-bold text-slate-700">{log.action}</td>
                                                    <td className="px-6 py-3 font-mono text-slate-500">{log.entityName} (ID: {log.entityId})</td>
                                                    <td className="px-6 py-3 font-mono text-[10px] text-slate-500 select-all truncate max-w-[200px]">{JSON.stringify(log.newValues)}</td>
                                                    <td className="px-6 py-3 font-mono text-slate-500">{log.ipAddress || '—'}</td>
                                                    <td className="px-6 py-3 text-slate-400 font-sans">{new Date(log.createdAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 8: SUPPORT TICKETS */}
                    {activeSubTab === 'tickets' && (
                        <div className="flex flex-col gap-4 w-full">
                            <h3 className="text-base font-bold text-slate-900 font-display">System Support Tickets</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {adminTickets.map((ticket) => (
                                    <ClayCard key={ticket.id} className="p-5 flex flex-col gap-3 bg-white border border-slate-200 rounded-[20px] shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-900">{ticket.subject}</span>
                                            <ClayBadge status={ticket.status}>{ticket.status}</ClayBadge>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{ticket.description}</p>
                                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-100">
                                            <span>User: {ticket.user?.email || 'Unknown'}</span>
                                            <div className="flex gap-2">
                                                {ticket.status !== 'RESOLVED' && (
                                                    <button
                                                        onClick={() => handleTicketStatusChange(ticket.id, 'RESOLVED')}
                                                        className="text-violet-600 hover:underline font-bold"
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                                {ticket.status !== 'CLOSED' && (
                                                    <button
                                                        onClick={() => handleTicketStatusChange(ticket.id, 'CLOSED')}
                                                        className="text-red-600 hover:underline font-bold"
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </ClayCard>
                                ))}
                                {adminTickets.length === 0 && (
                                    <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[16px] col-span-2">
                                        No active support tickets found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 9: SYSTEM SETTINGS */}
                    {activeSubTab === 'settings' && (
                        <div className="flex flex-col gap-4 w-full">
                            <h3 className="text-base font-bold text-slate-900 font-display">Global Infrastructure Configuration Settings</h3>
                            <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 font-bold font-display text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Setting Key</th>
                                            <th className="px-6 py-4">Value</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {adminSettings.map((set) => (
                                            <tr key={set.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-900">{set.key}</td>
                                                <td className="px-6 py-4 font-mono text-slate-800 select-all truncate max-w-[200px]">{set.value}</td>
                                                <td className="px-6 py-4 text-slate-500">{set.description || '—'}</td>
                                                <td className="px-6 py-4 text-right flex justify-end">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSetting(set);
                                                            setSettingValue(set.value);
                                                            setSettingDesc(set.description || '');
                                                        }}
                                                        className="p-1.5 rounded-lg border border-slate-250 hover:bg-slate-100 text-slate-600"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {adminSettings.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500">No global settings records. Settings are initiated on demand.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* CREATE USER MODAL */}
            <ClayModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Register New Client Account"
            >
                <form onSubmit={handleCreateUserSubmit} className="flex flex-col gap-4 text-left font-sans">
                    <ClayInput
                        label="Full Name *"
                        type="text"
                        value={createUserForm.name}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                        placeholder="Full Name"
                        required
                    />
                    <ClayInput
                        label="Email Address *"
                        type="email"
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                        placeholder="e.g. client@dizipay.in"
                        required
                    />
                    <ClayInput
                        label="Mobile Number (10 digits) *"
                        type="text"
                        value={createUserForm.phone}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        required
                    />
                    <ClayInput
                        label="Account Password *"
                        type="password"
                        value={createUserForm.password}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                        placeholder="Password strength: 8+ characters"
                        required
                    />
                    <div className="flex flex-col w-full">
                        <span className="block text-xs font-semibold text-slate-700 font-display mb-2 ml-2">Access Role *</span>
                        <select
                            value={createUserForm.role}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                            className="w-full bg-white text-slate-900 rounded-full px-5 py-3.5 border border-slate-350 shadow-clay-input focus:border-violet-500 outline-none text-xs font-medium"
                            required
                        >
                            <option value="Client User">Client User</option>
                            <option value="Reseller">Reseller</option>
                            <option value="Admin">Admin</option>
                            <option value="Super Admin">Super Admin</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-end mt-4 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </ClayButton>
                        <ClayButton type="submit" variant="primary">
                            Register Account
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>

            {/* DELETE USER CONFIRMATION MODAL */}
            <ClayModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirm Account Deletion"
            >
                <div className="flex flex-col gap-4 text-left">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        ⚠️ <strong>CRITICAL WARNING:</strong> This action will permanently purge the account of <strong>{userToDelete ? getUserLabel(userToDelete) : ''}</strong>.
                        All associated <strong>API Keys, subscriptions, transaction logs, and wallets</strong> will be permanently deleted from the database in a Prisma transaction.
                    </p>
                    <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 p-3 rounded-lg">
                        This action cannot be undone. To proceed, please type <span className="underline font-bold select-all">DELETE USER</span> below.
                    </p>
                    <ClayInput
                        label='Type "DELETE USER" to confirm'
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE USER"
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setShowDeleteModal(false)}>
                            Cancel
                        </ClayButton>
                        <ClayButton
                            variant="danger"
                            onClick={handleDeleteUserSubmit}
                            disabled={deleteConfirmText !== 'DELETE USER' || isActionBusy('delete-user')}
                        >
                            {isActionBusy('delete-user') ? 'Processing...' : 'Purge Account'}
                        </ClayButton>
                    </div>
                </div>
            </ClayModal>

            {/* EDIT SETTING MODAL */}
            <ClayModal
                isOpen={!!editingSetting}
                onClose={() => setEditingSetting(null)}
                title={`Edit Config: ${editingSetting?.key}`}
            >
                <form onSubmit={handleSaveSetting} className="flex flex-col gap-4 text-left">
                    <ClayInput
                        label="Setting Value"
                        type="text"
                        value={settingValue}
                        onChange={(e) => setSettingValue(e.target.value)}
                        required
                    />
                    <ClayInput
                        label="Description"
                        type="text"
                        value={settingDesc}
                        onChange={(e) => setSettingDesc(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setEditingSetting(null)}>
                            Cancel
                        </ClayButton>
                        <ClayButton type="submit" variant="primary">
                            Save Configuration
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>

            {/* CREDIT WALLET MODAL */}
            <ClayModal
                isOpen={showCreditModal}
                onClose={() => setShowCreditModal(false)}
                title={`Credit Wallet: ${creditForm.userName}`}
            >
                <form onSubmit={handleCreditSubmit} className="flex flex-col gap-4 text-left font-sans">
                    <ClayInput
                        label="User"
                        type="text"
                        value={creditForm.userName}
                        disabled
                    />
                    <ClayInput
                        label="Credit Amount (₹) *"
                        type="number"
                        step="0.01"
                        value={creditForm.amount}
                        onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                        placeholder="e.g. 500.00"
                        required
                    />
                    <ClayInput
                        label="Reason / Remarks *"
                        type="text"
                        value={creditForm.reason}
                        onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
                        placeholder="e.g. Promotional credit, manual adjustment"
                        required
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setShowCreditModal(false)}>
                            Cancel
                        </ClayButton>
                        <ClayButton type="submit" variant="primary" disabled={isActionBusy('credit-wallet')}>
                            {isActionBusy('credit-wallet') ? 'Processing...' : 'Execute Credit'}
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>

            {/* DEBIT WALLET MODAL */}
            <ClayModal
                isOpen={showDebitModal}
                onClose={() => setShowDebitModal(false)}
                title={`Debit Wallet: ${debitForm.userName}`}
            >
                <form onSubmit={handleDebitSubmit} className="flex flex-col gap-4 text-left font-sans">
                    <ClayInput
                        label="User"
                        type="text"
                        value={debitForm.userName}
                        disabled
                    />
                    <ClayInput
                        label="Debit Amount (₹) *"
                        type="number"
                        step="0.01"
                        value={debitForm.amount}
                        onChange={(e) => setDebitForm({ ...debitForm, amount: e.target.value })}
                        placeholder="e.g. 200.00"
                        required
                    />
                    <ClayInput
                        label="Reason / Remarks *"
                        type="text"
                        value={debitForm.reason}
                        onChange={(e) => setDebitForm({ ...debitForm, reason: e.target.value })}
                        placeholder="e.g. Manual debit adjustment, service chargeback"
                        required
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setShowDebitModal(false)}>
                            Cancel
                        </ClayButton>
                        <ClayButton type="submit" variant="danger" disabled={isActionBusy('debit-wallet')}>
                            {isActionBusy('debit-wallet') ? 'Processing...' : 'Execute Debit'}
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>


            {/* MANAGE PHONE MODAL */}
            <ClayModal
                isOpen={showPhoneModal}
                onClose={() => setShowPhoneModal(false)}
                title="Manage User Phone Number"
            >
                <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4 text-left font-sans">
                    <ClayInput label="User" type="text" value={phoneForm.userName} disabled />
                    <div className="flex flex-col gap-1 px-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Phone Number</span>
                        <span className="text-sm font-semibold text-slate-800 font-mono">{phoneForm.currentPhone || 'No phone number assigned'}</span>
                    </div>
                    <ClayInput
                        label="New Phone Number *"
                        type="text"
                        value={phoneForm.phone}
                        onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10 digit mobile number"
                        required
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setShowPhoneModal(false)}>Cancel</ClayButton>
                        <ClayButton type="submit" variant="primary" disabled={isActionBusy('update-phone')}>
                            {isActionBusy('update-phone') ? 'Processing...' : 'Update Phone'}
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>

            {/* RESET PASSWORD MODAL */}
            <ClayModal
                isOpen={showResetPasswordModal}
                onClose={() => setShowResetPasswordModal(false)}
                title={`Reset Password: ${resetPassForm.userName}`}
            >
                <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4 text-left font-sans">
                    <ClayInput
                        label="New Password *"
                        type="password"
                        value={resetPassForm.password}
                        onChange={(e) => setResetPassForm({ ...resetPassForm, password: e.target.value })}
                        placeholder="Min 8 characters"
                        required
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setShowResetPasswordModal(false)}>
                            Cancel
                        </ClayButton>
                        <ClayButton type="submit" variant="primary" disabled={isActionBusy('reset-password')}>
                            {isActionBusy('reset-password') ? 'Processing...' : 'Reset Password'}
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>

            {/* USER DETAIL SIDE DRAWER (Slide-out) */}
            {isDrawerOpen && selectedUser && (
                <>
                    {/* Backdrop overlay */}
                    <div
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => {
                            setIsDrawerOpen(false);
                            setSelectedUser(null);
                        }}
                    />

                    {/* Drawer container */}
                    <div
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out overflow-hidden"
                        style={{
                            top: 0,
                            bottom: 0,
                            height: '100dvh',
                            paddingTop: 'env(safe-area-inset-top, 0px)',
                            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
                        }}
                    >
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
                            <div className="flex flex-col">
                                <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-violet-600" /> Account Dashboard Overview
                                </h2>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{getDisplayEmail(selectedUser) || selectedUser.phone}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsDrawerOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="w-8 h-8 rounded-full border border-slate-250 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors font-semibold text-lg"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Scrollable Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-full">
                            {/* Profile Card */}
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] flex flex-col gap-3">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-455">User Context Details</h3>
                                    <button 
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            setSelectedUser(null);
                                            navigate(`/admin/users/${selectedUser.id}`);
                                        }}
                                        className="text-violet-600 hover:text-violet-850 hover:underline font-bold text-xs flex items-center gap-1"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Inspect Full Account
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div><span className="text-slate-500">Database ID:</span> <span className="font-mono font-semibold">{selectedUser.id}</span></div>
                                    <div><span className="text-slate-500">Name:</span> <span className="font-semibold text-slate-800">{selectedUser.name || '—'}</span></div>
                                    <div><span className="text-slate-500">Email Address:</span> <span className="font-semibold text-slate-800">{selectedUser.email || '—'}</span></div>
                                    <div><span className="text-slate-500">Phone Number:</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.phone || 'No phone number assigned'}</span></div>
                                    <div><span className="text-slate-500">Phone Verified:</span> <ClayBadge status={selectedUser.phoneVerified ? 'ACTIVE' : 'PENDING'}>{selectedUser.phoneVerified ? 'VERIFIED' : 'NOT VERIFIED'}</ClayBadge></div>
                                    <div><span className="text-slate-500">Assigned Role:</span> <span className="font-semibold text-slate-800">{selectedUser.Role?.name || 'Client User'}</span></div>
                                    <div><span className="text-slate-500">System Status:</span> <ClayBadge status={selectedUser.status}>{selectedUser.status}</ClayBadge></div>
                                    <div><span className="text-slate-500">Registered Date:</span> <span className="font-semibold text-slate-700">{new Date(selectedUser.createdAt).toLocaleString()}</span></div>
                                    <div><span className="text-slate-500">Last Login:</span> <span className="font-semibold text-slate-700">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}</span></div>
                                </div>
                            </div>

                            {/* KYC Details & Timeline */}
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] flex flex-col gap-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-455 mb-1">KYC Status & Details</h3>
                                <div className="flex flex-col sm:flex-row gap-5 items-center bg-white border border-slate-150 p-4 rounded-xl">
                                    <img 
                                        src={selectedUser.aadhaarPhotoUrl || selectedUser.aadhaarPhoto || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"} 
                                        alt="Aadhaar Avatar" 
                                        className="w-24 h-28 object-cover rounded-xl border border-slate-250 shadow-sm shrink-0"
                                        onError={(e) => { e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"; }}
                                    />
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full text-left">
                                        <div><span className="text-slate-500 block">KYC Status</span> <ClayBadge status={selectedUser.kycStatus}>{selectedUser.kycStatus}</ClayBadge></div>
                                        <div><span className="text-slate-500 block">Aadhaar Name</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarName || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Date of Birth</span> <span className="font-semibold text-slate-850 font-mono">{selectedUser.aadhaarDob || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Gender</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarGender || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Father's Name</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarFatherName || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Masked Aadhaar</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.aadhaarNumberMasked || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Village/Town</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarVillage || '—'}</span></div>
                                        <div><span className="text-slate-500 block">District</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarDistrict || '—'}</span></div>
                                        <div><span className="text-slate-500 block">State</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarState || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Pincode</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.aadhaarPincode || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Country</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarCountry || '—'}</span></div>
                                        <div><span className="text-slate-500 block">Verified Date</span> <span className="font-semibold text-slate-700">{selectedUser.aadhaarVerifiedAt ? new Date(selectedUser.aadhaarVerifiedAt).toLocaleString() : 'Not Verified'}</span></div>
                                        <div><span className="text-slate-500 block">Approval Date</span> <span className="font-semibold text-slate-700">{selectedUser.kycApprovedAt ? new Date(selectedUser.kycApprovedAt).toLocaleString() : '—'}</span></div>
                                        {selectedUser.panNumber && (
                                            <div><span className="text-slate-500 block">Historical PAN</span> <span className="font-semibold text-slate-700 font-mono">{selectedUser.panNumber}</span></div>
                                        )}
                                        <div className="sm:col-span-2"><span className="text-slate-500 block font-semibold mb-0.5">Aadhaar Address</span> <p className="text-slate-700 leading-relaxed font-medium">{selectedUser.aadhaarAddress || '—'}</p></div>
                                        <div className="sm:col-span-2"><span className="text-slate-500 block font-semibold">KYC Remarks</span> <span className="font-semibold text-slate-700 block mt-0.5">{selectedUser.kycRemarks || 'No remarks'}</span></div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-200 pt-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-455 mb-3 font-display">KYC Verification Timeline</h4>
                                    <div className="relative border-l border-slate-200 ml-3 flex flex-col gap-6">
                                        {(() => {
                                            const events = [];
                                            if (selectedUser.kycVerifications) {
                                                selectedUser.kycVerifications.forEach(v => {
                                                    events.push({
                                                        date: new Date(v.createdAt),
                                                        action: v.status,
                                                        remarks: v.status === 'KYC_REJECTED' ? (selectedUser.kycRemarks || 'Verification rejected') : (v.status === 'KYC_APPROVED' ? 'Approved' : 'Verification step completed')
                                                    });
                                                });
                                            }
                                            if (selectedUser.auditLogs) {
                                                selectedUser.auditLogs.forEach(a => {
                                                    const kycActions = ['AADHAAR_OTP_SEND', 'AADHAAR_DETAILS_FETCH', 'AADHAAR_VERIFIED', 'KYC_APPROVED', 'KYC_REJECTED', 'KYC_RETRY', 'ADMIN_KYC_APPROVE', 'ADMIN_KYC_REJECT'];
                                                    if (kycActions.includes(a.action)) {
                                                        events.push({
                                                            date: new Date(a.createdAt),
                                                            action: a.action,
                                                            remarks: a.newValues?.remarks || ''
                                                        });
                                                    }
                                                });
                                            }
                                            // Deduplicate by matching action & timestamp
                                            const seen = new Set();
                                            const deduped = [];
                                            events.forEach(e => {
                                                const key = `${e.action}_${e.date.getTime()}`;
                                                if (!seen.has(key)) {
                                                    seen.add(key);
                                                    deduped.push(e);
                                                }
                                            });
                                            deduped.sort((a, b) => b.date - a.date);
                                            return deduped.map((evt, idx) => {
                                                let displayAction = evt.action.replace(/_/g, ' ');
                                                if (evt.action === 'AADHAAR_OTP_SEND') displayAction = 'Aadhaar OTP Sent';
                                                else if (evt.action === 'AADHAAR_DETAILS_FETCH' || evt.action === 'AADHAAR_VERIFIED') displayAction = 'Aadhaar Verified';
                                                else if (evt.action === 'KYC_APPROVED' || evt.action === 'ADMIN_KYC_APPROVE') displayAction = 'KYC Approved';
                                                else if (evt.action === 'KYC_REJECTED' || evt.action === 'ADMIN_KYC_REJECT') displayAction = 'KYC Rejected';
                                                else if (evt.action === 'KYC_RETRY') displayAction = 'KYC Retry Request';
                                                return (
                                                    <div key={idx} className="relative pl-6">
                                                        <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-violet-600 border border-white" />
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-[10px] text-slate-400 font-mono">{evt.date.toLocaleString()}</span>
                                                            <span className="text-xs font-bold text-slate-800">{displayAction}</span>
                                                            {evt.remarks && <span className="text-xs text-slate-500 mt-0.5">{evt.remarks}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                        {(!selectedUser.kycVerifications || selectedUser.kycVerifications.length === 0) && (!selectedUser.auditLogs || selectedUser.auditLogs.filter(a => ['PAN_VERIFY', 'AADHAAR_OTP_SEND', 'AADHAAR_MATCH', 'KYC_APPROVED', 'KYC_REJECTED', 'KYC_RETRY', 'ADMIN_KYC_APPROVE', 'ADMIN_KYC_REJECT'].includes(a.action)).length === 0) && (
                                            <span className="text-xs text-slate-400 text-center py-2 block">No KYC timeline events.</span>
                                        )}
                                    </div>
                                </div>
                                {selectedUser.kycStatus !== 'KYC_APPROVED' && (
                                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-200 overflow-visible">
                                        <input
                                            type="text"
                                            placeholder="Remarks for approve/reject"
                                            id={`admin-kyc-remarks-${selectedUser.id}`}
                                            className="flex-1 px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-xs outline-none focus:border-violet-500"
                                        />
                                        <button
                                            onClick={async () => {
                                                const remarks = document.getElementById(`admin-kyc-remarks-${selectedUser.id}`)?.value || '';
                                                try {
                                                    const res = await api.post(`/api/v1/admin/kyc/${selectedUser.id}/approve`, { remarks });
                                                    if (res.data.success) {
                                                        alert('KYC manually approved.');
                                                        setSelectedUser({ ...selectedUser, kycStatus: 'KYC_APPROVED', kycRemarks: remarks || 'Manually approved by Administrator' });
                                                        refreshCurrentTab();
                                                    }
                                                } catch (err) {
                                                    alert(err.response?.data?.error || 'Failed to approve KYC');
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const remarks = document.getElementById(`admin-kyc-remarks-${selectedUser.id}`)?.value || '';
                                                try {
                                                    const res = await api.post(`/api/v1/admin/kyc/${selectedUser.id}/reject`, { remarks });
                                                    if (res.data.success) {
                                                        alert('KYC manually rejected.');
                                                        setSelectedUser({ ...selectedUser, kycStatus: 'KYC_REJECTED', kycRemarks: remarks || 'Manually rejected by Administrator' });
                                                        refreshCurrentTab();
                                                    }
                                                } catch (err) {
                                                    alert(err.response?.data?.error || 'Failed to reject KYC');
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Password Override */}
                            <div className="border border-slate-200 p-5 rounded-[20px] bg-white">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">Security Override</h3>
                                <form onSubmit={handlePasswordResetSubmit} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <ClayInput
                                            label="Set New Password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter raw secret"
                                            className="mb-0"
                                        />
                                    </div>
                                    <ClayButton type="submit" variant="secondary" className="py-3 px-5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-255 flex items-center gap-1.5 h-[46px] rounded-full">
                                        <Key className="w-4 h-4 text-slate-500" /> Apply Override
                                    </ClayButton>
                                </form>
                            </div>

                            {/* Wallet Ledger History */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450">Wallet Ledger (₹{parseFloat(selectedUser.Wallet?.balance || 0).toFixed(2)})</h3>
                                    <span className="text-[10px] text-slate-400 font-mono">INR Baseline Currency</span>
                                </div>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                                    {selectedUser.Wallet?.transactions?.map((t) => (
                                        <div key={t.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{t.type} Adjustment</span>
                                                <span className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(t.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <strong className={`font-mono ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {t.type === 'CREDIT' ? '+' : '-'} ₹{parseFloat(t.amount).toFixed(2)}
                                                </strong>
                                                <span className="text-[9px] text-slate-400 font-mono">After: ₹{parseFloat(t.balanceAfter).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedUser.Wallet?.transactions || selectedUser.Wallet.transactions.length === 0) && (
                                        <span className="text-xs text-slate-400 text-center py-4 block">No ledger history.</span>
                                    )}
                                </div>
                            </div>

                            {/* Subscriptions Overrides */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">SaaS Service Subscriptions Control</h3>
                                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                                    {availableServices.map((svc) => {
                                        const uSub = selectedUser.subscriptions?.find(sub => sub.serviceId === svc.id);
                                        const isActive = uSub && uSub.status === 'ACTIVE';

                                        return (
                                            <div key={svc.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col gap-2.5 text-xs">
                                                <div className="flex justify-between items-center gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{svc.name}</span>
                                                        {uSub && (
                                                            <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                                                                Expires: {uSub.expiresAt ? new Date(uSub.expiresAt).toLocaleDateString() : 'Never'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleService(selectedUser.id, svc.id, isActive)}
                                                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${isActive
                                                                ? 'bg-red-50 border-red-200 text-red-655 hover:bg-red-100'
                                                                : 'bg-slate-200 border-slate-350 text-slate-600 hover:bg-slate-300'
                                                            }`}
                                                    >
                                                        {isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
                                                {isActive && (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                                        <span className="text-[10px] text-slate-500">Extend lifespan:</span>
                                                        <input
                                                            type="number"
                                                            placeholder="Days"
                                                            defaultValue="30"
                                                            id={`drawer-ext-days-${svc.id}`}
                                                            className="w-12 px-1.5 py-0.5 border border-slate-250 bg-white rounded text-[10px]"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const d = document.getElementById(`drawer-ext-days-${svc.id}`)?.value || '30';
                                                                handleExtendService(selectedUser.id, svc.id, d);
                                                            }}
                                                            className="text-violet-600 hover:underline font-bold text-[10px]"
                                                        >
                                                            Extend Days
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* API Keys */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">Administrative API Credentials</h3>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                                    {selectedUser.apiKeys?.map((k) => (
                                        <div key={k.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex justify-between items-center">
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <strong className="text-slate-800">{k.name}</strong>
                                                <span className="font-mono text-[10px] text-slate-400 mt-0.5">{k.keyMasked}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-mono text-slate-500">Rate: {k.rateLimit}/m</span>
                                                <ClayBadge status={k.status}>{k.status}</ClayBadge>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedUser.apiKeys || selectedUser.apiKeys.length === 0) && (
                                        <span className="text-xs text-slate-400 text-center py-4 block">No API keys credentials.</span>
                                    )}
                                </div>
                            </div>

                            {/* Recent Activities */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">Recent Verification Transactions</h3>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                                    {selectedUser.verificationRequests?.map((v) => (
                                        <div key={v.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <strong className="font-mono text-slate-850">{v.serviceType}</strong>
                                                <span className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(v.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <strong className="font-mono text-slate-700">₹{parseFloat(v.cost).toFixed(2)}</strong>
                                                <ClayBadge status={v.status}>{v.status}</ClayBadge>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedUser.verificationRequests || selectedUser.verificationRequests.length === 0) && (
                                        <span className="text-xs text-slate-400 text-center py-4 block">No recent verifications.</span>
                                    )}
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">System Welcome & Event Notifications</h3>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                                    {selectedUser.notifications?.map((notif) => (
                                        <div key={notif.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col gap-1 text-left">
                                            <div className="flex justify-between items-center">
                                                <strong className="text-slate-800 text-[11px]">{notif.title}</strong>
                                                <span className="text-[9px] text-slate-400 font-mono">{new Date(notif.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{notif.message}</p>
                                        </div>
                                    ))}
                                    {(!selectedUser.notifications || selectedUser.notifications.length === 0) && (
                                        <span className="text-xs text-slate-400 text-center py-4 block">No notifications generated yet.</span>
                                    )}
                                </div>
                            </div>

                            {/* Support Tickets */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">Support Tickets</h3>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                                    {selectedUser.supportTickets?.map((ticket) => (
                                        <div key={ticket.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col gap-1 text-left">
                                            <div className="flex justify-between items-center">
                                                <strong className="text-slate-800 text-[11px]">{ticket.subject}</strong>
                                                <ClayBadge status={ticket.status}>{ticket.status}</ClayBadge>
                                            </div>
                                            <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{ticket.description}</p>
                                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">Priority: {ticket.priority} | {new Date(ticket.createdAt).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {(!selectedUser.supportTickets || selectedUser.supportTickets.length === 0) && (
                                        <span className="text-xs text-slate-400 text-center py-4 block">No support tickets created.</span>
                                    )}
                                </div>
                            </div>

                            {/* Administrative Audit Trails */}
                            <div className="bg-white border border-slate-200 p-5 rounded-[20px]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">Recent Security Audits</h3>
                                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                                    {selectedUser.auditLogs?.map((a) => (
                                        <div key={a.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col gap-1.5 text-left">
                                            <div className="flex justify-between items-center">
                                                <strong className="font-mono text-slate-800 text-[11px]">{a.action}</strong>
                                                <span className="text-[9px] text-slate-400 font-mono">{new Date(a.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            {a.newValues && (
                                                <pre className="p-2 bg-white border border-slate-100 rounded-lg text-[9px] font-mono text-slate-500 overflow-x-auto">
                                                    {JSON.stringify(a.newValues, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                    {(!selectedUser.auditLogs || selectedUser.auditLogs.length === 0) && (
                                        <span className="text-xs text-slate-400 text-center py-4 block">No audits logs recorded.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
            {/* EDIT SERVICE CONFIG MODAL */}
            <ClayModal
                isOpen={!!editingAdminService}
                onClose={() => setEditingAdminService(null)}
                title={`Edit Service Config: ${editingAdminService?.key}`}
            >
                <form 
                    onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                            const res = await api.put(`/api/v1/admin/services/${editingAdminService.id}`, serviceForm);
                            if (res.data.success) {
                                alert('Service updated successfully.');
                                setEditingAdminService(null);
                                fetchAdminServices();
                            }
                        } catch (err) {
                            alert(err.response?.data?.error || 'Failed to update service.');
                        }
                    }} 
                    className="flex flex-col gap-4 text-left font-sans"
                >
                    <ClayInput
                        label="Service Name *"
                        type="text"
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        required
                    />
                    <div className="w-full">
                        <label className="block text-xs font-semibold text-slate-700 mb-2 font-display ml-1">Service Description</label>
                        <textarea
                            className="w-full bg-white text-slate-900 rounded-[16px] p-4 border border-slate-350 shadow-sm outline-none text-xs focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                            rows="3"
                            value={serviceForm.description}
                            onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                        />
                    </div>
                    <ClayInput
                        label="Usage Fee / Price (e.g. ₹1.00) *"
                        type="text"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                        required
                    />
                    <ClayInput
                        label="Activation Fee (₹) *"
                        type="number"
                        step="0.01"
                        value={serviceForm.activationFee}
                        onChange={(e) => setServiceForm({ ...serviceForm, activationFee: e.target.value })}
                        required
                    />
                    <div className="flex flex-wrap gap-3 justify-end mt-2 overflow-visible">
                        <ClayButton variant="secondary" onClick={() => setEditingAdminService(null)}>
                            Cancel
                        </ClayButton>
                        <ClayButton type="submit" variant="primary">
                            Save Changes
                        </ClayButton>
                    </div>
                </form>
            </ClayModal>
        </div>
    );
}





