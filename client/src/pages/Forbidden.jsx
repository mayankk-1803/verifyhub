import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClayButton, ClayCard } from '../components/Claymorphic';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center select-none font-sans antialiased">
      <div className="max-w-md w-full">
        <ClayCard className="flex flex-col items-center gap-6 py-12 px-8">
          {/* Animated Forbidden Icon */}
          <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 shadow-md animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight">
              403 Forbidden
            </h1>
            <p className="text-sm font-semibold uppercase tracking-wider text-rose-500 font-display">
              Access Denied
            </p>
          </div>

          <p className="text-slate-655 text-sm leading-relaxed max-w-xs">
            You do not have the required administrative privileges to view this resource. Contact system administration if you believe this is an error.
          </p>

          <ClayButton
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 mt-2 bg-emerald-600 text-white font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </ClayButton>
        </ClayCard>
      </div>
    </div>
  );
}
