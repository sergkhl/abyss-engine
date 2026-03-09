import React from 'react';

interface ModalWrapperProps {
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
}

const BASE_OVERLAY_CLASS =
  'fixed inset-0 bg-black/80 z-[100] flex items-center justify-center overflow-hidden p-0 sm:p-4';

const BASE_PANEL_CLASS =
  'relative w-[min(100%,40rem)] max-w-full max-h-[95vh] bg-slate-800 border border-slate-700 rounded-[20px] overflow-hidden p-3 sm:p-6 flex flex-col min-h-0';

export function ModalWrapper({
  onClose,
  children,
  overlayClassName = '',
  panelClassName = '',
}: ModalWrapperProps) {
  return (
    <div
      className={`${BASE_OVERLAY_CLASS}${overlayClassName ? ` ${overlayClassName}` : ''}`}
      onClick={onClose}
    >
      <div
        className={`${BASE_PANEL_CLASS}${panelClassName ? ` ${panelClassName}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default ModalWrapper;
