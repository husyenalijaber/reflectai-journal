import React, { useState, useRef, useEffect } from 'react';
import { APAC_LANGUAGES, LanguageOption } from '../utils/languages.ts';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageSelectorProps {
  currentLanguage: string;
  onSelectLanguage: (code: string) => void;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption: LanguageOption =
    APAC_LANGUAGES.find((lang) => lang.code === currentLanguage) || APAC_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        id="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[#3c4043] hover:text-[#202124] transition-all cursor-pointer font-sans shadow-2xs ${
          compact
            ? 'px-2 py-1 text-xs'
            : 'px-2.5 py-1.5 text-xs font-medium'
        }`}
        title="Language"
      >
        <span className="w-5 h-4.5 rounded flex items-center justify-center text-[10px] font-bold font-mono tracking-wider bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
          {selectedOption.displayCode}
        </span>
        {!compact && (
          <span className="truncate max-w-[100px] text-xs font-medium">
            {selectedOption.nativeName}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-[#5f6368] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white border border-[#dadce0] shadow-xl py-1.5 z-50 font-sans"
          >
            <div className="px-3 py-1.5 border-b border-[#f1f3f4] flex items-center gap-1.5 text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Language</span>
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {APAC_LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer hover:bg-[#f1f3f4] group ${
                      isSelected
                        ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                        : 'text-[#3c4043]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono tracking-wider border transition-colors ${
                          isSelected
                            ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                            : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0] group-hover:bg-[#e8eaed]'
                        }`}
                      >
                        {lang.displayCode}
                      </span>
                      <div>
                        <div className="text-xs">{lang.name}</div>
                        <div className="text-[10px] text-[#80868b] leading-tight">
                          {lang.nativeName}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1a73e8]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

