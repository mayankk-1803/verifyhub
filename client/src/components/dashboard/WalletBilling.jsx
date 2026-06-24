import React from 'react';
import { Copy } from 'lucide-react';
import { ClayCard, ClayButton, ClayInput, ClayTable } from '../Claymorphic';

export default function WalletBilling({
  rechargeAmount,
  setRechargeAmount,
  handleRechargeWallet,
  invoices,
  copyToClipboard
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      {/* Recharge Controls - Disabled in Lockdown Mode */}
      <div className="lg:col-span-5 text-left">
        <ClayCard className="flex flex-col gap-6 bg-slate-50 border border-amber-200/60 rounded-[24px] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex flex-col gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
              !
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 mb-2">Wallet Recharge Locked</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Self-service wallet top-ups are currently unavailable. 
                Dizipay is operating in <strong>Wallet Lockdown Mode</strong>. 
                Please contact your administrator or support team to adjust your wallet balance.
              </p>
            </div>
            
            <div className="w-full h-px bg-slate-200/60 my-2" />
            
            <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed font-sans">
              ℹ Wallet balances may only be modified by Super Admins via manual adjustments, service subscriptions, or system deductions.
            </div>
          </div>
        </ClayCard>
      </div>

      {/* Billing Ledger Invoices */}
      <div className="lg:col-span-7 flex flex-col gap-4 text-left">
        <h3 className="text-lg font-bold font-display text-slate-900">Billing Invoices</h3>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[16px]">
            No invoices generated yet. Perform a balance recharge to generate PDFs.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block w-full overflow-x-auto">
              <ClayTable headers={['Invoice Number', 'Amount', 'Date', 'Download']}>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 font-extrabold text-violet-600">₹{parseFloat(inv.amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-sans">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => copyToClipboard(inv.fileUrl)}
                        className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:underline font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy PDF Link
                      </button>
                    </td>
                  </tr>
                ))}
              </ClayTable>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-4 md:hidden w-full">
              {invoices.map((inv) => (
                <ClayCard key={inv.id} className="p-5 bg-white border border-slate-200 rounded-[20px] shadow-sm flex flex-col gap-3 text-left">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(inv.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Amount:</span>
                    <strong className="text-violet-650 font-extrabold text-sm">₹{parseFloat(inv.amount).toFixed(2)}</strong>
                  </div>
                  <button
                    onClick={() => copyToClipboard(inv.fileUrl)}
                    className="w-full mt-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Invoice PDF Link
                  </button>
                </ClayCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
