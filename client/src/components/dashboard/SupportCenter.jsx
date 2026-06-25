import React from 'react';
import { ClayCard, ClayButton, ClayInput, ClayDropdown, ClayBadge } from '../Claymorphic';

export default function SupportCenter({
  tickets,
  newTicketSubject,
  setNewTicketSubject,
  newTicketDesc,
  setNewTicketDesc,
  newTicketCategory,
  setNewTicketCategory,
  newTicketPriority,
  setNewTicketPriority,
  handleCreateTicket,
  setIsTicketModalOpen
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      {/* Create Ticket */}
      <div className="lg:col-span-5 text-left">
        <ClayCard className="flex flex-col gap-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 mb-2">Create Ticket</h3>
            <p className="text-xs text-slate-600 mb-6">Ask support questions or flag provider endpoint failures.</p>

            <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
              <ClayInput
                label="Subject Topic"
                type="text"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                placeholder="e.g. Need higher rate limit"
                required
              />
              <div className="w-full mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-2 font-display ml-2">Description</label>
                <textarea
                  className="w-full bg-white text-slate-900 rounded-[16px] p-4 border border-slate-300 shadow-sm outline-none text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                  rows="4"
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="Detail the issue or help requested..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <ClayDropdown
                  label="Priority"
                  options={[
                    { label: 'Low', value: 'LOW' },
                    { label: 'Medium', value: 'MEDIUM' },
                    { label: 'High', value: 'HIGH' }
                  ]}
                  selected={newTicketPriority}
                  onChange={setNewTicketPriority}
                />
                <ClayDropdown
                  label="Category"
                  options={[
                    { label: 'API Issue', value: 'API Integration' },
                    { label: 'Billing / Wallet', value: 'Billing' },
                    { label: 'Other', value: 'Other' }
                  ]}
                  selected={newTicketCategory}
                  onChange={setNewTicketCategory}
                />
              </div>

              <ClayButton type="submit" variant="primary" className="w-full mt-4">
                Create Support Ticket
              </ClayButton>
            </form>
          </div>
        </ClayCard>
      </div>

      {/* Ticket Listings */}
      <div className="lg:col-span-7 flex flex-col gap-4 text-left">
        <h3 className="text-lg font-bold font-display text-slate-900">Ticket History</h3>
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-slate-200 bg-slate-50 rounded-[16px]">
            No support tickets created yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {tickets.map((t) => (
              <ClayCard key={t.id} className="p-5 flex flex-col gap-3 bg-white border border-slate-200 rounded-[16px] shadow-sm">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-900 font-display">{t.subject}</h4>
                  <div className="flex gap-2">
                    <ClayBadge status={t.status}>{t.status}</ClayBadge>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 font-mono uppercase">{t.priority}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-650 leading-relaxed">{t.description}</p>
                <span className="text-[10px] text-slate-400 block text-right mt-1 font-sans">Created: {new Date(t.createdAt).toLocaleDateString()}</span>
              </ClayCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
