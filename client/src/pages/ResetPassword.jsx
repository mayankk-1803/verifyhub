import React, { useState } from 'react';
import api from '../lib/api';
const axios = api;
import { useNavigate, Link } from 'react-router-dom';
import { ClayCard, ClayButton, ClayInput } from '../components/Claymorphic';
import BrandLogo from '../components/BrandLogo';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await axios.post('/api/v1/auth/reset-password', { token, newPassword });
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password. Check token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 via-white to-violet-50 overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-violet-400/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-400/10 blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-2 hover:opacity-90 transition-opacity">
            <BrandLogo forceText={true} imageClassName="h-10 w-auto" textClassName="text-3xl font-black text-slate-900 font-display" />
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mt-4 mb-2 font-display">Save New Password</h1>
          <p className="text-slate-600 text-lg">Save your new account password credentials</p>
        </div>

        <ClayCard className="p-8 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] bg-white/95 backdrop-blur-xl rounded-3xl text-left">
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-semibold text-center animate-pulse">
              🎉 {message}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-semibold text-center">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ClayInput
              label="Reset Token String"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste generated token"
              required
            />
            <ClayInput
              label="New Account Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <ClayButton type="submit" variant="primary" disabled={loading} className="w-full py-3.5 flex justify-center items-center bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-xl shadow-violet-500/30 hover:scale-105 transition-all">
              {loading ? 'Saving password...' : 'Update Password'}
            </ClayButton>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <Link to="/login" className="text-violet-600 hover:text-violet-700 hover:underline font-bold">Back to Sign In</Link>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
