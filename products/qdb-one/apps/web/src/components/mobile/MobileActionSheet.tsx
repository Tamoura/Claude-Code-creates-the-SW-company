'use client';

import { useEffect } from 'react';

interface ActionItem {
  label: string;
  icon?: string;
  onClick: () => void;
  destructive?: boolean;
}

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: ActionItem[];
}

export default function MobileActionSheet({ isOpen, onClose, title, actions }: MobileActionSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--card-bg)] rounded-t-2xl animate-slide-up mobile-safe-bottom">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
        <div className="px-6 py-4">
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">{title}</h3>
          <div className="space-y-1">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.onClick(); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left active:bg-gray-50 transition-colors ${
                  action.destructive ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'
                }`}
              >
                {action.icon && <span className="text-lg">{action.icon}</span>}
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-4 text-center text-sm font-medium text-[var(--muted)] border-t border-[var(--border)] active:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
