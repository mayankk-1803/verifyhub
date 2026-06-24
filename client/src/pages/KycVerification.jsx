import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { ClayCard, ClayButton, ClayInput } from '../components/Claymorphic';
import { ShieldCheck, KeyRound, AlertTriangle, Zap, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
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
      return { text: 'Aadhaar Verified', color: 'bg-blue-500 text-white shadow-blue-500/20' };
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
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5">
          <span className="text-[8px] font-black text-blue-700 uppercase tracking-wider">Aadhaar Portal</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 via-white to-violet-50 overflow-hidden">
      {/* Background circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-violet-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-400/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-2 hover:opacity-90 transition-opacity">
            <Zap className="h-8 w-8 text-violet-600 animate-pulse" />
            <span className="text-3xl font-black text-slate-900 font-display">Dizipay</span>
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
                    <div className={`absolute top-5 -left-1/2 right-1/2 h-0.5 pointer-events-none ${activeStep >= s.step ? 'bg-violet-600' : 'bg-slate-200'}`} />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isActive ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20' :
                    isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                    'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 font-bold font-display ${isActive ? 'text-violet-600' : 'text-slate-500'}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <ClayCard className="p-0 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] bg-white/95 backdrop-blur-xl rounded-3xl text-left overflow-hidden">
          <GovtBanner />
          <div className="p-8">
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
                  <ClayButton onClick={handleRetryKyc} disabled={loading} variant="primary" className="flex-[2] py-3 text-xs bg-violet-600 text-white font-bold hover:bg-violet-750">
                    {loading ? 'Restarting...' : 'Retry KYC Verification'}
                  </ClayButton>
                </div>
              </div>
            ) : activeStep === 3 ? (
              <div className="flex flex-col gap-6 text-center py-4 font-sans animate-fade-in">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">✓ KYC Verification Approved</h3>
                  <p className="text-slate-500 text-xs mt-1">Your account identity profile is verified and active.</p>
                </div>

                {aadhaarDetails && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl text-left flex flex-col gap-5">
                    
                    {/* Aadhaar Photo Section */}
                    <div className="flex flex-col items-center sm:flex-row gap-5 pb-4 border-b border-slate-200/60 w-full">
                      <div className="w-24 h-28 shrink-0 relative bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                        <img 
                          src={getPhotoSrc(aadhaarDetails.photo)} 
                          alt="Verified Aadhaar Portrait" 
                          className="w-full h-full object-cover rounded-lg"
                          style={{ display: aadhaarDetails.photo ? 'block' : 'none' }}
                          onError={(e) => { 
                            e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"; 
                          }}
                        />
                        {!aadhaarDetails.photo && (
                          <div className="w-full h-full rounded-lg bg-violet-50 flex flex-col items-center justify-center text-center p-2">
                            <span className="text-[10px] font-black text-violet-700 uppercase tracking-tighter leading-none">Verified Aadhaar</span>
                            <span className="text-[8px] text-violet-400 font-bold mt-1">User</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full text-center sm:text-left">
                        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 inline-block uppercase tracking-wider mb-2">UIDAI Authenticated</span>
                        <h4 className="text-base font-bold text-slate-800">{aadhaarDetails.name}</h4>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold text-[10px] uppercase">DOB</span>
                            <p className="text-slate-700 font-semibold">{aadhaarDetails.dob}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold text-[10px] uppercase">Gender</span>
                            <p className="text-slate-700 font-semibold">{aadhaarDetails.gender}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Aadhaar Demographics Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">Father Name</span>
                        <p className="text-slate-800 font-bold">{aadhaarDetails.fatherName || user?.aadhaarFatherName || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">Village / Town</span>
                        <p className="text-slate-800 font-bold">{aadhaarDetails.village || user?.aadhaarVillage || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">District</span>
                        <p className="text-slate-800 font-bold">{aadhaarDetails.district || user?.aadhaarDistrict || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">State</span>
                        <p className="text-slate-800 font-bold">{aadhaarDetails.state || user?.aadhaarState || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">Pincode</span>
                        <p className="text-slate-800 font-bold">{aadhaarDetails.pincode || user?.aadhaarPincode || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">Country</span>
                        <p className="text-slate-800 font-bold">{aadhaarDetails.country || user?.aadhaarCountry || '-'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase block">Full Address</span>
                        <p className="text-slate-800 font-bold leading-relaxed">{aadhaarDetails.address || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full h-px bg-slate-100 my-1" />
                <Link to="/dashboard" className="w-full py-3.5 bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold rounded-full text-center shadow-lg hover:scale-[1.02] transition-all">
                  Go To Dashboard
                </Link>
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

                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl text-xs font-medium text-violet-700 leading-relaxed">
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

                <ClayButton type="submit" variant="primary" disabled={loading} className="w-full py-3.5 flex justify-center items-center bg-violet-600 hover:bg-violet-750 text-white font-bold shadow-xl shadow-violet-500/30 hover:scale-[1.02] transition-all">
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </ClayButton>
              </form>
            ) : (
              <form onSubmit={handleVerifyAadhaarDetails} className="flex flex-col gap-5">
                {/* Aadhaar card showing user name & masked number */}
                <div className="relative w-full rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-slate-50 border border-slate-200/80 p-5 shadow-sm overflow-hidden flex flex-col justify-between min-h-[140px]">
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

                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl text-xs font-medium text-violet-700 leading-relaxed">
                  ℹ️ Enter the 6-digit OTP sent to your Aadhaar-registered mobile number to complete verification.
                </div>

                <ClayInput
                  label="Enter Verification OTP *"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  required
                  disabled={loading}
                />

                {/* Countdown and Resend timer */}
                <div className="flex justify-between items-center text-xs mt-1 px-1">
                  {timer > 0 ? (
                    <span className="text-slate-500 font-bold">
                      Resend OTP in <span className="text-violet-600 font-black">{timer}s</span>
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
                        ? 'text-violet-600 hover:text-violet-850'
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
