import React from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { ClayButton, ClayBadge } from '../Claymorphic';
import VirtualList from '../VirtualList';

export default function ApiKeyManager({
  apiKeys,
  handleRevokeKey,
  setIsKeyModalOpen,
  copyToClipboard
}) {
  return (
    <div className="flex flex-col gap-6 w-full text-left">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold font-display text-slate-900">API Credentials Keys</h3>
        <ClayButton
          variant="primary"
          onClick={() => setIsKeyModalOpen(true)}
          aria-label="Generate a new API Key credentials"
          className="flex items-center gap-2 py-2 px-4 text-xs"
        >
          <Plus className="w-4 h-4" /> Generate API Key
        </ClayButton>
      </div>

      {apiKeys.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[16px]">
          Generate your first API key to start testing APIs.
        </div>
      ) : (
        <>
          {/* Desktop view table layout */}
          <div className="hidden md:flex flex-col w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden cv-card">
            {/* Table Header */}
            <div className="flex bg-slate-50 border-b border-slate-200 px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider font-display">
              <div className="w-[25%]">Name & Whitelisted IPs</div>
              <div className="w-[30%]">API Key String</div>
              <div className="w-[15%]">Rate (RPM)</div>
              <div className="w-[12%]">Usage</div>
              <div className="w-[10%]">Status</div>
              <div className="w-[8%]">Actions</div>
            </div>
            {/* Table Body */}
            <VirtualList
              items={apiKeys}
              itemHeight={110}
              height={400}
              renderItem={(key) => {
                const maskApiKey = (k) => {
                  if (!k) return '';
                  if (k.length > 12) {
                    return k.substring(0, 8) + '*'.repeat(k.length - 12) + k.substring(k.length - 4);
                  }
                  return 'vh_live_********';
                };

                return (
                  <div key={key.id} className="flex px-6 py-4 border-b border-slate-100 hover:bg-slate-50 items-center justify-between text-xs text-left h-[110px] transition-colors">
                    <div className="w-[25%] pr-2 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{key.name}</div>
                      {key.ipWhitelist && Array.isArray(key.ipWhitelist) && key.ipWhitelist.length > 0 && (
                        <div className="mt-1 text-[9px] text-slate-500 font-mono truncate">
                          IPs: {key.ipWhitelist.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="w-[30%] font-mono text-xs pr-2 flex items-center gap-2">
                      <span className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-slate-700 truncate select-all block max-w-full">
                        {key.status === 'REVOKED' ? '••••••••••••••••••••' : maskApiKey(key.key)}
                      </span>
                      {key.status === 'ACTIVE' && (
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          aria-label={`Copy API key string for ${key.name}`}
                          title="Copy Key"
                          className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="w-[15%] font-mono text-slate-700">{key.rateLimit} req/m</div>
                    <div className="w-[12%] font-mono text-slate-550">{key.usageCount} calls</div>
                    <div className="w-[10%]">
                      <ClayBadge status={key.status}>{key.status}</ClayBadge>
                    </div>
                    <div className="w-[8%]">
                      {key.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          aria-label={`Revoke API key ${key.name}`}
                          className="text-red-650 hover:text-red-850 font-semibold text-xs flex items-center gap-1.5 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>

          {/* Mobile view keys cards */}
          <div className="md:hidden w-full">
            <VirtualList
              items={apiKeys}
              itemHeight={225}
              height={500}
              renderItem={(key) => {
                const maskApiKey = (k) => {
                  if (!k) return '';
                  if (k.length > 12) {
                    return k.substring(0, 8) + '*'.repeat(k.length - 12) + k.substring(k.length - 4);
                  }
                  return 'vh_live_********';
                };
                return (
                  <div key={key.id} className="p-5 bg-white border border-slate-200 rounded-[20px] shadow-sm flex flex-col gap-3.5 text-left h-[215px] mb-2.5 cv-card">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-900">{key.name}</span>
                      <ClayBadge status={key.status}>{key.status}</ClayBadge>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-500 font-semibold">API Key:</span>
                      <div className="flex items-center gap-2 select-all w-full">
                        <span className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 block truncate flex-1">
                          {key.status === 'REVOKED' ? '••••••••••••••••••••' : maskApiKey(key.key)}
                        </span>
                        {key.status === 'ACTIVE' && (
                          <button
                            onClick={() => copyToClipboard(key.key)}
                            aria-label={`Copy key string for ${key.name}`}
                            title="Copy Key"
                            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <span>Rate: <strong className="text-slate-800">{key.rateLimit} req/m</strong></span>
                      <span>Usage: <strong className="text-slate-800">{key.usageCount} calls</strong></span>
                    </div>
                    {key.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        aria-label={`Revoke API key ${key.name}`}
                        className="w-full mt-1.5 py-2 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-850 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke API Key
                      </button>
                    )}
                  </div>
                );
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
