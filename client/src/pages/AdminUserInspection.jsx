import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ClayCard, ClayButton, ClayBadge, ClayTable, ClayTabs } from '../components/Claymorphic';
import { 
  User, Shield, Calendar, Mail, Phone, MapPin, 
  CreditCard, Key, Radio, Terminal, FileText, CheckCircle2, 
  Clock, ArrowLeft, Wallet, AlertCircle, LifeBuoy, History
} from 'lucide-react';

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

export default function AdminUserInspection() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Pagination states for nested lists
  const [ledgerPage, setLedgerPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/admin/users/${id}`);
      if (res.data.success) {
        setUserData(res.data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      alert('Failed to load user inspection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-semibold text-slate-500">Retrieving user administration context...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-8 text-center border border-slate-200 rounded-[24px] bg-white flex flex-col items-center gap-4 text-left max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h4 className="text-lg font-bold text-slate-900">User Not Found</h4>
        <p className="text-xs text-slate-500">The requested user does not exist or has been deleted.</p>
        <ClayButton variant="secondary" onClick={() => navigate('/admin/kyc')} className="px-6 py-2 text-xs">
          Back to KYC Management
        </ClayButton>
      </div>
    );
  }

  const isApproved = userData.kycStatus === 'KYC_APPROVED' || userData.kycStatus === 'APPROVED';
  
  // Mask helper
  const maskAadhaar = (num) => {
    if (!num) return '—';
    return num; // Masked is already stored on backend as masked, but let's be safe
  };

  const maskPan = (num) => {
    if (!num) return '—';
    if (num.length >= 10) {
      return `${num.substring(0, 5)}****${num.slice(-1)}`;
    }
    return num;
  };

  // Pagination slices
  const transactions = userData.Wallet?.transactions || [];
  const paginatedLedgers = transactions.slice((ledgerPage - 1) * itemsPerPage, ledgerPage * itemsPerPage);
  
  const requests = userData.verificationRequests || [];
  const paginatedRequests = requests.slice((requestPage - 1) * itemsPerPage, requestPage * itemsPerPage);
  
  const auditLogs = userData.auditLogs || [];
  const paginatedAudits = auditLogs.slice((auditPage - 1) * itemsPerPage, auditPage * itemsPerPage);

  const tabs = [
    { id: 'profile', label: 'User Profile' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'wallet', label: 'Wallet & Ledgers' },
    { id: 'keys', label: 'API Keys' },
    { id: 'verifications', label: 'Verification History' },
    { id: 'audit', label: 'Audit Logs' }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16 animate-fade-in font-sans text-left">
      
      {/* Back button */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate('/admin/kyc')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to KYC Management
        </button>
      </div>

      {/* Hero Header Block */}
      <ClayCard className="overflow-hidden border border-slate-200 shadow-sm relative rounded-[24px] bg-white p-0">
        <div className="h-28 w-full bg-gradient-to-r from-slate-800 to-indigo-900 relative opacity-90" />
        <div className="px-6 pb-6 pt-0 flex flex-col md:flex-row gap-6 items-end -mt-12 relative z-10">
          
          <div className="w-24 h-28 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
            <img 
              src={getPhotoSrc(userData.aadhaarPhotoUrl)} 
              alt="Aadhaar Avatar" 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"; }}
            />
          </div>

          <div className="flex-1 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{userData.name || 'Anonymous User'}</h1>
              <ClayBadge status={isApproved ? 'ACTIVE' : 'PENDING'}>
                {userData.kycStatus.replace(/_/g, ' ')}
              </ClayBadge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {userData.email}
              <span className="text-slate-300">|</span>
              <Shield className="w-3.5 h-3.5 text-indigo-600" /> {userData.role?.name || 'Client User'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              User ID: #{userData.id} | Joined: {new Date(userData.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </ClayCard>

      {/* Tabs navigation */}
      <div className="flex justify-start">
        <ClayTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* TAB CONTENT RESOLVER */}
      <div className="mt-2">
        
        {/* 1. PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Identity Card */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-violet-600" /> Personal Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Name</span>
                    <strong className="text-slate-800 text-sm">{userData.name || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Father's Name</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarFatherName || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Birth</span>
                    <strong className="text-slate-800 text-sm font-mono">{userData.aadhaarDob || userData.dateOfBirth || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Gender</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarGender || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contact Email</span>
                    <strong className="text-slate-800 text-sm font-mono">{userData.email || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contact Phone</span>
                    <strong className="text-slate-800 text-sm font-mono">{userData.phone || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Aadhaar Phone</span>
                    <strong className="text-slate-800 text-sm font-mono">{userData.phoneNumber || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Verified Aadhaar Photo Section */}
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-600" /> Verified Aadhaar Photo
                </h3>
                <div className="flex flex-col sm:flex-row gap-5 items-center">
                  <div className="w-24 h-28 bg-slate-50 rounded-xl border border-slate-200 p-1.5 shadow-sm relative overflow-hidden flex items-center justify-center shrink-0">
                    <img 
                      src={getPhotoSrc(userData.aadhaarPhotoUrl)} 
                      alt="Verified Aadhaar User" 
                      className="w-full h-full object-cover"
                      onError={(e) => { 
                        e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"; 
                      }}
                    />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="text-xs font-bold text-slate-800">Verified Aadhaar Photo Portrait</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Official biometric profile photograph registered under Aadhaar card system. Retrieved directly from UIDAI verified provider logs.
                    </p>
                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Verified Aadhaar User
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aadhaar Details Card */}
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Aadhaar Verification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Aadhaar Name</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarName || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Aadhaar Number</span>
                    <strong className="text-slate-800 text-sm font-mono">{maskAadhaar(userData.aadhaarNumberMasked)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Verification Status</span>
                    <ClayBadge status={userData.aadhaarVerified ? 'ACTIVE' : 'PENDING'}>
                      {userData.aadhaarVerified ? 'VERIFIED' : 'PENDING'}
                    </ClayBadge>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Verification Date</span>
                    <strong className="text-slate-800 text-sm font-mono">
                      {userData.aadhaarVerifiedAt ? new Date(userData.aadhaarVerifiedAt).toLocaleString() : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Village / Town</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarVillage || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">District</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarDistrict || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">State</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarState || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pincode</span>
                    <strong className="text-slate-800 text-sm font-mono">{userData.aadhaarPincode || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Country</span>
                    <strong className="text-slate-800 text-sm">{userData.aadhaarCountry || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* PAN Card Details */}
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> PAN Card Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">PAN Name</span>
                    <strong className="text-slate-800 text-sm">{userData.panName || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PAN Number</span>
                    <strong className="text-slate-800 text-sm font-mono">{maskPan(userData.panNumber)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PAN Verification Status</span>
                    <ClayBadge status={userData.panVerified ? 'ACTIVE' : 'PENDING'}>
                      {userData.panVerified ? 'VERIFIED' : 'PENDING'}
                    </ClayBadge>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Verification Date</span>
                    <strong className="text-slate-800 text-sm font-mono">
                      {userData.panVerifiedAt ? new Date(userData.panVerifiedAt).toLocaleString() : '—'}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Address and Milestones */}
            <div className="flex flex-col gap-6">
              
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> Aadhaar Address
                </h3>
                <p className="text-xs text-slate-700 font-semibold bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed">
                  {userData.aadhaarAddress || 'No address logged.'}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" /> KYC Status Details
                </h3>
                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">KYC Status</span>
                    <span className="font-bold text-slate-850">{userData.kycStatus}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">KYC Level</span>
                    <span className="font-bold text-slate-850">{userData.kycLevel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Approved At</span>
                    <span className="font-mono text-slate-700">
                      {userData.kycApprovedAt ? new Date(userData.kycApprovedAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Rejected At</span>
                    <span className="font-mono text-slate-700">
                      {userData.kycRejectedAt ? new Date(userData.kycRejectedAt).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. SUBSCRIPTIONS TAB */}
        {activeTab === 'subscriptions' && (
          <ClayCard className="border border-slate-200 shadow-sm rounded-[24px] bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-violet-600" /> UserServiceSubscriptions
            </h3>
            {userData.subscriptions && userData.subscriptions.length > 0 ? (
              <ClayTable headers={['Service Code', 'Service Name', 'Category', 'Status', 'Activated At', 'Expires At', 'Purchase Fee']}>
                {userData.subscriptions.map((sub) => (
                  <tr key={`user-sub-${sub.id}`} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{sub.service?.key || '—'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-750">{sub.service?.name || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{sub.service?.category || '—'}</td>
                    <td className="px-6 py-4">
                      <ClayBadge status={sub.status}>{sub.status}</ClayBadge>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {new Date(sub.activatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'Lifetime'}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      ₹ {parseFloat(sub.purchaseAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </ClayTable>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No subscriptions found for this user.</p>
            )}
          </ClayCard>
        )}

        {/* 3. WALLET TAB */}
        {activeTab === 'wallet' && (
          <div className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-3 justify-center text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Wallet Balance</span>
                <strong className="text-3xl font-bold font-mono tracking-tight text-emerald-600">
                  ₹ {parseFloat(userData.Wallet?.balance || 0).toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-400 font-medium">Currency: {userData.Wallet?.currency || 'INR'}</span>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-3 justify-center text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Last Balance Modification</span>
                <strong className="text-lg font-bold font-mono text-slate-700">
                  {userData.Wallet?.lastRechargedAt ? new Date(userData.Wallet.lastRechargedAt).toLocaleString() : 'Never'}
                </strong>
                <span className="text-[10px] text-slate-400 font-medium">Auto-updated on ledger postings</span>
              </div>
            </div>

            <ClayCard className="border border-slate-200 shadow-sm rounded-[24px] bg-white p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
                <Wallet className="w-4 h-4 text-violet-600" /> Wallet Ledger Entries (Transactions)
              </h3>
              {transactions.length > 0 ? (
                <>
                  <ClayTable headers={['Ledger ID', 'Type', 'Amount', 'Reference Code', 'Reference Type', 'Description', 'Status', 'Timestamp']}>
                    {paginatedLedgers.map((l) => (
                      <tr key={`ledger-${l.id}`} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900"># {l.id}</td>
                        <td className="px-6 py-4 font-bold">
                          <span className={l.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-500'}>
                            {l.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          ₹ {parseFloat(l.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">{l.referenceId || '—'}</td>
                        <td className="px-6 py-4 text-slate-600">{l.referenceType || '—'}</td>
                        <td className="px-6 py-4 text-slate-650 font-medium">{l.description || '—'}</td>
                        <td className="px-6 py-4">
                          <ClayBadge status={l.status}>{l.status}</ClayBadge>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">
                          {new Date(l.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </ClayTable>
                  
                  {/* Pagination Controls */}
                  {transactions.length > itemsPerPage && (
                    <div className="flex justify-between items-center mt-4">
                      <button 
                        disabled={ledgerPage === 1}
                        onClick={() => setLedgerPage(prev => Math.max(1, prev - 1))}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-xs text-slate-500 font-semibold font-mono">
                        Page {ledgerPage} of {Math.ceil(transactions.length / itemsPerPage)}
                      </span>
                      <button 
                        disabled={ledgerPage >= Math.ceil(transactions.length / itemsPerPage)}
                        onClick={() => setLedgerPage(prev => prev + 1)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">No ledger entries registered.</p>
              )}
            </ClayCard>
          </div>
        )}

        {/* 4. API KEYS TAB */}
        {activeTab === 'keys' && (
          <ClayCard className="border border-slate-200 shadow-sm rounded-[24px] bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-violet-600" /> Active API Access Credentials
            </h3>
            {userData.apiKeys && userData.apiKeys.length > 0 ? (
              <ClayTable headers={['Key Name', 'Masked Key', 'Permissions', 'Rate Limit', 'Usage Count', 'Status', 'IP Whitelist', 'Created At']}>
                {userData.apiKeys.map((k) => (
                  <tr key={`api-key-${k.id}`} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{k.name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 font-semibold">{k.keyMasked || '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-violet-600 font-bold">
                      {Array.isArray(k.permissions) ? k.permissions.join(', ') : JSON.stringify(k.permissions || '*')}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold font-mono">{k.rateLimit} req/min</td>
                    <td className="px-6 py-4 text-slate-600 font-bold font-mono">{k.usageCount}</td>
                    <td className="px-6 py-4">
                      <ClayBadge status={k.status}>{k.status}</ClayBadge>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-[10px]">
                      {k.ipWhitelist ? (Array.isArray(k.ipWhitelist) ? k.ipWhitelist.join(', ') : JSON.stringify(k.ipWhitelist)) : 'None'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </ClayTable>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No API keys generated.</p>
            )}
          </ClayCard>
        )}

        {/* 5. VERIFICATIONS TAB */}
        {activeTab === 'verifications' && (
          <ClayCard className="border border-slate-200 shadow-sm rounded-[24px] bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-violet-600" /> Verification Request Audit History
            </h3>
            {requests.length > 0 ? (
              <>
                <ClayTable headers={['Request ID', 'Service Type', 'Cost Charged', 'Status', 'IP Source', 'Provider Code', 'Response Status', 'Timestamp']}>
                  {paginatedRequests.map((r) => (
                    <tr key={`verification-${r.id}`} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono text-slate-500 font-bold truncate max-w-[120px]">{r.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{r.serviceType}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                        ₹ {parseFloat(r.cost || 0).toFixed(4)}
                      </td>
                      <td className="px-6 py-4">
                        <ClayBadge status={r.status}>{r.status}</ClayBadge>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">{r.ipAddress || '—'}</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{r.provider?.name || '—'}</td>
                      <td className="px-6 py-4">
                        {r.response?.errorCode ? (
                          <span className="text-red-500 font-bold font-mono text-[10px]">{r.response.errorCode}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">SUCCESS (200)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </ClayTable>
                
                {/* Pagination Controls */}
                {requests.length > itemsPerPage && (
                  <div className="flex justify-between items-center mt-4">
                    <button 
                      disabled={requestPage === 1}
                      onClick={() => setRequestPage(prev => Math.max(1, prev - 1))}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-500 font-semibold font-mono">
                      Page {requestPage} of {Math.ceil(requests.length / itemsPerPage)}
                    </span>
                    <button 
                      disabled={requestPage >= Math.ceil(requests.length / itemsPerPage)}
                      onClick={() => setRequestPage(prev => prev + 1)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No verification transactions recorded.</p>
            )}
          </ClayCard>
        )}

        {/* 6. AUDIT TAB */}
        {activeTab === 'audit' && (
          <ClayCard className="border border-slate-200 shadow-sm rounded-[24px] bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-violet-600" /> Administrative Action Audit Trail
            </h3>
            {auditLogs.length > 0 ? (
              <>
                <ClayTable headers={['Audit Log ID', 'Action', 'Entity Table', 'Target Entity ID', 'Changes Logged', 'IP Address', 'User Agent', 'Timestamp']}>
                  {paginatedAudits.map((a) => (
                    <tr key={`audit-log-${a.id}`} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-slate-900"># {a.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{a.action}</td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">{a.entityName || '—'}</td>
                      <td className="px-6 py-4 font-mono text-slate-550 font-semibold">{a.entityId || '—'}</td>
                      <td className="px-6 py-4 max-w-[240px] truncate text-[10px] text-slate-500 font-mono">
                        {a.newValues ? JSON.stringify(a.newValues) : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">{a.ipAddress || '—'}</td>
                      <td className="px-6 py-4 text-[10px] text-slate-450 truncate max-w-[120px]">{a.userAgent || '—'}</td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </ClayTable>
                
                {/* Pagination Controls */}
                {auditLogs.length > itemsPerPage && (
                  <div className="flex justify-between items-center mt-4">
                    <button 
                      disabled={auditPage === 1}
                      onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-500 font-semibold font-mono">
                      Page {auditPage} of {Math.ceil(auditLogs.length / itemsPerPage)}
                    </span>
                    <button 
                      disabled={auditPage >= Math.ceil(auditLogs.length / itemsPerPage)}
                      onClick={() => setAuditPage(prev => prev + 1)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No administrative actions logged.</p>
            )}
          </ClayCard>
        )}

      </div>

    </div>
  );
}
