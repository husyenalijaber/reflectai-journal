import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { JournalEntry, EmotionalTrendPoint } from '../types.ts';
import {
  TrendingUp,
  Smile,
  Activity,
  Calendar,
  Sparkles,
  BarChart2,
  X,
} from 'lucide-react';

interface EmotionalTrendsChartProps {
  entries: JournalEntry[];
  onClose?: () => void;
  isModal?: boolean;
}

export const EmotionalTrendsChart: React.FC<EmotionalTrendsChartProps> = ({
  entries,
  onClose,
  isModal = true,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');

  // Derive emotional sentiment, clarity, and dominant mood from journal entries
  const trendData: EmotionalTrendPoint[] = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    // Positive indicators
    const positiveWords = [
      'joy', 'happy', 'gratitude', 'grateful', 'peace', 'peaceful', 'calm',
      'inspired', 'excited', 'love', 'growth', 'progress', 'content', 'energized',
      'accomplished', 'confident', 'hope', 'hopeful', 'clear', 'clarity', 'proud',
      'rejoice', 'light', 'mindful', 'harmonious', 'thrive', 'blessed'
    ];

    // Challenging / Stressed indicators
    const stressWords = [
      'stress', 'stressed', 'anxious', 'anxiety', 'worried', 'worry', 'overwhelmed',
      'tired', 'exhausted', 'frustrated', 'anger', 'angry', 'fear', 'doubt',
      'sad', 'unhappy', 'lonely', 'burnout', 'heavy', 'guilt', 'conflict', 'chaos',
      'stuck', 'failure', 'nervous'
    ];

    // Clarity / Growth indicators
    const clarityWords = [
      'realize', 'realized', 'perspective', 'understand', 'learned', 'insight',
      'discovered', 'lesson', 'decision', 'action', 'focus', 'objective', 'plan',
      'mindset', 'solution', 'clarity', 'intention', 'step'
    ];

    // Sort entries chronologically: oldest first
    const sorted = [...entries].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const filtered = sorted.filter((entry) => {
      if (timeRange === 'all') return true;
      const entryTime = entry.createdAt?.toDate ? entry.createdAt.toDate().getTime() : new Date(entry.createdAt || 0).getTime();
      if (timeRange === '7d') return now - entryTime <= 7 * dayMs;
      if (timeRange === '30d') return now - entryTime <= 30 * dayMs;
      return true;
    });

    return filtered.map((entry, index) => {
      const dateObj = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt || Date.now());
      const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj);
      const timestamp = dateObj.getTime();

      // Combine text content to analyze
      const combinedText = [
        entry.title || '',
        entry.prompt || '',
        entry.summary || '',
        ...entry.messages.map((m) => m.content),
      ]
        .join(' ')
        .toLowerCase();

      const words = combinedText.split(/\s+/);
      const totalWords = Math.max(words.length, 1);

      let posCount = 0;
      let stressCount = 0;
      let clarityCount = 0;

      for (const w of words) {
        const cleanWord = w.replace(/[^a-z]/g, '');
        if (positiveWords.includes(cleanWord)) posCount++;
        if (stressWords.includes(cleanWord)) stressCount++;
        if (clarityWords.includes(cleanWord)) clarityCount++;
      }

      // Calculate baseline sentiment: 50 is neutral, scaled by relative emotion balance
      const rawValence = 50 + (posCount - stressCount) * 8;
      const sentimentScore = Math.min(Math.max(Math.round(rawValence), 20), 95);

      // Clarity score: base on messages depth, summary presence, and insight keywords
      const depthBonus = Math.min(entry.messages.length * 5, 20);
      const summaryBonus = entry.summary ? 20 : 0;
      const clarityScore = Math.min(Math.round(40 + clarityCount * 6 + depthBonus + summaryBonus), 98);

      // Energy score
      const energyScore = Math.min(Math.round(45 + posCount * 5 - stressCount * 2 + depthBonus), 95);

      // Determine dominant mood description & color
      let dominantMood = 'Calm & Reflective';
      let moodColor = '#1a73e8'; // Google Blue

      if (posCount > stressCount + 2) {
        dominantMood = 'Joy & Gratitude';
        moodColor = '#34a853'; // Google Green
      } else if (stressCount > posCount + 1) {
        dominantMood = 'Stress & Processing';
        moodColor = '#ea4335'; // Google Red
      } else if (clarityCount >= 2 || entry.summary) {
        dominantMood = 'Insight & Clarity';
        moodColor = '#1a73e8'; // Google Blue
      } else if (energyScore > 70) {
        dominantMood = 'Energized & Focused';
        moodColor = '#f9ab00'; // Google Yellow
      }

      return {
        id: entry.id,
        dateStr: `${dateStr} (#${index + 1})`,
        timestamp,
        title: entry.title || 'Untitled Reflection',
        sentimentScore,
        clarityScore,
        energyScore,
        dominantMood,
        moodColor,
      };
    });
  }, [entries, timeRange]);

  // Aggregate statistics
  const stats = useMemo(() => {
    if (trendData.length === 0) {
      return {
        avgSentiment: 0,
        avgClarity: 0,
        topMood: 'N/A',
        trendDirection: 'neutral',
      };
    }

    const sumSentiment = trendData.reduce((acc, curr) => acc + curr.sentimentScore, 0);
    const sumClarity = trendData.reduce((acc, curr) => acc + curr.clarityScore, 0);
    const avgSentiment = Math.round(sumSentiment / trendData.length);
    const avgClarity = Math.round(sumClarity / trendData.length);

    // Mood frequency
    const moodCounts: Record<string, number> = {};
    trendData.forEach((d) => {
      moodCounts[d.dominantMood] = (moodCounts[d.dominantMood] || 0) + 1;
    });

    let topMood = 'Calm & Reflective';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topMood = mood;
      }
    });

    // Trend direction comparing first half to second half
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    if (trendData.length >= 2) {
      const mid = Math.floor(trendData.length / 2);
      const firstHalf = trendData.slice(0, mid);
      const secondHalf = trendData.slice(mid);
      const firstAvg = firstHalf.reduce((a, b) => a + b.sentimentScore, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b.sentimentScore, 0) / secondHalf.length;

      if (secondAvg > firstAvg + 3) trendDirection = 'up';
      else if (secondAvg < firstAvg - 3) trendDirection = 'down';
    }

    return { avgSentiment, avgClarity, topMood, trendDirection };
  }, [trendData]);

  if (entries.length === 0) {
    return null;
  }

  const chartBody = (
    <div className="bg-white flex flex-col max-h-full">
      {/* Header bar with toggle */}
      <div className="px-5 sm:px-6 py-3 flex items-center justify-between bg-[#f8f9fa] border-b border-[#dadce0] shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8]">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-[#202124]">
                Emotional Trends &amp; Reflection Dynamics
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e8f0fe] text-[#1967d2]">
                {trendData.length} {trendData.length === 1 ? 'entry' : 'entries'} tracked
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time range selector */}
          <div className="inline-flex rounded-lg shadow-xs bg-white border border-[#dadce0] p-0.5 text-[11px]">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-[#1a73e8] text-white'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === '30d'
                  ? 'bg-[#1a73e8] text-white'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-[#1a73e8] text-white'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              7 Days
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124] transition cursor-pointer ml-1"
              title="Close Trends"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chart & Metrics Content */}
      <div className="px-5 sm:px-6 py-4 bg-white space-y-4 overflow-y-auto max-h-[calc(88vh-60px)]">
        {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#f8f9fa] border border-[#e8eaed] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5f6368] font-medium">Average Mood</span>
                <Smile className="w-3.5 h-3.5 text-[#1a73e8]" />
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-xl font-bold text-[#202124]">{stats.avgSentiment}</span>
                <span className="text-[11px] text-[#5f6368]">/ 100</span>
              </div>
              <p className="text-[10px] text-[#80868b] mt-0.5">
                {stats.avgSentiment >= 70
                  ? 'Predominantly positive'
                  : stats.avgSentiment >= 50
                  ? 'Balanced & reflective'
                  : 'Working through friction'}
              </p>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e8eaed] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5f6368] font-medium">Clarity Index</span>
                <Sparkles className="w-3.5 h-3.5 text-[#34a853]" />
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-xl font-bold text-[#202124]">{stats.avgClarity}</span>
                <span className="text-[11px] text-[#5f6368]">/ 100</span>
              </div>
              <p className="text-[10px] text-[#80868b] mt-0.5">Cognitive depth &amp; synthesis</p>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e8eaed] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5f6368] font-medium">Primary Emotion</span>
                <Activity className="w-3.5 h-3.5 text-[#f9ab00]" />
              </div>
              <div className="mt-1">
                <span className="text-sm font-semibold text-[#202124] truncate block">
                  {stats.topMood}
                </span>
              </div>
              <p className="text-[10px] text-[#80868b] mt-0.5">Most recurring theme</p>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e8eaed] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#5f6368] font-medium">Trend Velocity</span>
                <TrendingUp
                  className={`w-3.5 h-3.5 ${
                    stats.trendDirection === 'up'
                      ? 'text-[#34a853]'
                      : stats.trendDirection === 'down'
                      ? 'text-[#ea4335]'
                      : 'text-[#5f6368]'
                  }`}
                />
              </div>
              <div className="mt-1">
                <span className="text-sm font-semibold text-[#202124]">
                  {stats.trendDirection === 'up'
                    ? 'Trending Upward'
                    : stats.trendDirection === 'down'
                    ? 'Processing Challenges'
                    : 'Stable Baseline'}
                </span>
              </div>
              <p className="text-[10px] text-[#80868b] mt-0.5">Trajectory across sessions</p>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="w-full h-52 sm:h-60 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorClarity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34a853" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34a853" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
                <XAxis
                  dataKey="dateStr"
                  tick={{ fontSize: 10, fill: '#80868b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#dadce0' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#80868b' }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[20, 50, 80, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as EmotionalTrendPoint;
                      return (
                        <div className="bg-white border border-[#dadce0] rounded-lg shadow-lg p-3 text-xs max-w-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2 border-b border-[#f1f3f4] pb-1">
                            <span className="font-semibold text-[#202124] truncate">
                              {data.title}
                            </span>
                            <span className="text-[10px] text-[#80868b] shrink-0">
                              {data.dateStr}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: data.moodColor }}
                            />
                            <span className="text-[#3c4043] font-medium">{data.dominantMood}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                            <div>
                              <span className="text-[#5f6368]">Mood Valence:</span>{' '}
                              <span className="font-semibold text-[#1a73e8]">
                                {data.sentimentScore} / 100
                              </span>
                            </div>
                            <div>
                              <span className="text-[#5f6368]">Clarity:</span>{' '}
                              <span className="font-semibold text-[#34a853]">
                                {data.clarityScore} / 100
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#5f6368' }}
                />
                <Area
                  type="monotone"
                  dataKey="sentimentScore"
                  name="Emotional Valence (Mood)"
                  stroke="#1a73e8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSentiment)"
                />
                <Area
                  type="monotone"
                  dataKey="clarityScore"
                  name="Cognitive Clarity & Synthesis"
                  stroke="#34a853"
                  strokeWidth={1.75}
                  strokeDasharray="4 2"
                  fillOpacity={1}
                  fill="url(#colorClarity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-[#dadce0] w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {chartBody}
        </div>
      </div>
    );
  }

  return chartBody;
};
