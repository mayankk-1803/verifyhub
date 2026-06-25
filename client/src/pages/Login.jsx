import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { ClayCard, ClayButton, ClayInput } from '../components/Claymorphic';
import { Mail, Phone, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const isAdminUser = (user) => {
  const roleKey = String(user?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  return Boolean(user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN');
};

const getPostLoginPath = (user) => {
  if (isAdminUser(user)) return '/dashboard/admin';
  const isApproved = user?.kycStatus === 'KYC_APPROVED' || user?.kycStatus === 'APPROVED';
  return isApproved ? '/dashboard' : '/kyc';
};

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone OTP States
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [localMessage, setLocalMessage] = useState(null);

  const { login, sendOtp, verifyOtp, error, loading, clearError, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
    setLocalMessage(null);
    if (isAuthenticated) {
      navigate(getPostLoginPath(user));
    }
  }, [isAuthenticated, navigate, user]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      const loggedUser = useAuthStore.getState().user;
      navigate(getPostLoginPath(loggedUser));
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLocalMessage(null);
    if (!phone || !/^\d{10}$/.test(phone)) {
      setLocalMessage({ type: 'error', text: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    const res = await sendOtp(phone);
    if (res && res.success) {
      setOtpSent(true);
      if (res.providerBlocked) {
        setLocalMessage({ type: 'warning', text: 'Provider blocked. Using Development OTP Mode.' });
        if (res.debugOtp) {
          setOtp(res.debugOtp);
        }
      } else {
        setLocalMessage({ type: 'success', text: 'OTP sent to your registered phone number.' });
      }
    } else {
      const errorMsg = res?.message || res?.error || 'OTP provider rejected request';
      setLocalMessage({ type: 'error', text: errorMsg });
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setLocalMessage(null);
    if (!otp || otp.length !== 6) {
      setLocalMessage({ type: 'error', text: 'Please enter a 6-digit OTP.' });
      return;
    }
    const success = await verifyOtp(phone, otp);
    if (success) {
      const loggedUser = useAuthStore.getState().user;
      navigate(getPostLoginPath(loggedUser));
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-emerald-400/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-teal-400/10 blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-2 hover:opacity-90 transition-opacity">
            <BrandLogo forceText={true} imageClassName="h-10 w-auto" textClassName="text-3xl font-black text-slate-900 font-display" />
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mt-4 mb-2 font-display">Welcome to Dizipay</h1>
          <p className="text-slate-600 text-lg font-sans">Secure Identity Verification Platform</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1.5 rounded-full mb-6 max-w-sm mx-auto shadow-inner">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email');
              clearError();
              setLocalMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold font-display transition-all ${
              loginMethod === 'email'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone');
              clearError();
              setLocalMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold font-display transition-all ${
              loginMethod === 'phone'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" /> SMS OTP
          </button>
        </div>

        <ClayCard className="p-8 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] bg-white/95 backdrop-blur-xl rounded-3xl text-left">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {localMessage && (
            <div className={`mb-6 p-4 border rounded-2xl text-center text-xs font-semibold ${
              localMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : localMessage.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {localMessage.type === 'success' ? '✓' : '⚠️'} {localMessage.text}
            </div>
          )}

          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <ClayInput
                label="Work Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@company.com"
                required
              />
              <ClayInput
                label="Account Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <div className="flex justify-between items-center text-xs mb-2 ml-1">
                <Link to="/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">Forgot password?</Link>
              </div>

              <ClayButton type="submit" variant="primary" disabled={loading} className="w-full py-3.5 flex justify-center items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all">
                {loading ? 'Authenticating...' : 'Sign In with Password'}
              </ClayButton>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOtpSubmit : handleRequestOtp} className="flex flex-col gap-4">
              <ClayInput
                label="Mobile Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                disabled={otpSent}
                required
              />

              {otpSent && (
                <div className="relative">
                  <ClayInput
                    label="Enter 6-digit Verification Code"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    maxLength={6}
                    required
                  />
                  <div className="flex justify-between items-center text-xs mt-2 ml-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        setLocalMessage(null);
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                    >
                      Change phone number
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-slate-500 hover:text-slate-700 font-semibold hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}

              <ClayButton type="submit" variant="primary" disabled={loading} className="w-full py-3.5 flex justify-center items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all">
                {loading ? 'Processing...' : (otpSent ? 'Verify OTP & Login' : 'Send Verification OTP')}
              </ClayButton>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            New to Dizipay?{' '}
            <Link to="/register" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold">Start building now</Link>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
