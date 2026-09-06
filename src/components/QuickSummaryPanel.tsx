import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  TrendingUp,
  Brain,
  ListTodo,
  Smile,
  ShieldCheck,
  ChevronRight,
  X,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { JournalEntry } from '../types';

interface QuickSummaryPanelProps {
  entry: JournalEntry;
  currentLanguage?: string;
  onClose?: () => void;
  className?: string;
}


interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export const QuickSummaryPanel: React.FC<QuickSummaryPanelProps> = ({
  entry,
  currentLanguage = 'id',
  onClose,
  className = '',
}) => {
  // Extract sentiment and mood analysis from user messages and summary
  const moodAnalysis = useMemo(() => {
    if (!entry.messages || entry.messages.length === 0) {
      return {
        label: 'Tenang & Terbuka',
        color: 'text-[#1a73e8]',
        bgColor: 'bg-[#e8f0fe]',
        borderColor: 'border-[#d2e3fc]',
        intensity: 'Netral',
        description: 'Mulai dialog untuk mendeteksi dinamika emosi dan benang merah pikiranmu.',
      };
    }

    const allUserText = entry.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.toLowerCase())
      .join(' ');

    // Sentiment keywords heuristic
    const anxiousKeywords = ['cemas', 'takut', 'bingung', 'panik', 'lelah', 'stres', 'khawatir', 'stress', 'overthinking', 'beban'];
    const positiveKeywords = ['senang', 'bahagia', 'bersyukur', 'lega', 'puas', 'semangat', 'tercapai', 'tenang', 'joy', 'damai'];
    const heavyKeywords = ['sedih', 'kecewa', 'marah', 'sulit', 'gagal', 'menyesal', 'sakit'];

    let anxiousScore = 0;
    let positiveScore = 0;
    let heavyScore = 0;

    anxiousKeywords.forEach((k) => {
      if (allUserText.includes(k)) anxiousScore += 1;
    });
    positiveKeywords.forEach((k) => {
      if (allUserText.includes(k)) positiveScore += 1;
    });
    heavyKeywords.forEach((k) => {
      if (allUserText.includes(k)) heavyScore += 1;
    });

    if (anxiousScore > 0 && anxiousScore >= positiveScore) {
      return {
        label: 'Mencari Kejelasan & Mengurai Kekhawatiran',
        color: 'text-[#d93025]',
        bgColor: 'bg-[#fce8e6]',
        borderColor: 'border-[#fad2cf]',
        intensity: 'Sensitif / Introspektif',
        description: 'Pikiran sedang memproses ketidakpastian. Langkah terbaik adalah memperlambat ritme dan reframing fakta vs asumsi.',
      };
    } else if (heavyScore > 0 && heavyScore >= positiveScore) {
      return {
        label: 'Memproses Emosi Mendalam',
        color: 'text-[#ea8600]',
        bgColor: 'bg-[#fef7e0]',
        borderColor: 'border-[#fce8b2]',
        intensity: 'Reflektif Dalam',
        description: 'Ada ganjalan emosi yang perlu divalidasi dengan welas asih tanpa terburu-buru menghakimi diri.',
      };
    } else if (positiveScore > 0) {
      return {
        label: 'Bersyukur & Optimis',
        color: 'text-[#188038]',
        bgColor: 'bg-[#e6f4ea]',
        borderColor: 'border-[#ceead6]',
        intensity: 'Positif Terkendali',
        description: 'Energi mental yang baik. Cocok untuk mengapresiasi pencapaian kecil dan memperkuat kebiasaan positif.',
      };
    }

    return {
      label: 'Reflektif & Mengalir',
      color: 'text-[#1a73e8]',
      bgColor: 'bg-[#e8f0fe]',
      borderColor: 'border-[#d2e3fc]',
      intensity: 'Seimbang',
      description: 'Sedang mengeksplorasi ide dan menata pikiran harian dengan objektif.',
    };
  }, [entry.messages]);

  // Extract actionable recommendations from AI messages
  const extractedActionItems = useMemo<string[]>(() => {
    const aiMessages = entry.messages.filter((m) => m.role === 'model');
    if (aiMessages.length === 0) return [];

    const items: string[] = [];

    // Scan messages for bullet points, numbered items, or imperative advice
    aiMessages.forEach((msg) => {
      const lines = msg.content.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        // Match numbered lists (1. or 1)) or bullets (- or * or •)
        const match = trimmed.match(/^(\d+[\.\)]|[-*•])\s+(.+)$/);
        if (match && match[2]) {
          const itemContent = match[2]
            .replace(/\*\*(.*?)\*\*/g, '$1') // clean markdown bold
            .replace(/—/g, ' - ')
            .trim();
          if (itemContent.length > 10 && itemContent.length < 130 && !items.includes(itemContent)) {
            items.push(itemContent);
          }
        }
      });
    });

    // Default suggestions if no bullet points were found in AI responses
    if (items.length === 0) {
      return [
        'Ambil napas diafragma dalam 3 siklus untuk merilekskan otot bahu.',
        'Tuliskan satu hal konkret yang berada di bawah kendalimu hari ini.',
        'Validasi emosimu tanpa terburu-buru mencari solusi sempurna.',
      ];
    }

    return items.slice(0, 5); // top 5 action items
  }, [entry.messages]);

  // Persist completed action items per entry in localStorage
  const storageKey = `reflectai_actions_${entry.id}`;
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setCompletedMap(saved ? JSON.parse(saved) : {});
    } catch {
      setCompletedMap({});
    }
  }, [entry.id, storageKey]);

  const toggleActionItem = (text: string) => {
    setCompletedMap((prev) => {
      const updated = { ...prev, [text]: !prev[text] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save action item state:', e);
      }
      return updated;
    });
  };

  const completedCount = extractedActionItems.filter((item) => completedMap[item]).length;

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className={`w-80 lg:w-84 xl:w-88 bg-white border-l border-[#dadce0] flex flex-col h-full shrink-0 font-sans shadow-xs z-10 ${className}`}
    >
      {/* Side Panel Header */}

      <div className="px-4 py-3.5 border-b border-[#dadce0] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-[#1a73e8]" />
          <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
            Quick Summary &amp; Insights
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#80868b] hover:text-[#202124] hover:bg-[#f1f3f4] transition cursor-pointer"
            title="Tutup panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Section 1: Detected Mood & Sentiment */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5f6368] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Detected Sentiment</span>
            </span>
            <span className="text-[10px] text-[#80868b]">{moodAnalysis.intensity}</span>
          </div>

          <div
            className={`p-3 rounded-xl border ${moodAnalysis.bgColor} ${moodAnalysis.borderColor} space-y-1.5 transition-all`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-current shrink-0 animate-pulse" />
              <h4 className={`text-xs font-bold ${moodAnalysis.color}`}>
                {moodAnalysis.label}
              </h4>
            </div>
            <p className="text-[11px] text-[#3c4043] leading-relaxed">
              {moodAnalysis.description}
            </p>
          </div>
        </div>

        {/* Section 2: Action Items (Saran Tindakan dari AI) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5f6368] flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Action Items ({completedCount}/{extractedActionItems.length})</span>
            </span>
            {completedCount > 0 && (
              <span className="text-[10px] font-semibold text-[#188038] bg-[#e6f4ea] px-1.5 py-0.5 rounded">
                Done {Math.round((completedCount / (extractedActionItems.length || 1)) * 100)}%
              </span>
            )}
          </div>

          {extractedActionItems.length === 0 ? (
            <div className="p-3 bg-[#f8f9fa] border border-[#dadce0] rounded-xl text-center text-xs text-[#80868b]">
              Belum ada saran tindakan. Lanjutkan obrolan dengan Gemini untuk memunculkan langkah konkret.
            </div>
          ) : (
            <div className="space-y-2">
              {extractedActionItems.map((item, idx) => {
                const isDone = !!completedMap[item];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleActionItem(item)}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      isDone
                        ? 'bg-[#f8f9fa] border-[#dadce0] opacity-65'
                        : 'bg-white hover:bg-[#f8f9fa] border-[#dadce0] hover:border-[#1a73e8]/40 shadow-xs'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-[#1a73e8]">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[#188038]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#80868b] hover:text-[#1a73e8]" />
                      )}
                    </div>
                    <span
                      className={`text-xs leading-snug flex-1 ${
                        isDone ? 'line-through text-[#80868b]' : 'text-[#202124] font-medium'
                      }`}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Summary Digest */}
        {entry.summary && (
          <div className="space-y-2 pt-2 border-t border-[#dadce0]">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#5f6368]">
              <Sparkles className="w-3.5 h-3.5 text-[#f9ab00]" />
              <span>Inti Refleksi</span>
            </div>
            <div className="p-3 bg-[#f8f9fa] border border-[#dadce0] rounded-xl text-xs text-[#3c4043] leading-relaxed whitespace-pre-wrap">
              {entry.summary}
            </div>
          </div>
        )}

        {/* Dialogue Metadata Tip */}
        <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#dadce0] text-[11px] text-[#5f6368] space-y-1">
          <div className="flex items-center space-x-1.5 font-medium text-[#202124]">
            <Lightbulb className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Tips Refleksi</span>
          </div>
          <p className="leading-relaxed">
            Sorot teks pada jawaban Gemini untuk mengutip poin spesifik secara instan ke dalam bar balasan.
          </p>
        </div>
      </div>
    </motion.aside>
  );
};
