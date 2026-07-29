import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persist until dismissed
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  success: (title: string, message?: string) => string;
  error:   (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info:    (title: string, message?: string) => string;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counters = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>): string => {
    const id = `toast-${++counters.current}`;
    const duration = opts.duration ?? (opts.variant === 'error' ? 6000 : 4000);
    setToasts((prev) => [...prev.slice(-4), { ...opts, id, duration }]); // max 5 visible
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ variant: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ variant: 'error',   title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ variant: 'warning', title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ variant: 'info',    title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { wrapper: string; icon: React.ReactNode; bar: string }> = {
  success: {
    wrapper: 'bg-white border border-emerald-200 shadow-emerald-100/60',
    icon: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />,
    bar: 'bg-emerald-500',
  },
  error: {
    wrapper: 'bg-white border border-red-200 shadow-red-100/60',
    icon: <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />,
    bar: 'bg-red-500',
  },
  warning: {
    wrapper: 'bg-white border border-amber-200 shadow-amber-100/60',
    icon: <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />,
    bar: 'bg-amber-400',
  },
  info: {
    wrapper: 'bg-white border border-blue-200 shadow-blue-100/60',
    icon: <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />,
    bar: 'bg-blue-500',
  },
};

const ToastItem: React.FC<{ toast: Toast; dismiss: (id: string) => void }> = ({ toast: t, dismiss }) => {
  const [visible, setVisible] = useState(false);
  const { wrapper, icon, bar } = VARIANT_STYLES[t.variant];

  useEffect(() => {
    // Trigger enter animation on mount
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative flex items-start gap-3 w-full max-w-sm rounded-xl shadow-lg px-4 py-3.5 overflow-hidden
        transition-all duration-300 ease-out
        ${wrapper}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {/* Coloured left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${bar}`} />

      <div className="ml-1">{icon}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{t.title}</p>
        {t.message && (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.message}</p>
        )}
      </div>

      <button
        onClick={() => dismiss(t.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Auto-dismiss progress bar */}
      {t.duration && t.duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${bar} opacity-30`}
          style={{
            width: '100%',
            animation: `toast-shrink ${t.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
};

// ─── Container ───────────────────────────────────────────────────────────────

const ToastContainer: React.FC<{ toasts: Toast[]; dismiss: (id: string) => void }> = ({ toasts, dismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      style={{ maxWidth: '22rem' }}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full">
          <ToastItem toast={t} dismiss={dismiss} />
        </div>
      ))}
    </div>
  );
};
