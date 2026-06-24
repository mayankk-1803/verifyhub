import React from 'react';
import { Trash2 } from 'lucide-react';
import { ClayCard, ClayButton, ClayInput, ClayTable, ClayBadge } from '../Claymorphic';

export default function WebhooksConfig({
  webhooks,
  newWebhookUrl,
  setNewWebhookUrl,
  handleCreateWebhook,
  handleDeleteWebhook,
  handleFetchWebhookLogs,
  activeWebhookId,
  webhookLogs
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      {/* Setup Form */}
      <div className="lg:col-span-5 text-left">
        <ClayCard className="flex flex-col gap-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 mb-2">Webhooks Setup</h3>
            <p className="text-xs text-slate-650 mb-6">Configure target servers to receive callback requests on updates.</p>

            <form onSubmit={handleCreateWebhook} className="flex flex-col gap-4">
              <ClayInput
                label="Destination URL (HTTPS)"
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://mybackend.com/webhook"
                required
              />

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
                ℹ️ We sign webhook postbacks with SHA256 HMAC hash. Signature is passed in the header: <code className="text-slate-900 font-bold">X-Dizipay-Signature</code>.
              </div>

              <ClayButton type="submit" variant="primary" className="w-full mt-2">
                Register Webhook URL
              </ClayButton>
            </form>
          </div>
        </ClayCard>
      </div>

      {/* List and Log Details */}
      <div className="lg:col-span-7 flex flex-col gap-6 text-left">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold font-display text-slate-900">Webhook Endpoints</h3>
          {webhooks.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[16px]">
              No webhook endpoints configured.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {webhooks.map((w) => (
                <ClayCard key={`webhook-card-${w.id}`} className="p-4 flex justify-between items-center bg-white border border-slate-200 rounded-[16px] shadow-sm">
                  <div className="flex flex-col gap-1 min-w-0 text-left">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[280px]">{w.url}</span>
                    <span className="text-[9px] font-mono text-slate-500 select-all">Secret: {w.secretKey}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleFetchWebhookLogs(w.id)}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(w.id)}
                      className="text-red-650 hover:text-red-850 font-semibold"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </ClayCard>
              ))}
            </div>
          )}
        </div>

        {/* Delivery logs details if active */}
        {activeWebhookId && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold font-display text-slate-900">Webhook Delivery Logs (attempts)</h3>
            {webhookLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[16px]">
                No webhook postbacks enqueued or triggered yet.
              </div>
            ) : (
              <ClayTable headers={['Event', 'Status', 'Code', 'Body Response', 'Date']}>
                {webhookLogs.map((log, idx) => (
                  <tr key={`webhook-log-${log.id || idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-xs text-slate-800">{log.eventType}</td>
                    <td className="px-6 py-4">
                      <ClayBadge status={log.success ? 'SUCCESS' : 'FAILED'} />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{log.statusCode || 'Timeout/Err'}</td>
                    <td className="px-6 py-4 text-xs max-w-[150px] truncate text-slate-500 select-all">{log.responseBody}</td>
                    <td className="px-6 py-4 text-slate-400 text-[10px]">{new Date(log.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </ClayTable>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
