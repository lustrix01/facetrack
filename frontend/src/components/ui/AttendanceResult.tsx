import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Scan,
  Smile,
  WifiOff,
  Camera,
  Navigation,
  ShieldOff,
  CalendarOff,
  LogIn,
} from 'lucide-react';

// ─── Attendance Result Codes ──────────────────────────────────────────────────

export type AttendanceResultCode =
  | 'Present'
  | 'Late'
  | 'Absent'
  | 'Outside Allowed Area'
  | 'Face Not Recognized'
  | 'Smile Not Detected'
  | 'Attendance Closed'
  | 'Session Not Active'
  | 'Camera Permission Required'
  | 'GPS Permission Required'
  | 'Already Checked In'
  | 'Consent Required'
  | null;

// ─── Config Map ──────────────────────────────────────────────────────────────

interface ResultConfig {
  icon: React.ReactNode;
  label: string;
  wrapperClass: string;
  iconClass: string;
  badgeClass: string;
}

const RESULT_CONFIG: Record<Exclude<AttendanceResultCode, null>, ResultConfig> = {
  'Present': {
    icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
    label: 'Attendance Successful',
    wrapperClass: 'bg-emerald-50 border-emerald-200/80',
    iconClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  'Late': {
    icon: <Clock className="w-5 h-5 shrink-0" />,
    label: 'Attendance Recorded — Late',
    wrapperClass: 'bg-amber-50 border-amber-200/80',
    iconClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  'Absent': {
    icon: <XCircle className="w-5 h-5 shrink-0" />,
    label: 'Marked Absent',
    wrapperClass: 'bg-red-50 border-red-200/80',
    iconClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
  },
  'Outside Allowed Area': {
    icon: <MapPin className="w-5 h-5 shrink-0" />,
    label: 'Outside Allowed Area',
    wrapperClass: 'bg-orange-50 border-orange-200/80',
    iconClass: 'text-orange-500',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  'Face Not Recognized': {
    icon: <Scan className="w-5 h-5 shrink-0" />,
    label: 'Face Not Recognized',
    wrapperClass: 'bg-red-50 border-red-200/80',
    iconClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
  },
  'Smile Not Detected': {
    icon: <Smile className="w-5 h-5 shrink-0" />,
    label: 'Smile Detection Failed',
    wrapperClass: 'bg-blue-50 border-blue-200/80',
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'Attendance Closed': {
    icon: <CalendarOff className="w-5 h-5 shrink-0" />,
    label: 'Attendance Closed',
    wrapperClass: 'bg-slate-50 border-slate-200/80',
    iconClass: 'text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  'Session Not Active': {
    icon: <WifiOff className="w-5 h-5 shrink-0" />,
    label: 'Session Not Active',
    wrapperClass: 'bg-slate-50 border-slate-200/80',
    iconClass: 'text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  'Camera Permission Required': {
    icon: <Camera className="w-5 h-5 shrink-0" />,
    label: 'Camera Permission Required',
    wrapperClass: 'bg-amber-50 border-amber-200/80',
    iconClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  'GPS Permission Required': {
    icon: <Navigation className="w-5 h-5 shrink-0" />,
    label: 'GPS Permission Required',
    wrapperClass: 'bg-amber-50 border-amber-200/80',
    iconClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  'Already Checked In': {
    icon: <LogIn className="w-5 h-5 shrink-0" />,
    label: 'Already Checked In',
    wrapperClass: 'bg-blue-50 border-blue-200/80',
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'Consent Required': {
    icon: <ShieldOff className="w-5 h-5 shrink-0" />,
    label: 'Privacy Consent Required',
    wrapperClass: 'bg-amber-50 border-amber-200/80',
    iconClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
};

// ─── AttendanceResultBanner ────────────────────────────────────────────────────

interface AttendanceResultBannerProps {
  resultCode: AttendanceResultCode;
  message?: string | null;
  onDismiss?: () => void;
  className?: string;
}

export const AttendanceResultBanner: React.FC<AttendanceResultBannerProps> = ({
  resultCode,
  message,
  onDismiss,
  className = '',
}) => {
  if (!resultCode) return null;

  const config = RESULT_CONFIG[resultCode] ?? RESULT_CONFIG['Attendance Closed'];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative rounded-xl border p-4 flex items-start gap-3
        transition-all duration-300 animate-in shadow-2xs
        ${config.wrapperClass} ${className}
      `}
    >
      {/* Icon */}
      <span className={config.iconClass}>{config.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900">{config.label}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.badgeClass}`}
          >
            {resultCode}
          </span>
        </div>
        {message && (
          <p className="text-xs text-slate-600 leading-snug">{message}</p>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  present:    'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  late:       'bg-amber-50 text-amber-700 border-amber-200/80',
  absent:     'bg-red-50 text-red-700 border-red-200/80',
  active:     'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  inactive:   'bg-slate-100 text-slate-600 border-slate-200',
  ended:      'bg-slate-100 text-slate-600 border-slate-200',
  pending:    'bg-blue-50 text-blue-700 border-blue-200/80',
  completed:  'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'checked out': 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const key = status.toLowerCase();
  const style = STATUS_BADGE_STYLES[key] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style} ${className}`}
    >
      ● {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
    {icon && <div className="text-slate-300 mb-1">{icon}</div>}
    <p className="text-xs font-semibold text-slate-700">{title}</p>
    {description && <p className="text-xs text-slate-400 max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
