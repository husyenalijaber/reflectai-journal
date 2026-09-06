import React, { useState, useEffect } from 'react';
import { PromptOfTheDay } from '../types.ts';
import { Sparkles, RefreshCw, ArrowRight, Lightbulb, X } from 'lucide-react';

interface PromptOfTheDayCardProps {
  onUsePrompt: (promptText: string) => void;
}

export const PromptOfTheDayCard: React.FC<PromptOfTheDayCardProps> = ({ onUsePrompt }) => {
  const [promptData, setPromptData] = useState<PromptOfTheDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Load daily prompt on mount
  useEffect(() => {
    fetchDailyPrompt();
  }, []);

  const fetchDailyPrompt = async (category?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/prompt-of-the-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          currentTheme: promptData?.theme,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPromptData(data);
      } else {
        // Fallback default prompt
        setPromptData({
          prompt: 'What is one moment from your day where you felt completely yourself, and what contributed to that feeling?',
          theme: 'Authenticity & Presence',
          category: 'Mindfulness',
          guidance: 'Explore the people, surroundings, and thoughts that grounded you.',
        });
      }
    } catch (err) {
      console.warn('Using local fallback prompt due to network/server delay:', err);
      setPromptData({
        prompt: 'What is one gentle lesson you are learning about yourself this week?',
        theme: 'Self-Compassion',
        category: 'Personal Growth',
        guidance: 'Allow yourself to write honestly without pressure for perfection.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isDismissed) {
    return (
      <div className="px-4 sm:px-8 py-2 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center justify-between">
        <button
          onClick={() => setIsDismissed(false)}
          className="text-xs text-[#1a73e8] hover:text-[#1557b0] flex items-center space-x-1.5 cursor-pointer font-medium"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#f9ab00]" />
          <span>Show Prompt of the Day</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] border-b border-[#dadce0] px-4 sm:px-8 py-3.5 transition-all">
      <div className="bg-white border border-[#dadce0] rounded-xl p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#fef7e0] border border-[#fce8b2] flex items-center justify-center text-[#f29900] shrink-0">
              <Sparkles className="w-4 h-4 text-[#ea8600]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#202124]">
                  Prompt of the Day
                </span>
                {promptData?.category && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc]">
                    {promptData.category}
                  </span>
                )}
                <span className="text-[10px] text-[#80868b] hidden sm:inline">
                  &bull; Powered by Gemini
                </span>
              </div>
              {promptData?.theme && (
                <p className="text-[11px] text-[#5f6368] font-medium mt-0.5">
                  Theme: {promptData.theme}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              id="refresh-prompt-btn"
              onClick={() => fetchDailyPrompt()}
              disabled={loading}
              className="p-1.5 rounded-md text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] transition cursor-pointer disabled:opacity-50"
              title="Get another Gemini suggestion"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1a73e8]' : ''}`} />
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-md text-[#80868b] hover:text-[#5f6368] hover:bg-[#f1f3f4] transition cursor-pointer"
              title="Dismiss prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Prompt Content */}
        <div className="mt-2.5 pl-9">
          {loading ? (
            <div className="py-2 flex items-center space-x-2 text-xs text-[#5f6368]">
              <div className="w-3.5 h-3.5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
              <span>Consulting Gemini for an inspiring prompt...</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-[#202124] leading-relaxed">
                &ldquo;{promptData?.prompt}&rdquo;
              </p>
              {promptData?.guidance && (
                <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-[#5f6368]">
                  <Lightbulb className="w-3 h-3 text-[#f9ab00] shrink-0" />
                  <span>{promptData.guidance}</span>
                </div>
              )}

              <div className="mt-3 flex items-center space-x-2">
                <button
                  id="use-daily-prompt-btn"
                  onClick={() => promptData?.prompt && onUsePrompt(promptData.prompt)}
                  className="px-3 py-1.5 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                >
                  <span>Use this prompt in reflection</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => fetchDailyPrompt()}
                  className="px-3 py-1.5 rounded-md bg-white hover:bg-[#f8f9fa] border border-[#dadce0] text-[#3c4043] text-xs font-medium transition cursor-pointer"
                >
                  Try another angle
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
