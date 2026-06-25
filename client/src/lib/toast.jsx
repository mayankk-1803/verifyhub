import React, { useEffect, useState } from 'react';

const EVENT_NAME = 'dizipay:toast';
const DEFAULT_DURATION = 3600;

const sanitizeToastMessage = (message, type = 'info') => {
  const fallback = type === 'success' ? 'Done' : 'Something went wrong';
  const text = String(message || fallback);
  if (/prisma|sql|stack|trace|constraint|database|provider route|jwt|token|password|secret|undefined/i.test(text)) return fallback;
  return text.length > 160 ? fallback : text;
};

const emitToast = (message, type = 'info', options = {}) => {
  if (typeof window === 'undefined') return null;
  const id = options.id || `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: {
      id,
      message: sanitizeToastMessage(message, type),
      type,
      duration: options.duration ?? DEFAULT_DURATION
    }
  }));
  return id;
};

export const toast = {
  success: (message, options) => emitToast(message, 'success', options),
  error: (message, options) => emitToast(message, 'error', options),
  loading: (message, options) => emitToast(message, 'loading', { duration: 0, ...options }),
  info: (message, options) => emitToast(message, 'info', options),
  dismiss: (id) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id, dismiss: true } }));
  }
};

const toneMap = {
  success: 'border-emerald-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(16,185,129,0.18)]',
  error: 'border-red-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(239,68,68,0.18)]',
  loading: 'border-slate-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.12)]',
  info: 'border-slate-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.12)]'
};

const dotMap = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  loading: 'bg-amber-500 animate-pulse',
  info: 'bg-slate-900'
};

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (event) => {
      const detail = event.detail || {};
      if (detail.dismiss) {
        setItems(prev => prev.filter(item => item.id !== detail.id));
        return;
      }

      setItems(prev => {
        const next = prev.filter(item => item.id !== detail.id);
        return [...next, detail].slice(-4);
      });

      if (detail.duration > 0) {
        window.setTimeout(() => {
          setItems(prev => prev.filter(item => item.id !== detail.id));
        }, detail.duration);
      }
    };

    window.addEventListener(EVENT_NAME, onToast);
    return () => window.removeEventListener(EVENT_NAME, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-32px))] flex-col gap-3 pointer-events-none">
      {items.map(item => (
        <div key={item.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur-xl transition-all ${toneMap[item.type] || toneMap.info}`} role="status" aria-live="polite">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotMap[item.type] || dotMap.info}`} />
          <span className="min-w-0 flex-1 leading-5">{item.message}</span>
          <button type="button" onClick={() => toast.dismiss(item.id)} className="ml-2 text-slate-400 hover:text-slate-900" aria-label="Dismiss notification">x</button>
        </div>
      ))}
    </div>
  );
}

export const sanitizeToastError = (err, fallback = 'Something went wrong') => {
  const raw = err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
  const text = String(raw);
  if (/prisma|sql|stack|trace|constraint|database|provider route|undefined/i.test(text)) return fallback;
  return text.length > 140 ? fallback : text;
};

export default toast;
