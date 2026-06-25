import React from 'react';
import { Search, Inbox } from 'lucide-react';
import { ClayButton, ClayCard, ClayInput, ClayModal, ClayBadge, ClayDropdown, ClayTable, ClayWidget, ClaySidebar } from './Claymorphic';

export const PageHeader = ({ title, description, actions, eyebrow }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const SectionHeader = ({ title, description, action }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      {description && <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>}
    </div>
    {action}
  </div>
);

export const HeroSection = ({ eyebrow, title, description, children, actions }) => (
  <section className="relative overflow-hidden rounded-[32px] border border-emerald-100 bg-[linear-gradient(135deg,#0F172A_0%,#115E59_48%,#16A34A_100%)] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
    <div className="relative z-10 max-w-3xl">
      {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">{eyebrow}</p>}
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
      {description && <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-emerald-50/85">{description}</p>}
      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
    </div>
    {children && <div className="relative z-10 mt-8">{children}</div>}
  </section>
);

export const DashboardHero = HeroSection;
export const ProfileHero = HeroSection;
export const MetricCard = ClayWidget;
export const AnalyticsCard = ClayCard;
export const WalletCard = ClayCard;
export const VerificationCard = ClayCard;
export const IdentityCard = ClayCard;
export const MarketplaceCard = ClayCard;
export const ServiceCard = ClayCard;
export const PricingCard = ClayCard;
export const StatusBadge = ClayBadge;
export const ModernTable = ClayTable;
export const ModernModal = ClayModal;
export const ModernInput = ClayInput;
export const ModernSelect = ClayDropdown;
export const PrimaryButton = (props) => <ClayButton variant="primary" {...props} />;
export const SecondaryButton = (props) => <ClayButton variant="secondary" {...props} />;
export const DangerButton = (props) => <ClayButton variant="danger" {...props} />;
export const ActionButton = ClayButton;
export const Sidebar = ClaySidebar;
export const Navbar = ({ children }) => <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl">{children}</nav>;
export const Footer = ({ children }) => <footer className="border-t border-slate-200 px-6 py-8 text-sm text-slate-500">{children}</footer>;

export const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative w-full">
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input value={value} onChange={onChange} placeholder={placeholder} className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
  </div>
);

export const Timeline = ({ items = [] }) => (
  <div className="space-y-4 border-l border-slate-200 pl-5">
    {items.map((item, i) => (
      <div key={item.id || i} className="relative">
        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
        <div className="text-sm font-bold text-slate-900">{item.title || item.description}</div>
        {item.meta && <div className="text-xs text-slate-500">{item.meta}</div>}
      </div>
    ))}
  </div>
);

export const NotificationCard = ClayCard;
export const ActivityCard = ClayCard;
export const SkeletonLoader = ({ className = '' }) => <div className={'animate-pulse rounded-[24px] bg-slate-200/80 ' + className} />;
export const EmptyState = ({ title = 'Nothing here yet', description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center">
    <Inbox className="h-9 w-9 text-slate-300" />
    <h3 className="mt-3 text-sm font-black text-slate-900">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
