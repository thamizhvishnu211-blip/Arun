import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Sprout, X } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E5DF] mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">{title}</h1>
        {subtitle && <p className="text-sm text-[#525B56] mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = ''
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white border border-[#E2E5DF] rounded-xl p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-[#EEF0EB]">
          <div>
            {title && <h2 className="text-base font-semibold text-[#1C1F1D]">{title}</h2>}
            {subtitle && <p className="text-xs text-[#525B56] mt-1">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 px-6 text-center border border-dashed border-[#D3D9CE] rounded-xl bg-[#FAFBF8]">
      <div className="w-10 h-10 rounded-lg bg-[#E9F2EC] text-[#1B4332] flex items-center justify-center mx-auto mb-3">
        <Sprout className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#1C1F1D]">{title}</h3>
      <p className="text-xs text-[#525B56] mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatusLabel({ status, label }: { status: string; label?: string }) {
  const normalized = status.toLowerCase();
  let colorClass = 'text-[#525B56]';
  if (
    ['verified', 'completed', 'healthy', 'available', 'accepted', 'delivered', 'resolved', 'active', 'published'].includes(
      normalized
    )
  ) {
    colorClass = 'text-[#166534]';
  } else if (
    ['pending', 'watch', 'processing', 'in_progress', 'ready_for_pickup', 'shipped', 'scheduled', 'reserved', 'waiting_for_response'].includes(
      normalized
    )
  ) {
    colorClass = 'text-[#B45309]';
  } else if (['rejected', 'cancelled', 'at_risk', 'suspended', 'flagged', 'removed', 'urgent', 'high'].includes(normalized)) {
    colorClass = 'text-[#B91C1C]';
  }
  return (
    <span className={`text-xs font-semibold tracking-tight whitespace-nowrap ${colorClass}`}>
      {label || status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
    </span>
  );
}

export function FeedbackBanner({
  type,
  message,
  onDismiss
}: {
  type: 'success' | 'error' | 'info';
  message: string;
  onDismiss?: () => void;
}) {
  const styles =
    type === 'success'
      ? 'bg-[#EEF6F0] border-[#B7DFC2] text-[#14532D]'
      : type === 'error'
        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
        : 'bg-[#FDF5E3] border-[#F3D99B] text-[#785109]';

  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm mb-5 ${styles}`} role="status">
      <div className="flex items-start gap-2.5">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        )}
        <span className="leading-relaxed">{message}</span>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100 p-0.5" aria-label="Dismiss message">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E5DF] rounded-xl max-w-md w-full p-6 shadow-lg">
        <h3 className="text-base font-semibold text-[#1C1F1D]">{title}</h3>
        <p className="text-sm text-[#525B56] mt-2 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#525B56] bg-white border border-[#E2E5DF] rounded-lg hover:bg-[#F8F7F2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              destructive ? 'bg-[#B91C1C] hover:bg-[#991B1B]' : 'bg-[#1B4332] hover:bg-[#143325]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle = 'AgriSphere'
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] flex flex-col items-center justify-center text-white/90 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sprout className="w-8 h-8 mb-2 opacity-85" />
        <span className="text-xs font-medium tracking-wide opacity-90 text-center">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
