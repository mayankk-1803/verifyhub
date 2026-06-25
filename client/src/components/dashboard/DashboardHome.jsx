import toast from '../../lib/toast.jsx';
import React, { useState } from 'react';
import { Wallet as WalletIcon, Terminal, CheckCircle2, Key, AlertTriangle, Play, RefreshCw, Eye } from 'lucide-react';
import { ClayWidget, ClayBadge, ClayTable, ClayCard, ClayButton } from '../Claymorphic';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

export default function DashboardHome({ balance, stats, apiKeys, transactions, user, setActiveTab }) {
  const activeKeysCount = apiKeys.filter(k => k.status === 'ACTIVE').length;
  const navigate = useNavigate();
  const [retryLoading, setRetryLoading] = useState(false);

  const currentKycStatus = user?.kycStatus || 'PENDING_KYC';
  const roleKey = String(user?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const isAdmin = user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';
  const isApproved = currentKycStatus === 'KYC_APPROVED' || currentKycStatus === 'APPROVED' || isAdmin;

  const getKycProgress = () => {
    const status = user?.kycStatus || 'PENDING_KYC';
    const level = user?.kycLevel || 'PENDING_KYC';
    if (status === 'KYC_APPROVED' || status === 'APPROVED' || level === 'AADHAAR_VERIFIED') return 100;
    if (status === 'AADHAAR_OTP_SENT' || level === 'AADHAAR_OTP_SENT') return 50;
    return 0;
  };

  const getKycStatusLabel = () => {
    switch (currentKycStatus) {
      case 'PENDING_KYC': return 'PENDING KYC';
      case 'AADHAAR_OTP_SENT': return 'AADHAAR OTP SENT';
      case 'AADHAAR_VERIFIED': return 'AADHAAR VERIFIED';
      case 'KYC_APPROVED':
      case 'APPROVED': return 'KYC APPROVED';
      case 'KYC_REJECTED':
      case 'REJECTED': return 'KYC REJECTED';
      default: return currentKycStatus.replace(/_/g, ' ');
    }
  };

  const getKycColor = () => {
    if (isApproved) return 'bg-emerald-500';
    if (currentKycStatus === 'KYC_REJECTED' || currentKycStatus === 'REJECTED') return 'bg-rose-500';
    if (currentKycStatus === 'AADHAAR_OTP_SENT') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleRetryKyc = async () => {
    setRetryLoading(true);
    try {
      const res = await api.post('/api/v1/kyc/retry');
      if (res.data.success) {
        useAuthStore.getState().updateKycState({
          kycStatus: 'PENDING_KYC',
          kycLevel: 'PENDING_KYC',
          aadhaarVerified: false,
          aadhaarNumberMasked: null,
          aadhaarName: null,
          aadhaarDob: null,
          aadhaarGender: null,
          aadhaarAddress: null,
          aadhaarPhotoUrl: null
        });
        navigate('/kyc');
      }
    } catch (err) {
      console.error('Failed to retry KYC:', err);
      toast.info(err.response?.data?.error || 'Failed to restart KYC.');
    } finally {
      setRetryLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Premium KYC Status Widget */}
      <ClayCard className="p-6 border border-slate-200 bg-white/95 rounded-[24px] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-left">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-slate-900 font-display">KYC Identity Verification Status</h4>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              isApproved 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : currentKycStatus === 'KYC_REJECTED' || currentKycStatus === 'REJECTED'
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              {getKycStatusLabel()}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-500 ${getKycColor()}`}
              style={{ width: `${getKycProgress()}%` }}
            />
          </div>

          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-2 font-display uppercase tracking-wider font-sans">
            <span>Pending KYC (0%)</span>
            <span>Aadhaar OTP Sent (50%)</span>
            <span>KYC Approved (100%)</span>
          </div>
        </div>

        {/* Action Buttons: hidden after approval */}
        {!isApproved && (
          <div className="shrink-0 w-full md:w-auto flex flex-wrap gap-3 justify-end">
            {(currentKycStatus === 'KYC_REJECTED' || currentKycStatus === 'REJECTED') ? (
              <ClayButton 
                variant="danger" 
                onClick={handleRetryKyc} 
                disabled={retryLoading}
                className="py-2.5 px-6 font-bold text-xs bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5 shadow-md shadow-rose-500/10 rounded-full"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? 'animate-spin' : ''}`} /> Retry KYC
              </ClayButton>
            ) : (
              <>
                <ClayButton 
                  variant="secondary" 
                  onClick={() => navigate('/kyc')}
                  className="py-2.5 px-6 font-bold text-xs border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 rounded-full"
                >
                  <Eye className="w-3.5 h-3.5" /> View Status
                </ClayButton>
                <ClayButton 
                  variant="primary" 
                  onClick={() => navigate('/kyc')}
                  className="py-2.5 px-6 font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-md shadow-emerald-500/15 rounded-full"
                >
                  <Play className="w-3.5 h-3.5" /> Complete KYC
                </ClayButton>
              </>
            )}
          </div>
        )}
      </ClayCard>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ClayWidget title="Wallet Balance" value={`₹${parseFloat(balance).toFixed(2)}`} icon={WalletIcon} color="accent" className="cv-metric-card" />
        <ClayWidget title="Avg API Latency" value={`${stats?.avgLatencyMs ?? stats?.avgLatency ?? 0} ms`} icon={Terminal} color="secondary" className="cv-metric-card" />
        <ClayWidget title="API Success Rate" value={`${stats?.successRate ?? 0}%`} icon={CheckCircle2} color="accent" className="cv-metric-card" />
        <ClayWidget title="Active Keys" value={activeKeysCount} icon={Key} color="primary" className="cv-metric-card" />
      </div>

      {/* Summary details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Transactions Ledger */}
        <div className="lg:col-span-8 flex flex-col gap-4 text-left w-full overflow-hidden">
          <h3 className="text-lg font-bold font-display text-slate-900">Recent Ledger Activity</h3>
          {transactions.length === 0 ? (
            <div className="p-12 text-center border border-slate-200 bg-white rounded-[24px] shadow-sm flex flex-col items-center justify-center gap-4 text-slate-700">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <WalletIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <span className="text-sm font-bold text-slate-900">No transactions yet</span>
                <span className="text-xs text-slate-500">Self-service wallet top-ups are currently locked.</span>
              </div>
              <ClayButton variant="secondary" className="py-2 px-5 text-xs mt-2" onClick={() => setActiveTab('wallet')}>
                View Wallet Billing
              </ClayButton>
            </div>
          ) : (
            <>
              {/* Desktop view ledger table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <ClayTable headers={['Type', 'Amount', 'Balance After', 'Reference Id', 'Date']}>
                  {transactions.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold">
                        <ClayBadge status={t.type === 'CREDIT' ? 'SUCCESS' : 'PENDING'}>{t.type}</ClayBadge>
                      </td>
                      <td className={`px-6 py-4 font-bold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'CREDIT' ? '+' : '-'}₹{parseFloat(t.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-800">₹{parseFloat(t.balanceAfter).toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono text-xs max-w-[120px] truncate text-slate-600">{t.referenceId}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </ClayTable>
              </div>

              {/* Mobile view ledger cards */}
              <div className="flex flex-col gap-4 md:hidden w-full">
                {transactions.slice(0, 5).map((t) => (
                  <ClayCard key={t.id} className="p-5 bg-white border border-slate-200 rounded-[20px] shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <ClayBadge status={t.type === 'CREDIT' ? 'SUCCESS' : 'PENDING'}>{t.type}</ClayBadge>
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Amount:</span>
                      <strong className={`font-bold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'CREDIT' ? '+' : '-'}₹{parseFloat(t.amount).toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Balance After:</span>
                      <span className="font-mono font-bold text-slate-800">₹{parseFloat(t.balanceAfter).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Ref ID:</span>
                      <span className="font-mono text-slate-600 truncate max-w-[165px]">{t.referenceId}</span>
                    </div>
                  </ClayCard>
                ))}
              </div>
            </>
          )}
        </div>

        {/* API status */}
        <div className="lg:col-span-4 flex flex-col gap-4 text-left">
          <h3 className="text-lg font-bold font-display text-slate-900">Workspace Details</h3>
          <ClayCard className="flex flex-col gap-4 bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">Primary Tenant</span>
              <span className="text-xs font-semibold text-slate-900 font-sans">Default Sandbox Org</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">Registered Email</span>
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[160px] font-sans">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">Role Permissions</span>
              {user?.role === 'Client User' ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  Client User
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {user?.role}
                </span>
              )}
            </div>
            <div className="w-full h-px bg-slate-100 my-2" />
            <ClayButton variant="secondary" onClick={() => setActiveTab('apis')} className="w-full py-2.5 text-xs">
              Open API Playground
            </ClayButton>
          </ClayCard>
        </div>
      </div>
    </div>
  );
}
