import React from 'react';
import { PanelLeft, BarChart2 } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector.tsx';

interface NavbarProps {
  onOpenTrends?: () => void;
  entriesCount?: number;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  currentLanguage: string;
  onSelectLanguage: (code: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTrends,
  entriesCount = 0,
  onToggleSidebar,
  isSidebarOpen = true,
  currentLanguage,
  onSelectLanguage,
}) => {
  return (
    <header className="w-full bg-white text-[#202124] border-b border-[#dadce0] px-3 sm:px-5 py-2.5 flex items-center justify-between shrink-0 font-sans shadow-xs z-30">
      {/* Left: Sidebar Toggle & Brand */}
      <div className="flex items-center space-x-2.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition cursor-pointer"
            title={isSidebarOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2">
          <img
            src="/logo.png"
            alt="ReflectAI Logo"
            className="w-7 h-7 rounded-lg border border-[#dadce0] object-cover shadow-2xs"
          />
          <div className="hidden sm:block">
            <h1 className="font-semibold text-sm tracking-tight text-[#202124] flex items-center gap-1 leading-none">
              <span>ReflectAI</span>
              <span className="text-[11px] font-normal text-[#5f6368]">Journal</span>
            </h1>
            <p className="text-[10px] text-[#80868b] leading-tight font-normal">
              Built by Husyen Ali Alhabsy
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls: APAC Language Selector & Emotional Trends */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* APAC Country Language Dropdown */}
        <LanguageSelector
          currentLanguage={currentLanguage}
          onSelectLanguage={onSelectLanguage}
        />

        {/* Emotional Trends Button */}
        {onOpenTrends && entriesCount > 0 && (
          <button
            onClick={onOpenTrends}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#d2e3fc] transition cursor-pointer"
            title="Lihat tren emosi & analitik"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span className="hidden sm:inline">Emotional Trends</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-[#1967d2] font-semibold">
              {entriesCount}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
