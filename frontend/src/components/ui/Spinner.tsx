import React from 'react';

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SPINNER_SIZES = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`
      inline-block rounded-full border-gray-200 border-t-blue-600
      animate-spin shrink-0
      ${SPINNER_SIZES[size]} ${className}
    `}
  />
);

// ─── LoadingOverlay ───────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-3 ${
      fullScreen ? 'fixed inset-0 bg-white/80 z-50 backdrop-blur-sm' : 'py-12 w-full'
    }`}
  >
    <Spinner size="lg" />
    {message && (
      <p className="text-sm font-medium text-gray-500 animate-pulse">{message}</p>
    )}
  </div>
);

// ─── InlineLoader ─────────────────────────────────────────────────────────────

interface InlineLoaderProps {
  message?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({ message, className = '' }) => (
  <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
    <Spinner size="sm" />
    {message && <span>{message}</span>}
  </div>
);

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);
