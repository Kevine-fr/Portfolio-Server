'use client';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, destructive,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card-gold p-6 max-w-md w-full animate-slide-up shadow-gold-lg">
        <p className="console-label mb-2">{`> system.prompt`}</p>
        <h3 className="text-xl text-whiteHex font-semibold mb-3">{title}</h3>
        {description && <p className="text-muted text-sm mb-6">{description}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={destructive ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
