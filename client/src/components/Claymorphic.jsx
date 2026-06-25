import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * 1. ClayCard
 */
export const ClayCard = React.memo(({ children, className = '', onClick, ...props }) => {
  return (
    <motion.div
      whileHover={onClick ? { y: -6, scale: 1.01 } : { y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`bg-white/95 dark:bg-charcoal-surface border border-slate-200/80 dark:border-slate-700 shadow-clay-card hover:shadow-clay-card-hover rounded-clay p-6 text-text-primary dark:text-slate-50 transition-all duration-300 backdrop-blur-sm ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export const ServiceCard = React.memo(({ children, ...props }) => (
  <ClayCard {...props}>{children}</ClayCard>
));

export const DashboardCard = React.memo(({ children, ...props }) => (
  <ClayCard {...props}>{children}</ClayCard>
));

export const ApiKeyCard = React.memo(({ children, ...props }) => (
  <ClayCard {...props}>{children}</ClayCard>
));

export const WalletCard = React.memo(({ children, ...props }) => (
  <ClayCard {...props}>{children}</ClayCard>
));

/**
 * 2. ClayButton
 */
export const ClayButton = ({ children, variant = 'primary', className = '', onClick, type = 'button', disabled = false, ...props }) => {
  const themes = {
    primary: 'bg-primary text-white shadow-clay-primary hover:shadow-clay-primary-hover hover:bg-primary-hover',
    secondary: 'bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200',
    accent: 'bg-accent text-white font-bold shadow-clay-accent hover:bg-accent-hover',
    danger: 'bg-danger text-white shadow-[0_12px_24px_rgba(239,68,68,0.20)] hover:bg-red-600'
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.97, y: 0 }}
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`rounded-full px-6 py-3 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40 disabled:cursor-not-allowed ${themes[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

/**
 * 3. ClayInput
 */
export const ClayInput = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 font-display mb-2 ml-2">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-white dark:bg-charcoal-surface text-slate-900 dark:text-slate-50 placeholder:text-slate-400 rounded-full px-5 py-3 border border-slate-300 dark:border-slate-700 shadow-clay-input focus:shadow-clay-input-focus focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 outline-none ${className}`}
        {...props}
      />
    </div>
  );
};

/**
 * 4. ClayModal
 */
export const ClayModal = ({ isOpen, onClose, title, children, className = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-text-primary/20 backdrop-blur-md" onClick={onClose} />
      
      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative z-10 w-full max-w-lg bg-white dark:bg-charcoal-surface border border-slate-200 dark:border-slate-700 shadow-clay-card-hover rounded-clay-lg p-8 max-h-[90vh] overflow-y-auto ${className}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold font-display text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-text-primary transition-colors text-2xl font-light w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border"
          >
            &times;
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

/**
 * 5. ClaySidebar
 */
export const ClaySidebar = ({ children, className = '' }) => {
  return (
    <aside className={`bg-white/95 dark:bg-charcoal-surface border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between backdrop-blur-xl h-[100dvh] w-64 fixed left-0 top-0 z-30 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin] shadow-[10px_0_30px_rgba(15,23,42,0.02)] ${className}`}>
      {children}
    </aside>
  );
};

/**
 * 6. ClayTable
 */
export const ClayTable = ({ headers, children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-clay-sm border border-border shadow-clay-input bg-white">
      <table className={`w-full text-left border-collapse ${className}`}>
        <thead>
          <tr className="border-b border-border bg-background text-text-secondary font-display text-xs font-bold uppercase tracking-wider">
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm text-text-primary">
          {children}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 7. ClayWidget
 */
export const ClayWidget = ({ title, value, subtext, icon: Icon, color = 'primary', className = '' }) => {
  const textColors = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    danger: 'text-red-500'
  };

  return (
    <ClayCard className={`flex items-center justify-between min-w-[200px] hover:border-primary/20 ${className}`}>
      <div className="flex flex-col">
        <span className="text-xs font-semibold font-display text-text-secondary uppercase tracking-wider mb-2">{title}</span>
        <span className="text-2xl font-bold font-display text-text-primary">{value}</span>
        {subtext && <span className="text-xs text-muted mt-1">{subtext}</span>}
      </div>
      {Icon && (
        <div className={`p-4 rounded-full bg-background border border-border shadow-clay-input ${textColors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </ClayCard>
  );
};

/**
 * 8. ClayBadge
 */
export const ClayBadge = ({ status, children }) => {
  const currentStatus = (status || children || '').toUpperCase().trim();
  const styles = {
    SUCCESS: 'bg-accent/15 border-accent/30 text-accent',
    COMPLETED: 'bg-accent/15 border-accent/30 text-accent',
    ACTIVE: 'bg-accent/15 border-accent/30 text-accent',
    FAILED: 'bg-red-500/10 border-red-500/20 text-red-600',
    ERROR: 'bg-red-500/10 border-red-500/20 text-red-600',
    REVOKED: 'bg-red-500/10 border-red-500/20 text-red-600',
    PENDING: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600',
    PROCESSING: 'bg-teal-500/15 border-teal-500/30 text-teal-600',
    REVERSED: 'bg-purple-500/15 border-purple-500/30 text-purple-600'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[currentStatus] || 'bg-background border-border text-text-secondary'}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-2 bg-current opacity-75" />
      {children || status}
    </span>
  );
};

/**
 * 9. ClayTabs
 */
export const ClayTabs = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`inline-flex p-1.5 bg-background border border-border shadow-clay-input rounded-full ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-2 rounded-full text-sm font-semibold font-display transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-primary text-white shadow-clay-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

/**
 * 10. ClayDropdown
 */
export const ClayDropdown = ({ label, options, selected, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(o => o.value === selected);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {label && <label className="block text-xs font-semibold text-text-secondary mb-1.5 font-display ml-1">{label}</label>}
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-between items-center w-full rounded-full bg-background border border-border shadow-clay-input px-5 py-3 text-sm text-text-primary font-medium outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>{selectedOption ? selectedOption.label : 'Select option'}</span>
          <svg className="w-5 h-5 ml-2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-3 w-56 rounded-clay bg-white border border-border shadow-clay-card-hover z-50 p-2 overflow-hidden">
          <div className="py-1" role="menu">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  selected === option.value
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
                role="menuitem"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
