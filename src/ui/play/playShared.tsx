/* eslint-disable react-refresh/only-export-components -- shared play-mode panel shell + close helper */
import type { ReactNode } from 'react';
import { useUiStore } from '../../stores/uiStore';

// Kit — shared shell for play-mode tool panels: a floating, dismissable card centred above the toolbar.
export const PanelCard = ({ title, icon, onClose, children, width = '22rem' }: {
  title: string; icon: string; onClose: () => void; children: ReactNode; width?: string;
}) => (
  <div style={{ width }} className="pointer-events-auto fixed bottom-20 left-1/2 z-[78] max-h-[64vh] -translate-x-1/2 overflow-auto rounded-2xl border border-slate-700/60 bg-slate-950/90 p-3 text-slate-100 shadow-2xl backdrop-blur-md">
    <div className="mb-2 flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <h3 className="flex-1 text-sm font-bold text-cyan-100">{title}</h3>
      <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
    </div>
    {children}
  </div>
);

export const closePanel = () => useUiStore.getState().closePanel();
