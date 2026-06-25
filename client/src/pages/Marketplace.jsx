import toast from '../lib/toast.jsx';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useServicesStore } from '../store/servicesStore';
import { ClayCard, ClayButton, ClayBadge, ClayInput } from '../components/Claymorphic';
import { Shield, Lock, CheckCircle2, AlertTriangle, ArrowLeft, Search, Wallet } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function Marketplace() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [balance, setBalance] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activatedServiceName, setActivatedServiceName] = useState('');

  const navigate = useNavigate();

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'kyc', label: 'Identity & KYC' },
    { id: 'government', label: 'Government registries' },
    { id: 'tracking', label: 'Trackers & Schedulers' }
  ];

  const checkAuthAndFetch = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('vh_token');
    const authState = !!token;
    setIsLoggedIn(authState);

    try {
      // 1. Fetch services list (via persistent cache)
      const cachedServices = await useServicesStore.getState().fetchServices();
      setServices(cachedServices || []);

      // 2. Fetch balance if logged in
      if (authState) {
        const balRes = await api.get('/api/v1/wallet');
        if (balRes.data && balRes.data.success) {
          setBalance(balRes.data.balance);
        }
      }
    } catch (err) {
      console.error('Error fetching marketplace services:', err);
      setError(err.response?.data?.error || err.message || 'Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const handleActivate = async (serviceId, serviceName) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/api/v1/services/${serviceId}/activate`);
      if (res.data && res.data.success) {
        setBalance(res.data.balance);
        setActivatedServiceName(serviceName);
        setShowSuccessModal(true);
        // Refresh services catalog in Zustand cache (force update)
        const updatedServices = await useServicesStore.getState().fetchServices(true);
        setServices(updatedServices || []);
      }
    } catch (err) {
      toast.info(err.response?.data?.error || err.response?.data?.message || 'Activation failed.');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 font-sans pb-24 relative overflow-hidden text-left">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-400/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-teal-400/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-55 py-4 px-6 shadow-sm">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="text-emerald-600 text-xl font-bold">⚡</span>
            <span className="text-xl font-black tracking-tight text-slate-900 font-display">Dizipay</span>
          </Link>
          
          <div className="flex items-center gap-6">
            {isLoggedIn && balance !== null && (
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-500 font-semibold">Wallet:</span>
                <strong className="text-emerald-700 text-xs font-bold font-display">₹{balance.toFixed(2)}</strong>
              </div>
            )}

            {isLoggedIn ? (
              <Link to="/dashboard">
                <ClayButton variant="primary" className="py-2 px-5 text-xs font-bold bg-emerald-600 text-white rounded-full">
                  Go to Dashboard
                </ClayButton>
              </Link>
            ) : (
              <Link to="/login">
                <ClayButton variant="primary" className="py-2 px-5 text-xs font-bold bg-emerald-600 text-white rounded-full">
                  Sign In
                </ClayButton>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div className="max-w-[1440px] mx-auto px-6 pt-12 pb-6">
        <div className="flex flex-col gap-4 text-left">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <h1 className="text-4xl font-extrabold text-slate-900 font-display tracking-tight">API Service Marketplace</h1>
          <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
            Activate, unlock, and query production-grade Indian verification registries under a single workspace account.
          </p>
        </div>
      </div>

      {/* Main Marketplace Area */}
      <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Sidebar Filters */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <ClayCard className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
            <div className="flex flex-col gap-6 text-left">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display mb-1">Search catalog</h3>
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search APIs..."
                    aria-label="Search API catalog"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display mb-2">API Categories</h3>
                <div className="flex flex-col gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedCategory === c.id
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ClayCard>
        </div>

        {/* Right column: Cards Grid */}
        <div className="lg:col-span-9 w-full">
          {loading && services.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse bg-white border border-slate-200 rounded-[24px] p-6 h-[220px] flex flex-col justify-between">
                  <div className="flex flex-col gap-3">
                    <div className="h-3.5 bg-slate-200 rounded w-1/4" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-5/6 mt-2" />
                  </div>
                  <div className="h-9 bg-slate-200 rounded w-full mt-4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center border border-red-200 bg-red-50/20 rounded-[24px] max-w-xl mx-auto flex flex-col items-center justify-center gap-4">
              <AlertTriangle className="w-10 h-10 text-red-650" />
              <h3 className="text-base font-bold text-slate-900 font-display">Error Loading Marketplace</h3>
              <p className="text-xs text-slate-650">{error}</p>
              <ClayButton variant="primary" onClick={checkAuthAndFetch} className="py-2.5 px-6 font-semibold bg-emerald-600">
                Retry Fetching
              </ClayButton>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-16 text-center border border-slate-200 bg-white rounded-[24px] shadow-sm text-slate-400 text-xs font-semibold">
              No API services found matching search parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServices.map((svc) => (
                <ClayCard key={svc.id} className="cv-card flex flex-col justify-between gap-6 hover:border-emerald-300 bg-white shadow-sm border border-slate-200 p-6 rounded-[24px]">
                  <div className="text-left flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {svc.category}
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-mono">
                        {svc.method}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-display line-clamp-1">{svc.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 min-h-[50px]">{svc.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 text-xs text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">One-Time Activation Fee:</span>
                        <strong className="text-slate-900 font-bold">₹{parseFloat(svc.activationFee || 49).toFixed(0)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Per API Request:</span>
                        <strong className="text-emerald-700 font-extrabold text-sm">{svc.price}</strong>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Latency: <strong className="text-slate-700 font-semibold">{svc.latency || '150ms'}</strong></span>
                      <span>Success: <strong className="text-emerald-600 font-semibold">{svc.successRate || '99.5%'}</strong></span>
                    </div>

                    <div className="mt-2 w-full">
                      {svc.isActivated ? (
                        <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 py-2.5 rounded-xl font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> Activated & Active
                        </div>
                      ) : (
                        <button
                          onClick={() => handleActivate(svc.id, svc.name)}
                          aria-label={`Unlock and activate ${svc.name}`}
                          className="w-full py-2.5 text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 outline-none"
                        >
                          <Lock className="w-3.5 h-3.5" /> Unlock & Activate
                        </button>
                      )}
                    </div>
                  </div>
                </ClayCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 max-w-md w-full rounded-[32px] p-8 shadow-2xl relative text-center flex flex-col items-center gap-6 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl font-bold">
              ✓
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-display">Service Activated!</h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                The verification node <strong className="text-slate-800 font-semibold">{activatedServiceName}</strong> has been successfully unlocked on your account. You can now invoke it from the sandbox playground or live integration tokens.
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl"
              >
                Close Modal
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/dashboard');
                }}
                className="flex-1 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl"
              >
                Go to Sandbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
