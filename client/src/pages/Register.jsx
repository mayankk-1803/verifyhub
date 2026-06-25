import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { ClayCard, ClayButton, ClayInput } from '../components/Claymorphic';
import BrandLogo from '../components/BrandLogo';
import api from '../lib/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { register, error, loading, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const { user } = useAuthStore();

  useEffect(() => {
    clearError();
    setValidationError('');
    if (isAuthenticated) {
      const isApproved = user?.kycStatus === 'KYC_APPROVED' || user?.kycStatus === 'APPROVED' || user?.isAdmin || user?.role === 'Super Admin' || user?.role === 'Admin';
      if (isApproved) {
        navigate('/dashboard');
      } else {
        navigate('/kyc');
      }
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Validation Rules
    if (!name || name.trim().length < 2) {
      setValidationError('Name must be at least 2 characters.');
      return;
    }
    if (!email) {
      setValidationError('Email is required.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      setValidationError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!password || password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    const success = await register(name, email, cleanPhone, password, `${name}'s Workspace`);
    if (success) {
      const loggedUser = useAuthStore.getState().user;
      const isApproved = loggedUser?.kycStatus === 'KYC_APPROVED' || loggedUser?.kycStatus === 'APPROVED' || loggedUser?.isAdmin || loggedUser?.role === 'Super Admin' || loggedUser?.role === 'Admin';
      if (isApproved) {
        navigate('/dashboard');
      } else {
        navigate('/kyc');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-emerald-400/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-teal-400/5 blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-2 hover:opacity-90 transition-opacity">
            <BrandLogo forceText={true} imageClassName="h-10 w-auto" textClassName="text-3xl font-black text-slate-900 font-display" />
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mt-4 mb-2 font-display">Create Your Dizipay Account</h1>
          <p className="text-slate-600 text-lg">Create your free API playground account</p>
        </div>

        <ClayCard className="p-8 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] bg-white/95 backdrop-blur-xl rounded-3xl text-left">
          {(error || validationError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-full text-center text-xs font-semibold">
              ⚠️ {validationError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ClayInput
              label="Full Name *"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              required
            />
            <ClayInput
              label="Work Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              required
            />
            <ClayInput
              label="Phone Number (10 digits) *"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone Number"
              required
            />
            <ClayInput
              label="Choose Password *"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <ClayInput
              label="Confirm Password *"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
            />

            <div className="text-[11px] text-slate-500 leading-relaxed mb-2 ml-1">
              By clicking "Register Account", you agree to our terms. Your wallet starts at INR 0.00 until an admin credit, recharge, refund, or reward is explicitly applied.
            </div>

            <ClayButton type="submit" variant="primary" disabled={loading} className="w-full py-3.5 flex justify-center items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all">
              {loading ? 'Registering...' : 'Register Account'}
            </ClayButton>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold">Sign in here</Link>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
