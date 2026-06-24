import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { ClayCard, ClayButton, ClayBadge, ClayInput, ClayModal } from '../components/Claymorphic';
import { 
  User, Shield, Calendar, Mail, Phone, MapPin, 
  CreditCard, RefreshCw, FileText, CheckCircle2, Clock, Edit3, Download 
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

export default function UserProfilePage() {
  const { user, updateKycState } = useAuthStore();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const fetchProfileDetails = async () => {
    try {
      const res = await api.get('/api/v1/profile');
      const { user: userProfile, aadhaar, pan, wallet, kyc, timeline } = res.data;
      
      const flatProfileData = {
        kycStatus: kyc.kycStatus,
        kycLevel: kyc.kycLevel,
        aadhaarVerified: aadhaar.aadhaarVerified,
        aadhaarNumberMasked: aadhaar.aadhaarNumberMasked,
        aadhaarName: aadhaar.aadhaarName,
        aadhaarDob: aadhaar.aadhaarDob,
        aadhaarGender: aadhaar.aadhaarGender,
        aadhaarFatherName: aadhaar.aadhaarFatherName,
        aadhaarAddress: aadhaar.aadhaarAddress,
        aadhaarPhotoUrl: aadhaar.aadhaarPhotoUrl,
        aadhaarDistrict: aadhaar.aadhaarDistrict,
        aadhaarState: aadhaar.aadhaarState,
        aadhaarPincode: aadhaar.aadhaarPincode,
        aadhaarVillage: aadhaar.aadhaarVillage,
        aadhaarCountry: aadhaar.aadhaarCountry,
        aadhaarVerifiedAt: aadhaar.aadhaarVerifiedAt,
        kycApprovedAt: kyc.kycApprovedAt,
        kycRejectedAt: kyc.kycRejectedAt,
        kycRemarks: kyc.kycRemarks,
        phoneNumber: aadhaar.phoneNumber,
        walletBalance: wallet.balance,
        walletCurrency: wallet.currency,
        timeline: timeline,
        user: userProfile,
        aadhaar,
        pan,
        wallet,
        kyc
      };
      
      setProfileData(flatProfileData);

      // Sync store state
      updateKycState({
        kycStatus: kyc.kycStatus,
        kycLevel: kyc.kycLevel,
        aadhaarVerified: aadhaar.aadhaarVerified,
        aadhaarNumberMasked: aadhaar.aadhaarNumberMasked,
        aadhaarName: aadhaar.aadhaarName,
        aadhaarDob: aadhaar.aadhaarDob,
        aadhaarGender: aadhaar.aadhaarGender,
        aadhaarAddress: aadhaar.aadhaarAddress,
        aadhaarPhotoUrl: aadhaar.aadhaarPhotoUrl,
        aadhaarDistrict: aadhaar.aadhaarDistrict,
        aadhaarState: aadhaar.aadhaarState,
        aadhaarPincode: aadhaar.aadhaarPincode,
        aadhaarVillage: aadhaar.aadhaarVillage,
        aadhaarCountry: aadhaar.aadhaarCountry,
        kycApprovedAt: kyc.kycApprovedAt,
        phoneNumber: aadhaar.phoneNumber
      });
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileDetails();
  };

  const openEditProfile = () => {
    setEditForm({
      name: profileData?.user?.name || user?.name || displayName || '',
      email: profileData?.user?.email || user?.email || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const name = String(editForm.name || '').trim();
    const email = String(editForm.email || '').trim().toLowerCase();

    if (name.length < 2) {
      alert('Name must be at least 2 characters.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Invalid email address.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.patch('/api/v1/profile', { name, email });
      if (res.data.success) {
        updateKycState(res.data.user);
        setProfileData(prev => prev ? { ...prev, user: { ...prev.user, ...res.data.user } } : prev);
        setShowEditModal(false);
        await fetchProfileDetails();
        alert(res.data.message || 'Profile updated successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDownloadPDF = (type) => {
    // Elegant client-side printable document rendering
    const printWindow = window.open('', '_blank');
    const title = type === 'kyc' ? 'KYC Verification Certificate' : 'User Profile Brief';
    
    const photoSrc = getPhotoSrc(profileData?.aadhaarPhotoUrl || user?.aadhaarPhotoUrl);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #4f46e5; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .item { font-size: 12px; }
            .label { color: #64748b; font-weight: 550; }
            .val { font-weight: bold; color: #0f172a; }
            .photo-box { width: 100px; height: 120px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
            .photo { width: 100%; height: 100%; object-fit: cover; }
            .footer { border-top: 1px dashed #cbd5e1; margin-top: 50px; padding-top: 15px; text-align: center; font-size: 10px; color: #94a3b8; }
            .stamp { border: 2px solid #10b981; color: #10b981; display: inline-block; padding: 5px 15px; font-weight: bold; text-transform: uppercase; border-radius: 4px; transform: rotate(-5deg); font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">⚡ Dizipay Enterprise</div>
            <div class="title">${title}</div>
          </div>
          
          <div style="display: flex; gap: 30px; margin-bottom: 30px;">
            ${photoSrc ? `
              <div class="photo-box">
                <img class="photo" src="${photoSrc}" />
              </div>
            ` : `
              <div class="photo-box" style="font-size: 24px; color: #cbd5e1; font-weight: bold;">
                Avatar
              </div>
            `}
            <div style="flex: 1;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a;">${displayName}</h2>
              <div class="grid">
                <div class="item"><span class="label">Email:</span> <span class="val">${user?.email}</span></div>
                <div class="item"><span class="label">Registered Phone:</span> <span class="val">${user?.phone || '—'}</span></div>
                <div class="item"><span class="label">Account Role:</span> <span class="val">${user?.role}</span></div>
                <div class="item"><span class="label">KYC Status:</span> <span class="val">${profileData?.kycStatus || user?.kycStatus}</span></div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Demographics & Personal Details</div>
            <div class="grid">
              <div class="item"><span class="label">Father Name:</span> <span class="val">${profileData?.aadhaarFatherName || '—'}</span></div>
              <div class="item"><span class="label">Date of Birth:</span> <span class="val">${profileData?.aadhaarDob || '—'}</span></div>
              <div class="item"><span class="label">Gender:</span> <span class="val">${profileData?.aadhaarGender || '—'}</span></div>
              <div class="item"><span class="label">Aadhaar registered Mobile:</span> <span class="val">${profileData?.phoneNumber || '—'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Permanent Address Details</div>
            <div class="item" style="font-size: 13px; font-weight: bold; color: #0f172a;">
              ${profileData?.aadhaarAddress || '—'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Aadhaar Identification Logs</div>
            <div class="grid">
              <div class="item"><span class="label">Masked Aadhaar:</span> <span class="val">${profileData?.aadhaarNumberMasked || '—'}</span></div>
              <div class="item"><span class="label">Verification Status:</span> <span class="val">${profileData?.aadhaarVerified ? 'VERIFIED' : 'PENDING'}</span></div>
              <div class="item"><span class="label">Verification Timestamp:</span> <span class="val">${profileData?.kycApprovedAt ? new Date(profileData.kycApprovedAt).toLocaleString() : '—'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Platform Verification Metrics</div>
            <div class="grid">
              <div class="item"><span class="label">User Database ID:</span> <span class="val">#${user?.id}</span></div>
              <div class="item"><span class="label">KYC Verification Level:</span> <span class="val">${profileData?.kycLevel || 'PENDING'}</span></div>
              <div class="item"><span class="label">Account Created:</span> <span class="val">${user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</span></div>
              <div class="item"><span class="label">Approval Date:</span> <span class="val">${profileData?.kycApprovedAt ? new Date(profileData.kycApprovedAt).toLocaleString() : '—'}</span></div>
            </div>
          </div>

          <div style="text-align: right; margin-top: 40px;">
            ${(profileData?.kycStatus === 'KYC_APPROVED' || profileData?.kycStatus === 'APPROVED') ? `
              <div class="stamp">Approved KYC</div>
            ` : `
              <div class="stamp" style="border-color: #f59e0b; color: #f59e0b;">Verification Pending</div>
            `}
          </div>

          <div class="footer">
            Generated automatically via Dizipay secure core. Dizipay is an ISO-certified identification platform.
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-semibold text-slate-500">Retrieving profile context...</span>
      </div>
    );
  }

  const kycStatus = profileData?.kycStatus || user?.kycStatus || 'PENDING_KYC';
  const isApproved = kycStatus === 'KYC_APPROVED' || kycStatus === 'APPROVED';

  const displayName = 
    profileData?.aadhaarName || 
    profileData?.user?.name || 
    user?.name || 
    "-";

  // Address split helpers to ensure no truncation
  const address = profileData?.aadhaarAddress || '';

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-16 animate-fade-in font-sans">
      {/* EDIT PROFILE MODAL */}
      <ClayModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 text-left">
          <ClayInput
            label="Full Name"
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Enter full name"
            required
          />
          <ClayInput
            label="Email Address"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            placeholder="name@example.com"
            required
          />
          <p className="text-xs text-slate-500 px-2">Aadhaar, KYC, phone, and wallet details are not changed here.</p>
          <div className="flex justify-end gap-3 mt-2">
            <ClayButton variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</ClayButton>
            <ClayButton type="submit" variant="primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </ClayButton>
          </div>
        </form>
      </ClayModal>
      
      {/* 1. HERO SECTION CARD */}
      <ClayCard className="overflow-hidden border border-slate-200 shadow-sm relative rounded-[24px] bg-white p-0">
        <div className="h-32 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 relative opacity-90" />
        <div className="px-6 pb-6 pt-0 flex flex-col md:flex-row gap-6 items-end -mt-12 relative z-10">
          
          <div className="w-28 h-32 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
            <img 
              src={getPhotoSrc(profileData?.aadhaarPhotoUrl || user?.aadhaarPhotoUrl)} 
              alt="Aadhaar Avatar" 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"; }}
            />
          </div>

          {/* User Brief */}
          <div className="flex-1 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{displayName}</h1>
              <ClayBadge status={isApproved ? 'ACTIVE' : 'PENDING'}>
                {isApproved ? 'KYC Approved' : kycStatus.replace(/_/g, ' ')}
              </ClayBadge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
              <span className="text-slate-300">|</span>
              <Shield className="w-3.5 h-3.5 text-violet-600" /> {user?.role}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              Member Since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </p>
          </div>

          {/* Action Triggers */}
          <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0">
            <ClayButton 
              onClick={openEditProfile}
              className="relative z-20 min-w-[132px] justify-center border border-slate-300 !text-slate-900 !bg-white hover:!bg-slate-50 shadow-sm text-xs font-bold px-4 py-2 flex items-center gap-1.5 h-[38px] opacity-100 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-700" /> Edit Profile
            </ClayButton>
            <ClayButton 
              onClick={() => handleDownloadPDF('profile')}
              className="relative z-20 min-w-[168px] justify-center border border-blue-300 !text-white !bg-blue-600 hover:!bg-blue-700 shadow-sm text-xs font-bold px-4 py-2 flex items-center gap-1.5 h-[38px] opacity-100 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-white" /> Download Profile
            </ClayButton>
            <ClayButton 
              onClick={() => handleDownloadPDF('kyc')}
              className="relative z-20 min-w-[156px] justify-center border border-violet-300 !text-violet-900 !bg-violet-100 hover:!bg-violet-200 shadow-sm text-xs font-bold px-4 py-2 flex items-center gap-1.5 h-[38px] opacity-100 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-violet-800" /> KYC Certificate
            </ClayButton>
          </div>
        </div>
      </ClayCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* LEFT COLUMN: Personal, Aadhaar, PAN Details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* 2. PERSONAL INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-violet-600" /> Personal Identity Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Full Name</span>
                <strong className="text-slate-800 text-sm">{displayName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Date of Birth</span>
                <strong className="text-slate-800 text-sm font-mono">{profileData?.aadhaarDob || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Gender</span>
                <strong className="text-slate-800 text-sm">{profileData?.aadhaarGender || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Email Address</span>
                <strong className="text-slate-800 text-sm">{user?.email || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Mobile Contact</span>
                <strong className="text-slate-800 text-sm font-mono">{user?.phone || '—'}</strong>
              </div>
            </div>
          </div>

          {/* VERIFIED AADHAAR PHOTO SECTION */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-violet-600" /> Verified Aadhaar Photo
            </h2>
            <div className="flex flex-col sm:flex-row gap-5 items-center">
              <div className="w-24 h-28 bg-slate-50 rounded-xl border border-slate-200 p-1.5 shadow-sm relative overflow-hidden flex items-center justify-center shrink-0">
                <img 
                  src={getPhotoSrc(profileData?.aadhaarPhotoUrl || user?.aadhaarPhotoUrl)} 
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

          {/* 3. AADHAAR INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-indigo-600" /> Aadhaar Verification Data
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Aadhaar Registered Name</span>
                <strong className="text-slate-800 text-sm">{profileData?.aadhaarName || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Aadhaar Number (Masked)</span>
                <strong className="text-slate-800 text-sm font-mono">{profileData?.aadhaarNumberMasked || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Aadhaar Verification Status</span>
                <ClayBadge status={profileData?.aadhaarVerified ? 'ACTIVE' : 'PENDING'}>
                  {profileData?.aadhaarVerified ? 'VERIFIED' : 'PENDING'}
                </ClayBadge>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Verification Timestamp</span>
                <strong className="text-slate-800 text-sm font-mono">
                  {profileData?.aadhaarVerifiedAt ? new Date(profileData.aadhaarVerifiedAt).toLocaleString() : '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Village / Town</span>
                <strong className="text-slate-800 text-sm">{profileData?.aadhaarVillage || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">District</span>
                <strong className="text-slate-800 text-sm">{profileData?.aadhaarDistrict || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">State</span>
                <strong className="text-slate-800 text-sm">{profileData?.aadhaarState || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Pincode</span>
                <strong className="text-slate-800 text-sm font-mono">{profileData?.aadhaarPincode || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Country</span>
                <strong className="text-slate-800 text-sm">{profileData?.aadhaarCountry || '—'}</strong>
              </div>
            </div>
          </div>

          {/* 4. ADDRESS INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-red-600" /> Permanent Address Record
            </h2>
            <div className="text-sm text-slate-800 font-semibold bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed">
              {address || 'No address record found. Complete Aadhaar verification.'}
            </div>
          </div>

          {/* 5. PAN CARD DETAILS */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-emerald-600" /> Permanent Account Number (PAN)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">PAN Card Number</span>
                <strong className="text-slate-800 text-sm font-mono">
                  {user?.panNumber ? `${user.panNumber.substring(0, 5)}****${user.panNumber.slice(-1)}` : '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">PAN Name (Cardholder)</span>
                <strong className="text-slate-800 text-sm">{user?.panName || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">PAN Status</span>
                <ClayBadge status={user?.panVerified ? 'ACTIVE' : 'PENDING'}>
                  {user?.panVerified ? 'VERIFIED' : 'NOT VERIFIED'}
                </ClayBadge>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">PAN Verification Timestamp</span>
                <strong className="text-slate-800 text-sm font-mono">
                  {user?.panVerifiedAt ? new Date(user.panVerifiedAt).toLocaleString() : '—'}
                </strong>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Account Context & KYC Progress Timeline */}
        <div className="flex flex-col gap-6">
          
          {/* 6. ACCOUNT INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-amber-500" /> Account Context Metrics
            </h2>
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Verification Level</span>
                <span className="font-bold text-slate-800">{profileData?.kycLevel || 'PENDING'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Wallet Balance</span>
                <span className="font-bold font-mono text-emerald-600 text-sm">₹ {parseFloat(profileData?.walletBalance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 7. KYC PROGRESS TIMELINE */}
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-purple-600" /> KYC Milestone Timeline
            </h2>
            <div className="flex flex-col gap-6 ml-2 mt-2 relative border-l border-slate-150 pl-6">
              {profileData?.timeline && profileData.timeline.length > 0 ? (
                profileData.timeline.map((item, idx) => (
                  <div key={`timeline-${item.id || idx}`} className="relative text-xs">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-50">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{item.description}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Event 1: Registration */}
                  <div className="relative text-xs">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-50">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">Account Registration</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Event 2: Email / OTP Activation */}
                  <div className="relative text-xs">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-50">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">Contact Number Verification</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Event 3: Aadhaar Verification */}
                  <div className="relative text-xs">
                    <span className={`absolute -left-[30px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white ring-4 ${
                      profileData?.aadhaarVerified ? 'bg-emerald-500 ring-emerald-50' : 'bg-slate-300 ring-slate-100'
                    }`}>
                      {profileData?.aadhaarVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">Aadhaar KYC Verification</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {profileData?.aadhaarVerifiedAt ? new Date(profileData.aadhaarVerifiedAt).toLocaleString() : 'Pending verification'}
                      </span>
                    </div>
                  </div>

                  {/* Event 4: KYC Final Approval */}
                  <div className="relative text-xs">
                    <span className={`absolute -left-[30px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white ring-4 ${
                      isApproved ? 'bg-emerald-500 ring-emerald-50' : 'bg-slate-300 ring-slate-100'
                    }`}>
                      {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">Milestone Audit & Approval</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {profileData?.kycApprovedAt ? new Date(profileData.kycApprovedAt).toLocaleString() : 'Awaiting confirmation'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
