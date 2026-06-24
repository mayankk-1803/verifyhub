import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ClayCard, ClayButton, ClayInput, ClayDropdown, ClayBadge, ClayModal } from '../components/Claymorphic';
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
  Shield, Users, Search, Filter, Check, X, AlertTriangle, 
  RotateCcw, Eye, Clock, Calendar, Mail, Phone, MapPin, 
  UserCheck, UserX, UserMinus, ArrowLeftRight
} from 'lucide-react';
import VirtualList from '../components/VirtualList';

export default function AdminKycManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, approvalRate: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Drawer
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchKycRequests = async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'all' ? '' : statusFilter;
      const res = await api.get(`/api/v1/admin/kyc?status=${statusParam}&search=${searchQuery}&sortBy=${sortBy}`);
      setUsers(res.data.users || []);
      if (res.data.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load KYC requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchKycRequests();
  }, [statusFilter, sortBy, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchKycRequests();
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Are you sure you want to manually APPROVE this KYC?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/admin/kyc/${userId}/approve`, { remarks });
      alert('KYC manually approved successfully.');
      setRemarks('');
      setIsDrawerOpen(false);
      setSelectedUser(null);
      fetchKycRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId) => {
    if (!remarks) {
      alert('Remarks are required for KYC rejection.');
      return;
    }
    if (!window.confirm('Are you sure you want to manually REJECT this KYC?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/admin/kyc/${userId}/reject`, { remarks });
      alert('KYC manually rejected successfully.');
      setRemarks('');
      setIsDrawerOpen(false);
      setSelectedUser(null);
      fetchKycRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (userId) => {
    if (!remarks) {
      alert('Remarks are required for KYC suspension.');
      return;
    }
    if (!window.confirm('Are you sure you want to manually SUSPEND this user KYC?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/admin/kyc/${userId}/suspend`, { remarks });
      alert('KYC manually suspended successfully.');
      setRemarks('');
      setIsDrawerOpen(false);
      setSelectedUser(null);
      fetchKycRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Suspension failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReverification = async (userId) => {
    if (!remarks) {
      alert('Remarks are required for KYC reverification.');
      return;
    }
    if (!window.confirm('Are you sure you want to request RE-VERIFICATION?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/admin/kyc/${userId}/reverify`, { remarks });
      alert('KYC reverification requested successfully.');
      setRemarks('');
      setIsDrawerOpen(false);
      setSelectedUser(null);
      fetchKycRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openUserDrawer = async (user) => {
    try {
      const res = await api.get(`/api/v1/admin/kyc/${user.id}`);
      setSelectedUser(res.data);
      setIsDrawerOpen(true);
    } catch (err) {
      alert('Failed to retrieve full user KYC details.');
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-16 animate-fade-in font-sans text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-600" /> Platform KYC Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">Verify, approve, reject, or suspend user KYC milestones.</p>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', val: metrics.total, color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Pending KYC', val: metrics.pending, color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200' },
          { label: 'Approved KYC', val: metrics.approved, color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-250' },
          { label: 'Approval Rate', val: `${metrics.approvalRate}%`, color: 'text-violet-600', bg: 'bg-violet-50/30 border-violet-200' }
        ].map((m, idx) => (
          <div key={`kyc-metric-${idx}`} className={`p-4 border rounded-[20px] bg-white flex flex-col gap-1 shadow-sm ${m.bg}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{m.label}</span>
            <strong className={`text-xl font-bold font-mono tracking-tight ${m.color}`}>{m.val}</strong>
          </div>
        ))}
      </div>

      {/* FILTER & SEARCH PANEL */}
      <ClayCard className="p-4 border border-slate-250 bg-white shadow-sm rounded-[20px]">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 items-center w-full justify-between">
          <div className="flex flex-1 gap-2 w-full max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search user name, email, phone, PAN, Aadhaar..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-250 rounded-full text-xs font-semibold font-sans bg-slate-50 focus:bg-white focus:border-violet-600 outline-none transition-all"
            />
            <button type="submit" className="hidden" />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0 justify-end">
            <div className="flex gap-1 items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
              {[
                { id: 'all', label: 'All Users' },
                { id: 'pending', label: 'Pending' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 ${
                    statusFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ClayDropdown 
              options={[
                { label: 'Newest First', value: 'newest' },
                { label: 'Oldest First', value: 'oldest' },
                { label: 'Approved Date', value: 'approved' },
                { label: 'Rejected Date', value: 'rejected' },
                { label: 'Last Updated', value: 'last_updated' }
              ]}
              selected={sortBy}
              onChange={setSortBy}
              className="text-xs h-[32px] rounded-full border-slate-200"
            />
          </div>
        </form>
      </ClayCard>

      {/* KYC TABLE LIST */}
      <ClayCard className="border border-slate-200 shadow-sm rounded-[24px] bg-white p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs font-bold text-slate-400">Loading KYC requests list...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-2">
            <Shield className="w-12 h-12 text-slate-200" />
            <span className="text-xs font-bold">No KYC requests matched your filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-[1280px] w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  <th className="px-6 py-4 min-w-[150px]">User</th>
                  <th className="px-6 py-4 min-w-[260px]">Email</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4 min-w-[150px]">Aadhaar Status</th>
                  <th className="px-6 py-4 min-w-[130px]">PAN Status</th>
                  <th className="px-6 py-4 min-w-[180px]">Verification Status</th>
                  <th className="px-6 py-4">Approval Date</th>
                  <th className="px-6 py-4 text-right min-w-[150px] sticky right-0 z-10 bg-slate-50/95 shadow-[-16px_0_24px_-24px_rgba(15,23,42,0.55)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isApproved = user.kycStatus === 'KYC_APPROVED' || user.kycStatus === 'APPROVED';
                  const isRejected = user.kycStatus === 'KYC_REJECTED' || user.kycStatus === 'REJECTED';
                  const isPending = user.kycStatus === 'PENDING_KYC';
                  const aadhaarVerified = Boolean(user.aadhaarVerified || user.aadhaarVerifiedAt);
                  const panVerified = Boolean(user.panVerified || user.panVerifiedAt);
                  
                  return (
                    <tr key={`user-row-${user.id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td 
                        className="px-6 py-4 font-bold text-slate-900 hover:text-violet-650 hover:underline cursor-pointer text-left" 
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        {user.name || '—'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600 font-mono">{user.email || '—'}</td>
                      <td className="px-6 py-4 font-medium text-slate-600 font-mono">{user.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <ClayBadge status={aadhaarVerified ? 'ACTIVE' : 'WARNING'}>
                          {aadhaarVerified ? 'VERIFIED' : 'PENDING'}
                        </ClayBadge>
                      </td>
                      <td className="px-6 py-4">
                        <ClayBadge status={panVerified ? 'ACTIVE' : 'WARNING'}>
                          {panVerified ? 'VERIFIED' : 'PENDING'}
                        </ClayBadge>
                      </td>
                      <td className="px-6 py-4">
                        <ClayBadge status={isApproved ? 'ACTIVE' : (isRejected ? 'DANGER' : 'WARNING')}>
                          {user.kycStatus.replace(/_/g, ' ')}
                        </ClayBadge>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-400 font-mono">
                        {user.kycApprovedAt ? new Date(user.kycApprovedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right sticky right-0 z-10 bg-white shadow-[-16px_0_24px_-24px_rgba(15,23,42,0.55)]">
                        <button
                          type="button"
                          onClick={() => openUserDrawer(user)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3.5 text-[11px] font-bold text-violet-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ClayCard>

      {/* KYC USER INSPECTOR SLIDE DRAWER */}
      {isDrawerOpen && selectedUser && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => { setIsDrawerOpen(false); setSelectedUser(null); }}
          />

          <div 
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out overflow-hidden"
            style={{ height: '100dvh', top: 0, bottom: 0 }}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="flex flex-col">
                <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-600" /> KYC Application Audit Record
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedUser.email || selectedUser.phone}</p>
              </div>
              <button 
                onClick={() => { setIsDrawerOpen(false); setSelectedUser(null); }}
                className="w-8 h-8 rounded-full border border-slate-250 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors font-semibold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-full">
              
              {/* Profile Card & Avatar */}
              <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <img 
                  src={getPhotoSrc(selectedUser.aadhaarPhotoUrl || selectedUser.aadhaarPhoto)} 
                  alt="Aadhaar Avatar" 
                  className="w-24 h-28 object-cover rounded-xl border border-slate-250 shadow-sm shrink-0"
                  onError={(e) => { e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"; }}
                />
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full text-left">
                  <div><span className="text-slate-500 block">Name</span> <strong className="text-slate-900 text-sm">{selectedUser.name || '—'}</strong></div>
                  <div><span className="text-slate-500 block">Email</span> <strong className="text-slate-900 text-sm font-mono">{selectedUser.email || '—'}</strong></div>
                  <div><span className="text-slate-500 block">Phone</span> <strong className="text-slate-900 text-sm font-mono">{selectedUser.phone || '—'}</strong></div>
                  <div><span className="text-slate-500 block">KYC Status</span> <ClayBadge status={selectedUser.kycStatus === 'KYC_APPROVED' ? 'ACTIVE' : 'WARNING'}>{selectedUser.kycStatus}</ClayBadge></div>
                </div>
              </div>

              {/* Aadhaar Details */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-150 pb-2">Aadhaar Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div><span className="text-slate-500">Aadhaar Name:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarName || '—'}</span></div>
                  <div><span className="text-slate-500">Masked Aadhaar:</span> <span className="font-mono font-semibold text-slate-800">{selectedUser.aadhaarNumberMasked || '—'}</span></div>
                  <div><span className="text-slate-500">Father's Name:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarFatherName || '—'}</span></div>
                  <div><span className="text-slate-500">Date of Birth:</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.aadhaarDob || '—'}</span></div>
                  <div><span className="text-slate-500">Gender:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarGender || '—'}</span></div>
                  <div><span className="text-slate-500">Aadhaar Mobile:</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.phoneNumber || '—'}</span></div>
                  <div><span className="text-slate-500">Village/Town:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarVillage || '—'}</span></div>
                  <div><span className="text-slate-500">District:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarDistrict || '—'}</span></div>
                  <div><span className="text-slate-500">State:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarState || '—'}</span></div>
                  <div><span className="text-slate-500">Pincode:</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.aadhaarPincode || '—'}</span></div>
                  <div><span className="text-slate-500">Country:</span> <span className="font-semibold text-slate-800">{selectedUser.aadhaarCountry || '—'}</span></div>
                  <div><span className="text-slate-500">Verified Date:</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.aadhaarVerifiedAt ? new Date(selectedUser.aadhaarVerifiedAt).toLocaleString() : 'Not Verified'}</span></div>
                  <div><span className="text-slate-500">Approval Date:</span> <span className="font-semibold text-slate-800 font-mono">{selectedUser.kycApprovedAt ? new Date(selectedUser.kycApprovedAt).toLocaleString() : '—'}</span></div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-150 pb-2">Permanent Address Details</h3>
                <div className="text-xs font-semibold text-slate-800 leading-relaxed bg-white border border-slate-150 p-3 rounded-lg">
                  {selectedUser.aadhaarAddress || '—'}
                </div>
              </div>

              {/* PAN Details */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-150 pb-2">PAN Card Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div><span className="text-slate-500">PAN Number:</span> <span className="font-mono font-semibold text-slate-800">{selectedUser.panNumber || '—'}</span></div>
                  <div><span className="text-slate-500">PAN Name:</span> <span className="font-semibold text-slate-800">{selectedUser.panName || '—'}</span></div>
                  <div><span className="text-slate-500">PAN Verification Date:</span> <span className="font-mono font-semibold text-slate-800">{selectedUser.panVerifiedAt ? new Date(selectedUser.panVerifiedAt).toLocaleDateString() : '—'}</span></div>
                </div>
              </div>

              {/* KYC Timeline */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-150 pb-2">KYC Verification Audit Timeline</h3>
                <div className="flex flex-col gap-4 pl-4 border-l border-slate-200 relative ml-2 mt-2">
                  <div className="relative text-xs">
                    <span className="absolute -left-[24px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-50"><Check className="w-2.5 h-2.5" /></span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-850">Account Created</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(selectedUser.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedUser.aadhaarVerifiedAt && (
                    <div className="relative text-xs">
                      <span className="absolute -left-[24px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-50"><Check className="w-2.5 h-2.5" /></span>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-850">Aadhaar Verified</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(selectedUser.aadhaarVerifiedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {selectedUser.kycApprovedAt && (
                    <div className="relative text-xs">
                      <span className="absolute -left-[24px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-50"><Check className="w-2.5 h-2.5" /></span>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-850">KYC Approved</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(selectedUser.kycApprovedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Audit History Logs */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-150 pb-2">Administrative Action Trail</h3>
                {selectedUser.timeline && selectedUser.timeline.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {selectedUser.timeline.map((log) => (
                      <div key={`timeline-${log.id}`} className="text-xs border-b border-slate-100 pb-2 flex justify-between items-start gap-4">
                        <div className="flex flex-col text-left">
                          <strong className="text-slate-850">{log.description}</strong>
                          <span className="text-[10px] text-slate-450 mt-0.5">{log.newValues?.remarks || 'No remarks recorded.'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 italic">No administrative logs recorded.</span>
                )}
              </div>

            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-slate-150 bg-slate-50/50 flex flex-col gap-4">
              <div className="w-full">
                <ClayInput
                  label="Administrative Audit Remarks (Required for actions)"
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide audit remarks or rejection reasons..."
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end w-full">
                <ClayButton 
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setSelectedUser(null);
                    navigate(`/admin/users/${selectedUser.id}`);
                  }}
                  className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs px-3.5 py-2 flex items-center gap-1.5 h-[36px]"
                >
                  <Eye className="w-4 h-4" /> Inspect Account
                </ClayButton>
                <ClayButton 
                  onClick={() => handleRequestReverification(selectedUser.id)}
                  disabled={actionLoading}
                  className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs px-3.5 py-2 flex items-center gap-1.5 h-[36px]"
                >
                  <RotateCcw className="w-4 h-4" /> Reverification
                </ClayButton>
                <ClayButton 
                  onClick={() => handleSuspend(selectedUser.id)}
                  disabled={actionLoading}
                  className="border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs px-3.5 py-2 flex items-center gap-1.5 h-[36px]"
                >
                  <UserMinus className="w-4 h-4" /> Suspend
                </ClayButton>
                <ClayButton 
                  onClick={() => handleReject(selectedUser.id)}
                  disabled={actionLoading}
                  className="border-red-200 text-white bg-red-600 hover:bg-red-750 text-xs px-3.5 py-2 flex items-center gap-1.5 h-[36px]"
                >
                  <UserX className="w-4 h-4" /> Reject KYC
                </ClayButton>
                <ClayButton 
                  onClick={() => handleApprove(selectedUser.id)}
                  disabled={actionLoading}
                  className="border-emerald-600 text-white bg-emerald-600 hover:bg-emerald-750 text-xs px-3.5 py-2 flex items-center gap-1.5 h-[36px]"
                >
                  <UserCheck className="w-4 h-4" /> Approve KYC
                </ClayButton>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}

