import React, { useEffect } from 'react';
import { Trash2, LogOut, AlertTriangle, X } from 'lucide-react';

export type ConfirmModalType = 'danger' | 'warning' | 'primary';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmModalType;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const iconBg =
    type === 'danger'
      ? 'bg-[#fce8e6] text-[#ea4335] border border-[#fad2cf]'
      : type === 'warning'
      ? 'bg-[#fef7e0] text-[#e37400] border border-[#fde293]'
      : 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]';

  const confirmBtnBg =
    type === 'danger'
      ? 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-xs'
      : type === 'warning'
      ? 'bg-[#e37400] hover:bg-[#b06000] text-white shadow-xs'
      : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#dadce0] w-full max-w-md p-6 text-left transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              {type === 'danger' ? (
                <Trash2 className="w-5 h-5" />
              ) : type === 'primary' ? (
                <LogOut className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#202124] leading-snug">
                {title}
              </h3>
              <p className="text-xs text-[#5f6368] mt-1 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end space-x-2.5 mt-6 pt-4 border-t border-[#f1f3f4]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#3c4043] bg-white border border-[#dadce0] hover:bg-[#f8f9fa] transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 ${confirmBtnBg}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin mr-1" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
