import React, { useState } from 'react';
import { ClayCard, ClayButton, ClayInput, ClayBadge, ClayTable, ClayTabs } from '../Claymorphic';
import { Search, Play, CheckCircle2, Lock, Copy, ChevronDown } from 'lucide-react';
import toast from '../../lib/toast.jsx';

const AUDIT_KEYS = ['AADHAAR_OTP', 'AADHAAR_DATA', 'AADHAAR_PAN', 'PAN_CARD', 'PAN_BASIC', 'PAN_VERIFICATION', 'PAN_DECODE', 'PAN_TRACK', 'GST_VERIFY', 'GST_RETURN', 'RATION', 'VOTER_VERIFY'];

const isObjectLike = (value) => value && typeof value === 'object';

const JsonValue = ({ name, value, depth = 0 }) => {
  if (!isObjectLike(value)) {
    return (
      <div className="py-0.5">
        {name && <span className="text-sky-300">"{name}": </span>}
        <span className={typeof value === 'string' ? 'text-emerald-300' : typeof value === 'boolean' ? 'text-amber-300' : 'text-purple-300'}>
          {JSON.stringify(value)}
        </span>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((item, i) => [String(i), item]) : Object.entries(value);
  return (
    <details open={depth < 1} className="group py-1">
      <summary className="flex cursor-pointer select-none items-center gap-2 text-slate-300 hover:text-white">
        <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
        {name && <span className="text-sky-300">"{name}"</span>}
        <span className="text-slate-500">{Array.isArray(value) ? '[' : '{'} {entries.length} {entries.length === 1 ? 'item' : 'items'} {Array.isArray(value) ? ']' : '}'}</span>
      </summary>
      <div className="ml-5 border-l border-slate-800 pl-3">
        {entries.map(([key, item]) => <JsonValue key={key} name={key} value={item} depth={depth + 1} />)}
      </div>
    </details>
  );
};

const getPlaceholderForField = (fieldName, labelText) => {
  const name = (fieldName || '').toLowerCase();
  const label = (labelText || '').toLowerCase();
  if (name.includes('gst')) return 'Enter GST Number';
  if (name.includes('pan_no') || name.includes('pan_number') || name.includes('pan')) return 'Enter PAN Number';
  if (name.includes('aadhaar')) return 'Enter Aadhaar Number';
  if (name.includes('otp')) return 'Enter OTP';
  if (name.includes('ration')) return 'Enter Ration Card Number';
  if (name.includes('epic') || name.includes('voter')) return 'Enter Voter ID';
  if (name.includes('application')) return 'Enter Application Number';
  if (name.includes('encdata') || name.includes('enc_data')) return 'Paste Encoded Data';
  return `Enter ${labelText || fieldName}`;
};

export default function VerificationPlayground({
  servicesList = [],
  verifyService,
  setVerifyService,
  playgroundInputs = {},
  setPlaygroundInputs,
  playLoading,
  playResponse,
  playMeta,
  handleVerifyPlayground,
  handleActivateService,
  user
}) {
  const [activeSubTab, setActiveSubTab] = useState('marketplace'); // 'marketplace' or 'sandbox'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const roleKey = String(user?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const isAdmin = user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';
  const selectedService = servicesList.find(s => s.key === verifyService) || servicesList[0];
  const auditServices = servicesList.filter(s => AUDIT_KEYS.includes(s.key));
  const responseJson = playResponse ? JSON.stringify(playResponse, null, 2) : '';
  const responseSucceeded = playMeta?.status === 'success' || playResponse?.success === true;

  const handleCopyResponse = async () => {
    if (!responseJson) return;
    await navigator.clipboard.writeText(responseJson);
    toast.success('Response JSON copied');
  };

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'kyc', label: 'Identity & KYC' },
    { id: 'government', label: 'Government registries' },
    { id: 'tracking', label: 'Trackers & Schedulers' }
  ];

  // Filter services by name/key search and category selection
  const filteredServices = servicesList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      {/* Sub-tab selection */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-[24px] shadow-sm flex-wrap gap-4">
        <ClayTabs
          tabs={[
            { id: 'marketplace', label: 'Service Marketplace' },
            { id: 'sandbox', label: 'Developer Sandbox' }
          ]}
          activeTab={activeSubTab}
          onChange={setActiveSubTab}
        />
        <div className="text-xs font-semibold text-slate-500 font-display">
          {isAdmin ? 'Admin sandbox access is enabled.' : 'Pay-per-use APIs require activation prior to Sandbox calls.'}
        </div>
      </div>

      {activeSubTab === 'marketplace' && (
        <div className="flex flex-col gap-6 w-full">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Category Selectors */}
            <div className="md:col-span-8 flex overflow-x-auto md:flex-wrap gap-2 pb-2 md:pb-0 scrollbar-none w-full">
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold font-display border transition-all shrink-0 ${
                    selectedCategory === c.id
                      ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            
            {/* Search Box */}
            <div className="md:col-span-4 relative">
              <ClayInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services catalog..."
                className="pl-10 !mb-0"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Services Table */}
          {filteredServices.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[24px] shadow-sm">
              No services found matching search parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServices.map((svc) => (
                <ClayCard key={svc.id} className="cv-card flex flex-col justify-between gap-5 hover:border-emerald-300 bg-white shadow-sm border border-slate-200 p-6 rounded-[24px]">
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
                    <p className="text-xs text-slate-550 leading-relaxed line-clamp-2 min-h-[36px]">{svc.description || svc.desc}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">One-Time Activation:</span>
                        <strong className="text-slate-900 font-bold">₹{parseFloat(svc.activationFee || 49).toFixed(0)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Cost Per API:</span>
                        <strong className="text-emerald-700 font-extrabold text-sm">{svc.price}</strong>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Latency: <strong className="text-slate-700 font-semibold">{svc.latency || '150ms'}</strong></span>
                      <span>Success: <strong className="text-emerald-600 font-semibold">{svc.successRate || '99.5%'}</strong></span>
                    </div>

                    <div className="mt-2 w-full">
                      {isAdmin || svc.isActivated ? (
                        <div className="flex gap-2 items-center w-full">
                          <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activated
                          </div>
                          <ClayButton
                            variant="secondary"
                            onClick={() => {
                              setVerifyService(svc.key);
                              setActiveSubTab('sandbox');
                            }}
                            className="py-2 px-4 text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 shrink-0"
                          >
                            <Play className="w-3.5 h-3.5 fill-emerald-700" /> Try
                          </ClayButton>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleActivateService(svc.id)}
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
      )}

      {activeSubTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* Left Column: Sandbox Forms */}
          <div className="lg:col-span-5 text-left">
            <ClayCard className="flex flex-col gap-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Verification Sandbox</h3>
                
                <label className="block text-xs font-semibold text-slate-600 mb-2 font-display ml-1">Target Service API</label>
                {isAdmin && auditServices.length > 0 && (
                  <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Admin Sandbox Test Matrix</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {AUDIT_KEYS.map(key => {
                        const found = servicesList.some(s => s.key === key);
                        return (
                          <span key={key} className={`rounded-full border px-2 py-1 text-[9px] font-black ${found ? 'border-emerald-200 bg-white text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {key}: {found ? 'PASS' : 'Missing'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 max-h-[160px] overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                  {servicesList.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setVerifyService(service.key)}
                      className={`py-2 px-1 rounded-2xl text-[10px] font-bold font-display border transition-all duration-200 truncate ${
                        verifyService === service.key
                          ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title={service.name}
                    >
                      <span className="flex items-center justify-center gap-1 px-1">
                        {!isAdmin && !service.isActivated && <Lock className="w-2 h-2 shrink-0" />}
                        {service.key}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedService && !isAdmin && !selectedService.isActivated ? (
                  /* Locked service view */
                  <div className="p-6 bg-amber-50/50 border border-amber-200/60 rounded-[20px] flex flex-col gap-4 text-left font-sans shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-amber-100 border border-amber-200 rounded-2xl text-amber-700">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-amber-900 font-display">Service Lock Active</span>
                        <span className="text-xs text-amber-700 mt-1 leading-relaxed">
                          This API service has not been activated for your account yet. Purchase activation to run live Sandbox calls.
                        </span>
                      </div>
                    </div>
                    <div className="p-3.5 bg-white border border-amber-200 rounded-2xl flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500">One-Time Activation Fee:</span>
                        <strong className="text-slate-900 font-bold">₹{parseFloat(selectedService.activationFee || 49).toFixed(0)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500">Per API Request:</span>
                        <strong className="text-emerald-700 font-extrabold text-sm">{selectedService.price}</strong>
                      </div>
                    </div>
                    <ClayButton
                      variant="primary"
                      onClick={() => handleActivateService(selectedService.id)}
                      className="w-full py-3 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"
                    >
                      Unlock & Activate Service
                    </ClayButton>
                  </div>
                ) : (
                  /* Activated service form */
                  <form onSubmit={handleVerifyPlayground} className="flex flex-col gap-4">
                    {isAdmin && (
                      <div className="mb-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wide">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Admin Sandbox Access Enabled</span>
                      </div>
                    )}
                    {selectedService && selectedService.inputFields.map((field) => (
                      <ClayInput
                        key={field.name}
                        label={field.label}
                        value={playgroundInputs[field.name] || ''}
                        onChange={(e) => setPlaygroundInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder={getPlaceholderForField(field.name, field.label)}
                        required={field.required}
                        type={field.type || 'text'}
                      />
                    ))}

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
                      {isAdmin ? 'Admin sandbox calls bypass wallet and activation validation while still registering request activity.' : 'Calls made in the playground will deduct credits based on your pricing models, and register in your dashboard logs.'}
                    </div>

                    <ClayButton type="submit" variant="primary" disabled={playLoading} className="w-full mt-2">
                      {playLoading ? 'Invoking API Gateway...' : 'Execute Test Call'}
                    </ClayButton>
                  </form>
                )}
              </div>
            </ClayCard>
          </div>

          {/* Right Column: Console Output */}
          <div className="lg:col-span-7 flex flex-col gap-4 w-full">
            <div className="bg-[#090E1A] border border-[#1e293b] shadow-xl rounded-[24px] p-5 sm:p-6 min-h-[400px] flex-1 flex flex-col justify-between font-mono text-xs text-left">
              <div className="flex flex-col gap-3 pb-4 border-b border-[#1e293b] mb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[10px] uppercase text-[#94a3b8] font-sans font-bold">Response viewer</span>
                  {playMeta?.timestamp && <div className="mt-1 font-sans text-[10px] text-slate-500">{new Date(playMeta.timestamp).toLocaleString()}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2 font-sans">
                  {playResponse && (
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${responseSucceeded ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}` }>
                      {responseSucceeded ? 'Success' : 'Failed'}
                    </span>
                  )}
                  {playMeta?.provider && <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-sky-300">{playMeta.provider}</span>}
                  <button type="button" onClick={handleCopyResponse} disabled={!playResponse} className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-[10px] font-black uppercase text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
                    <Copy className="h-3 w-3" /> Copy JSON
                  </button>
                </div>
              </div>

              <div className="flex-1 select-text overflow-y-auto max-h-[350px] rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                {playLoading ? (
                  <div className="h-full flex flex-col items-center justify-center font-sans text-[#94a3b8] py-20">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span>{selectedService?.method || 'POST'} {selectedService?.endpoint || ''} ...</span>
                  </div>
                ) : playResponse ? (
                  <JsonValue value={playResponse} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center font-sans text-[#94a3b8] text-center py-20">
                    <span>API gateway response will appear here after execution.</span>
                  </div>
                )}
              </div>

              {playResponse && (
                <div className="mt-4 pt-4 border-t border-[#1e293b] font-sans grid grid-cols-1 gap-2 text-[10px] text-[#94a3b8] sm:grid-cols-3">
                  <span>Duration: <strong className="text-white">{playMeta?.durationMs || playResponse.latencyMs || '--'}ms</strong></span>
                  <span>Provider: <strong className="text-emerald-400">{playMeta?.provider || playResponse.provider || 'gateway'}</strong></span>
                  <span>Service: <strong className="text-white">{playMeta?.serviceKey || selectedService?.key || '--'}</strong></span>
                </div>
              )}
            </div>

            {playResponse && playResponse.success && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-[20px] text-amber-900 text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_8px_16px_rgba(245,158,11,0.06)] backdrop-blur-md text-left flex flex-col gap-2 font-sans">
                <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                  <span>⚠ Sandbox Demo Response</span>
                </div>
                <p className="leading-relaxed font-medium">
                  This response contains simulated demonstration data only.
                </p>
                <p className="leading-relaxed font-medium">
                  No real verification has been performed.
                </p>
                <p className="leading-relaxed font-medium">
                  Production APIs return live provider responses.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
