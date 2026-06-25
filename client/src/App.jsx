import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Full route-level code splitting using React.lazy
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const KycVerification = lazy(() => import('./pages/KycVerification'));

import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from './lib/toast.jsx';

// Reusable screen skeleton for page route transitions
function PageLoader() {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-semibold font-display text-text-secondary animate-pulse">Loading Dizipay...</span>
    </div>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard/*" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/admin/kyc" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/admin/users/:id" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/pricing" element={<ErrorBoundary><Pricing /></ErrorBoundary>} />
          <Route path="/marketplace" element={<ErrorBoundary><Marketplace /></ErrorBoundary>} />
          <Route path="/kyc" element={<ErrorBoundary><KycVerification /></ErrorBoundary>} />
        </Routes>
      </Suspense>
    </Router>
  );
}

