import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { ClayCard, ClayButton, ClayInput } from '../components/Claymorphic';
import { ShieldCheck, KeyRound, AlertTriangle, CheckCircle2, XCircle, RefreshCw, BadgeCheck, LayoutDashboard, FileText, MapPin, UserCheck } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import api from '../lib/api';
const axios = api;

import { API_BASE_URL } from '../config/api';

const cleanDisplayValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text || text === '-' || text === '—' || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return '';
  return text;
};

const bestLocationFrom = (details = {}, fallback = {}) => cleanDisplayValue(details.village) || cleanDisplayValue(fallback.aadhaarVillage) || cleanDisplayValue(details.district) || cleanDisplayValue(fallback.aadhaarDistrict) || cleanDisplayValue(details.address) || cleanDisplayValue(fallback.aadhaarAddress);

const DetailPill = ({ label, value }) => {
  const displayValue = cleanDisplayValue(value);
  if (!displayValue) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{displayValue}</p>
    </div>
  );
};

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

export default function KycVerification() {
  const { user, updateKycState } = useAuthStore();
  const navigate = useNavigate();

  const getKycBadge = () => {
    const status = user?.kycStatus || 'PENDING_KYC';
    const level = user?.kycLevel || 'PENDING_KYC';
    const aadhaarVer = user?.aadhaarVerified || false;

    if (status === 'KYC_APPROVED' || status === 'APPROVED') {
      return { text: 'Approved', color: 'bg-emerald-500 text-white shadow-emerald-500/20' };
    }
    if (status === 'KYC_REJECTED' || status === 'REJECTED') {
      return { text: 'Rejected', color: 'bg-rose-500 text-white shadow-rose-500/20' };
    }
    if (aadhaarVer || level === 'AADHAAR_VERIFIED') {
      return { text: 'Aadhaar Verified', color: 'bg-emerald-500 text-white shadow-emerald-500/20' };
    }
    if (level === 'AADHAAR_OTP_SENT') {
      return { text: 'Aadhaar OTP Sent', color: 'bg-amber-500 text-white shadow-amber-500/20' };
    }
    return { text: 'Pending KYC', color: 'bg-slate-500 text-white shadow-slate-500/20' };
  };
  const currentBadge = getKycBadge();

  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form Fields
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [applicationNumber, setApplicationNumber] = useState(''); // Stores clientId

  // Timer and Resend states
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Results
  const [aadhaarDetails, setAadhaarDetails] = useState(null);
  const [maskedAadhaar, setMaskedAadhaar] = useState('');
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  const otpDigits = Array.from({ length: 6 }, (_, index) => otp[index] || '');
  const successLocation = bestLocationFrom(aadhaarDetails || {}, user || {});

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtp(nextDigits.join(''));
    if (digit && index < 5) {
      document.getElementById(`aadhaar-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`aadhaar-otp-${index - 1}`)?.focus();
    }
  };

  // Timer countdown hook
  useEffect(() => {
    let interval;
    if (activeStep === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [activeStep, timer]);

  useEffect(() => {
    const checkKycStatus = async () => {
      try {
        const res = await axios.get('/api/v1/kyc/status');
        const { 
          kycStatus, 
          kycLevel, 
          aadhaarVerified, 
          aadhaarNumberMasked,
          aadhaarName,
          aadhaarDob,
          aadhaarGender,
          aadhaarAddress,
          aadhaarDistrict,
          aadhaarState,
          aadhaarPincode,
          aadhaarVillage,
          aadhaarCountry,
          aadhaarPhotoUrl,
          kycApprovedAt,
          phoneNumber
        } = res.data;

        // Sync local auth store state immediately
        updateKycState({
          kycStatus,
          kycLevel,
          aadhaarVerified,
          aadhaarNumberMasked,
          aadhaarName,
          aadhaarDob,
          aadhaarGender,
          aadhaarAddress,
          aadhaarDistrict,
          aadhaarState,
          aadhaarPincode,
          aadhaarVillage,
          aadhaarCountry,
          aadhaarPhotoUrl,
          kycApprovedAt,
          phoneNumber
        });

        // 1. Success Screen (KYC_APPROVED / APPROVED)
        if (kycStatus === 'KYC_APPROVED' || kycStatus === 'APPROVED') {
          setAadhaarDetails({
            name: aadhaarName,
            dob: aadhaarDob,
            gender: aadhaarGender,
            address: aadhaarAddress,
            district: aadhaarDistrict,
            state: aadhaarState,
            pincode: aadhaarPincode,
            village: aadhaarVillage,
            country: aadhaarCountry,
            photo: aadhaarPhotoUrl || '',
            approvedAt: kycApprovedAt
          });
          setActiveStep(3); // Move directly to step 3 (Success)
          return;
        }

        // 2. Rejection Screen (KYC_REJECTED / REJECTED)
        if (kycStatus === 'KYC_REJECTED' || kycStatus === 'REJECTED') {
          setIsRejected(true);
          setRejectionRemarks(res.data.kycRemarks || 'Verification rejected');
          return;
        }

        // 3. Resume wizard based on kycLevel / OTP sent status
        setIsRejected(false);
        if (kycLevel === 'AADHAAR_OTP_SENT') {
          setMaskedAadhaar(aadhaarNumberMasked || '');
          setApplicationNumber(res.data.clientId || '');
          setTimer(60);
          setCanResend(false);
          setActiveStep(2);
        } else {
          setActiveStep(1);
        }
      } catch (err) {
        console.error('Failed to load KYC status:', err);
      }
    };

    checkKycStatus();
  }, [navigate]);

  const handleSendAadhaarOtp = async (e) => {
    e.preventDefault();
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await axios.post('/api/v1/kyc/send-aadhaar-otp', { aadhaarNumber: cleanAadhaar });
      if (res.data.success) {
        setMaskedAadhaar(res.data.maskedAadhaar);
        setApplicationNumber(res.data.clientId);
        setSuccess('Aadhaar OTP sent successfully!');
        setTimer(60);
        setCanResend(false);

        // Update Zustand Global State immediately
        updateKycState({
          kycLevel: 'AADHAAR_OTP_SENT',
          aadhaarNumberMasked: res.data.maskedAadhaar
        });

        setTimeout(() => {
          setActiveStep(2);
          setSuccess(null);
        }, 1500);
      } else {
        setError(res.data.message || res.data.error || 'Failed to send Aadhaar OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send Aadhaar OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAadhaarDetails = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    if (!applicationNumber) {
      setError('Client ID is missing. Please try sending the Aadhaar OTP again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await axios.post('/api/v1/kyc/fetch-aadhaar-details', {
        otp: otp.trim(),
        clientId: applicationNumber
      });

      if (res.data.success) {
        setSuccess('Aadhaar verified successfully! KYC Approved.');
        const fetchedData = res.data.data || {};
        
        const details = {
          name: fetchedData.name,
          dob: fetchedData.dob,
          gender: fetchedData.gender,
          address: fetchedData.address,
          district: fetchedData.district || '',
          state: fetchedData.state || '',
          pincode: fetchedData.pincode || '',
          village: fetchedData.village || '',
          country: fetchedData.country || 'India',
          photo: fetchedData.photoUrl || '',
          approvedAt: fetchedData.kycApprovedAt || new Date().toISOString()
        };
        setAadhaarDetails(details);

        // Update Zustand Global State immediately
        updateKycState({
          kycStatus: 'KYC_APPROVED',
          kycLevel: 'AADHAAR_VERIFIED',
          aadhaarVerified: true,
          aadhaarName: fetchedData.name,
          aadhaarDob: fetchedData.dob,
          aadhaarGender: fetchedData.gender,
          aadhaarAddress: fetchedData.address,
          aadhaarDistrict: fetchedData.district,
          aadhaarState: fetchedData.state,
          aadhaarPincode: fetchedData.pincode,
          aadhaarVillage: fetchedData.village,
          aadhaarCountry: fetchedData.country,
          aadhaarPhotoUrl: fetchedData.photoUrl,
          kycApprovedAt: fetchedData.kycApprovedAt,
          phoneNumber: fetchedData.phoneNumber
        });

        setTimeout(() => {
          setActiveStep(3);
          setSuccess(null);
        }, 1500);
      } else {
        setError(res.data.message || res.data.error || 'Failed to verify Aadhaar OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to verify Aadhaar.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
      const res = await axios.post('/api/v1/kyc/send-aadhaar-otp', { aadhaarNumber: cleanAadhaar });
      if (res.data.success) {
        setSuccess('OTP resent successfully!');
        setTimer(60);
        setCanResend(false);
      } else {
        setError(res.data.message || res.data.error || 'Failed to resend Aadhaar OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to resend Aadhaar OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryKyc = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post('/api/v1/kyc/retry');
      if (res.data.success) {
        setSuccess('KYC verification process restarted!');
        
        // Update Zustand Global State immediately
        updateKycState({
          kycStatus: 'PENDING_KYC',
          kycLevel: 'PENDING_KYC',
          aadhaarVerified: false,
          aadhaarNumberMasked: null,
          aadhaarName: null,
          aadhaarDob: null,
          aadhaarGender: null,
          aadhaarAddress: null,
          aadhaarDistrict: null,
          aadhaarState: null,
          aadhaarPincode: null,
          aadhaarVillage: null,
          aadhaarCountry: null,
          aadhaarPhotoUrl: null
        });

        // Reset local wizard states
        setAadhaarNumber('');
        setOtp('');
        setApplicationNumber('');
        setMaskedAadhaar('');
        setAadhaarDetails(null);
        setIsRejected(false);
        setRejectionRemarks('');
        setActiveStep(1);

        setTimeout(() => {
          setSuccess(null);
        }, 1500);
      } else {
        setError(res.data.message || res.data.error || 'Failed to restart KYC.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to restart KYC.');
    } finally {
      setLoading(false);
    }
  };

  // Indian flag styled Govt Header component
  const GovtBanner = () => (
    <div className="rounded-t-2xl overflow-hidden border-b border-slate-200">
      <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-emerald-500 w-full" />
      <div className="bg-slate-50 px-4 py-2 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          {/* Satyameva Jayate Emblem Vector SVG */}
          <svg className="h-8 w-8 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <div>
            <div className="text-[10px] font-black text-slate-800 uppercase leading-none">Government of India</div>
            <div className="text-[8px] font-bold text-slate-500 leading-none mt-0.5">Unique Identification Authority of India</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
          <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wider">Aadhaar Portal</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 relative bg-[linear-gradient(180deg,#F8FAFC_0%,#ECFDF5_100%)] overflow-x-hidden">
      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-2 hover:opacity-90 transition-opacity">
            <BrandLogo imageClassName="h-10 w-auto object-contain" textClassName="text-3xl font-black text-slate-900 font-display" forceText />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4 mb-2 font-display">KYC Identity Verification</h1>
          <p className="text-slate-600 text-sm">Complete standard Aadhaar OTP validation to unlock full platform operations.</p>
        </div>

        {/* Wizard Steps indicator */}
        {!isRejected && activeStep <= 2 && (
          <div className="flex justify-around items-center mb-8 px-8">
            {[
              { step: 1, label: 'Aadhaar OTP', icon: KeyRound },
              { step: 2, label: 'Aadhaar Verification', icon: ShieldCheck }
            ].map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.step;
              const isCompleted = activeStep > s.step;
              return (
                <div key={s.step} className="flex flex-col items-center flex-1 relative">
                  {s.step > 1 && (
                    <div className={`absolute top-5 -left-1/2 right-1/2 h-0.5 pointer-events-none ${activeStep >= s.step ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' :
                    isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                    'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 font-bold font-display ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <ClayCard className="p-0 border border-emerald-100 shadow-[0_28px_90px_-24px_rgba(15,23,42,0.28)] bg-white/95 backdrop-blur-xl rounded-[28px] text-left overflow-hidden">
          <GovtBanner />
          <div className="p-5 sm:p-8">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Verification Progress</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-md transition-all duration-300 ${currentBadge.color}`}>
                {currentBadge.text}
              </span>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0 animate-bounce" />
                <span>{success}</span>
              </div>
            )}

            {isRejected ? (
              <div className="flex flex-col gap-6 text-center py-4 font-sans">
                <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">KYC Verification Failed</h3>
                  <p className="text-slate-500 text-xs mt-1">Your documents or verification details were rejected.</p>
                </div>
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-xs text-rose-700 text-left font-medium leading-relaxed">
                  <strong>Rejection Remarks:</strong> {rejectionRemarks}
                </div>
                <div className="w-full h-px bg-slate-100 my-1" />
                <div className="flex gap-3">
                  <Link to="/" className="flex-1 py-3 text-slate-700 border border-slate-200 text-xs font-bold rounded-full text-center hover:bg-slate-50 transition-all flex justify-center items-center">
                    Back to Home
                  </Link>
                  <ClayButton onClick={handleRetryKyc} disabled={loading} variant="primary" className="flex-[2] py-3 text-xs bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                    {loading ? 'Restarting...' : 'Retry KYC Verification'}
                  </ClayButton>
                </div>
              </div>
            ) : activeStep === 3 ? (
<div className="flex flex-col gap-6 py-2 font-sans animate-fade-in">
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                    <BadgeCheck className="h-9 w-9" />
                  </div>
                  <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Identity Verified</h3>
                  <p className="mt-1 text-sm font-medium text-emerald-800">Your Aadhaar KYC is approved and your Dizipay workspace is active.</p>
                </div>

                {aadhaarDetails && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                          <img
                            src={getPhotoSrc(aadhaarDetails.photo)}
                            alt="Verified Aadhaar Portrait"
                            className="h-full w-full rounded-xl object-cover"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            <UserCheck className="h-3 w-3" /> UIDAI Authenticated
                          </span>
                          <h4 className="mt-3 break-words text-xl font-black text-slate-950">{cleanDisplayValue(aadhaarDetails.name) || user?.name || 'Verified User'}</h4>
                          <p className="mt-1 text-xs font-semibold text-slate-500">KYC Level: {user?.kycLevel || 'AADHAAR_VERIFIED'}</p>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DetailPill label="Date of Birth" value={aadhaarDetails.dob} />
                        <DetailPill label="Gender" value={aadhaarDetails.gender} />
                        <DetailPill label="District" value={aadhaarDetails.district || user?.aadhaarDistrict} />
                        <DetailPill label="State" value={aadhaarDetails.state || user?.aadhaarState} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                          <MapPin className="h-4 w-4 text-emerald-600" /> Address Card
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{cleanDisplayValue(aadhaarDetails.address) || cleanDisplayValue(user?.aadhaarAddress) || successLocation}</p>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <DetailPill label="Village / Town" value={successLocation} />
                          <DetailPill label="Pincode" value={aadhaarDetails.pincode || user?.aadhaarPincode} />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-sm font-black text-slate-950">Verification Metadata</div>
                        <div className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
                          <div className="flex justify-between gap-4"><span>KYC Level</span><strong className="text-slate-950">AADHAAR_VERIFIED</strong></div>
                          <div className="flex justify-between gap-4"><span>Verification Time</span><strong className="text-right text-slate-950">{aadhaarDetails.approvedAt ? new Date(aadhaarDetails.approvedAt).toLocaleString() : new Date().toLocaleString()}</strong></div>
                          <div className="flex justify-between gap-4"><span>Status</span><strong className="text-emerald-700">APPROVED</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Link to="/dashboard/profile" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50">
                    <FileText className="h-4 w-4" /> Certificate
                  </Link>
                  <Link to="/dashboard/profile" className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800 shadow-sm hover:bg-emerald-100">
                    <UserCheck className="h-4 w-4" /> Profile
                  </Link>
                  <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </div>
              </div>
            ) : activeStep === 1 ? (
              <form onSubmit={handleSendAadhaarOtp} className="flex flex-col gap-5">
                {/* Government Card Mockup Preview */}
                <div className="relative w-full rounded-2xl bg-gradient-to-br from-orange-50/70 via-white to-emerald-50/50 border border-slate-200/80 p-5 shadow-sm overflow-hidden min-h-[160px] flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/5 rounded-full blur-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-xl pointer-events-none" />
                  
                  {/* Card upper */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-slate-800 block uppercase">भारत सरकार</span>
                      <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wide mt-0.5">Government of India</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-amber-700 block uppercase">आधार</span>
                      <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wider">Aadhaar</span>
                    </div>
                  </div>

                  {/* Card middle */}
                  <div className="my-4 flex items-center gap-4">
                    <div className="w-12 h-14 bg-slate-100 rounded-lg border border-slate-200/60 flex items-center justify-center">
                      <svg className="h-6 w-6 text-slate-350" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-200/85 rounded w-3/4 mb-2 animate-pulse" />
                      <div className="h-1.5 bg-slate-150 rounded w-1/2 mb-1 animate-pulse" />
                      <div className="h-1.5 bg-slate-150 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>

                  {/* Card bottom: Aadhaar Number Typing display */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-[7px] font-extrabold text-slate-400 uppercase tracking-widest">Aadhaar Number</span>
                    <span className="text-sm font-black text-slate-800 tracking-widest font-mono">
                      {aadhaarNumber ? aadhaarNumber : '•••• •••• ••••'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-medium text-emerald-700 leading-relaxed">
                  ℹ️ Submit your 12-digit Aadhaar Card number to send a verification OTP to your linked mobile device.
                </div>

                <ClayInput
                  label="Aadhaar Number (12 digits) *"
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                  placeholder="e.g. 1234 5678 9012"
                  maxLength={14}
                  required
                  disabled={loading}
                />

                <ClayButton type="submit" variant="primary" disabled={loading} className="w-full py-3.5 flex justify-center items-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl shadow-emerald-500/30 hover:scale-[1.02] transition-all">
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </ClayButton>
              </form>
            ) : (
              <form onSubmit={handleVerifyAadhaarDetails} className="flex flex-col gap-5">
                {/* Aadhaar card showing user name & masked number */}
                <div className="relative w-full rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-slate-200/80 p-5 shadow-sm overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Aadhaar Registration Details</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{user?.name || 'Aadhaar Card Holder'}</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-md text-[8px] font-black text-amber-700 uppercase tracking-wider animate-pulse">OTP Verification Active</span>
                  </div>

                  <div className="mt-4 flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-[7px] font-extrabold text-slate-400 uppercase tracking-widest">Masked Aadhaar ID</span>
                    <span className="text-sm font-black text-slate-800 tracking-widest font-mono">
                      {maskedAadhaar || 'XXXX XXXX XXXX'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-medium text-emerald-700 leading-relaxed">
                  ℹ️ Enter the 6-digit OTP sent to your Aadhaar-registered mobile number to complete verification.
                </div>

<div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-wider text-slate-500">Enter Verification OTP *</label>
                  <div className="grid grid-cols-6 gap-2 sm:gap-3">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        id={`aadhaar-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        disabled={loading}
                        className="h-12 rounded-2xl border border-slate-200 bg-white text-center text-lg font-black text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:h-14"
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Countdown and Resend timer */}
                <div className="flex justify-between items-center text-xs mt-1 px-1">
                  {timer > 0 ? (
                    <span className="text-slate-500 font-bold">
                      Resend OTP in <span className="text-emerald-600 font-black">{timer}s</span>
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Resend available</span>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || !canResend}
                    className={`flex items-center gap-1 font-extrabold uppercase text-[10px] tracking-wider transition-colors ${
                      canResend && !loading
                        ? 'text-emerald-600 hover:text-emerald-800'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Resend OTP
                  </button>
                </div>

                <div className="flex gap-3 mt-4">
                  <ClayButton variant="secondary" onClick={() => setActiveStep(1)} className="flex-1 py-3 text-slate-700 font-semibold border-slate-200">
                    Back
                  </ClayButton>
                  <ClayButton type="submit" variant="primary" disabled={loading} className="flex-[2] py-3 flex justify-center items-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-500/30 hover:scale-[1.02] transition-all">
                    {loading ? 'Verifying Aadhaar...' : 'Verify Aadhaar'}
                  </ClayButton>
                </div>
              </form>
            )}
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
