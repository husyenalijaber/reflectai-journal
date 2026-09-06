import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, JournalMessage, ReflectionMode, QuotedMessagePreview } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { MarkdownView } from './MarkdownView.tsx';
import { QuickSummaryPanel } from './QuickSummaryPanel.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { getTranslation, getLocalizedTitle } from '../utils/i18n.ts';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Loader2,
  Check,
  Copy,
  Lightbulb,
  Compass,
  Sun,
  Heart,
  Pencil,
  Trash2,
  Download,
  Quote,
  Zap,
  MoreVertical,
  Pin,
  Share2,
  Plus,
  X,
  CornerDownLeft,
  BarChart2,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';

interface EntryEditorProps {
  entry: JournalEntry;
  onSendMessage: (
    text: string,
    mode?: ReflectionMode,
    language?: string,
    replyTo?: QuotedMessagePreview
  ) => Promise<void>;
  onUpdateTitle: (title: string) => Promise<void>;
  onUpdateTags?: (tags: string[]) => Promise<void>;
  onTogglePin?: (entryId: string) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onOpenTrends?: () => void;
  currentLanguage?: string;
  onSelectLanguage?: (code: string) => void;
  isGeneratingAI: boolean;
  isSaving: boolean;
}

export const EntryEditor: React.FC<EntryEditorProps> = ({
  entry,
  onSendMessage,
  onUpdateTitle,
  onTogglePin,
  onDeleteEntry,
  onToggleSidebar,
  isSidebarOpen = true,
  onOpenTrends,
  currentLanguage = 'en',
  onSelectLanguage,
  isGeneratingAI,
}) => {
  const { user } = useAuth();
  const t = getTranslation(currentLanguage);

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Husyen';

  const [inputText, setInputText] = useState('');
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  // Active message 3-dots menu ID (strictly for chat messages only)
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(entry.title);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // WhatsApp-style quoted reply context
  const [replyContext, setReplyContext] = useState<QuotedMessagePreview | null>(null);

  // Floating quote popup state for text selection
  const [quotePopup, setQuotePopup] = useState<{ text: string; x: number; y: number } | null>(null);

  // Side Panel state: false by default as requested
  const [showSidePanel, setShowSidePanel] = useState<boolean>(false);

  // Thinking timer
  const [thinkingSeconds, setThinkingSeconds] = useState(0);

  const promptPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const draftKey = `reflectai_draft_${entry.id}`;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isGeneratingAI) {
      setThinkingSeconds(0);
      const start = Date.now();
      timer = setInterval(() => {
        setThinkingSeconds(Math.max(1, Math.floor((Date.now() - start) / 1000)));
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGeneratingAI]);

  // Outside click handlers for floating dropdowns and chat message menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (promptPickerRef.current && !promptPickerRef.current.contains(target)) {
        setShowPromptPicker(false);
      }
      if (!target.closest('.message-action-menu-container')) {
        setActiveMessageMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync draft and title
  useEffect(() => {
    setTitleText(getLocalizedTitle(entry.title, currentLanguage, entry.messages.length > 0));
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft && savedDraft.trim().length > 0) {
        setInputText(savedDraft);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
          }
        }, 50);
      } else {
        setInputText('');
      }
    } catch (e) {
      console.error('Failed to read draft from localStorage:', e);
    }
  }, [entry.id, entry.title, currentLanguage, draftKey, entry.messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGeneratingAI]);

  // Handle textarea change and sync to localStorage
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;

    try {
      if (val.trim().length > 0) {
        localStorage.setItem(draftKey, val);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch (err) {
      console.error('Failed to cache draft:', err);
    }
  };

  const handleDiscardDraft = () => {
    setInputText('');
    setReplyContext(null);
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.error('Failed to remove draft:', e);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGeneratingAI) return;

    const messageToSend = inputText.trim();
    const currentReply = replyContext;
    setInputText('');
    setReplyContext(null);

    try {
      localStorage.removeItem(draftKey);
    } catch (err) {
      console.error('Failed to remove draft:', err);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const mode: ReflectionMode = 'reflective';
    await onSendMessage(messageToSend, mode, currentLanguage, currentReply || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    if (titleText.trim() && titleText !== entry.title) {
      await onUpdateTitle(titleText.trim());
    } else {
      setTitleText(entry.title);
    }
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // WhatsApp-style reply trigger
  const handleSelectReply = (message: JournalMessage) => {
    const isUser = message.role === 'user';
    const senderName = isUser ? (user?.displayName || t.you) : 'ReflectAI';
    const snippet = message.content.slice(0, 120).replace(/—/g, ' - ') + (message.content.length > 120 ? '...' : '');

    setReplyContext({
      id: message.id,
      role: message.role,
      senderName,
      snippet,
    });

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const formatMessageTime = (dateStr?: string) => {
    try {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}.${minutes}`;
    } catch {
      return '';
    }
  };

  const handleTextMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setQuotePopup(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) {
      setQuotePopup(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setQuotePopup({
        text: selectedText,
        x: rect.left + rect.width / 2,
        y: Math.max(10, rect.top - 12),
      });
    } catch {
      setQuotePopup(null);
    }
  };

  const handleApplyQuote = (text: string) => {
    const cleanQuote = text.replace(/—/g, ' - ').trim();
    setReplyContext({
      id: Date.now().toString(),
      role: 'model',
      senderName: 'ReflectAI',
      snippet: cleanQuote.slice(0, 100) + (cleanQuote.length > 100 ? '...' : ''),
    });
    setQuotePopup(null);
    window.getSelection()?.removeAllRanges();

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  // Export (.md) handler
  const handleExportMarkdown = () => {
    let md = `# ${entry.title || t.untitledReflection}\n`;
    md += `*${t.conversations}: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}*\n`;
    md += `*${user?.displayName || 'User'} & ReflectAI*\n\n`;
    md += `---\n\n`;

    entry.messages.forEach((msg) => {
      const isUser = msg.role === 'user';
      const roleLabel = isUser ? `👤 **${user?.displayName || t.you}**` : '✨ **ReflectAI**';
      const timeStr = formatMessageTime(msg.createdAt);
      md += `### ${roleLabel} ${timeStr ? `(${timeStr})` : ''}\n\n`;
      if (msg.replyTo) {
        md += `> Replying to ${msg.replyTo.senderName}: "${msg.replyTo.snippet}"\n\n`;
      }
      md += `${msg.content.replace(/—/g, ' - ')}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (entry.title || 'reflection')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareCopy = () => {
    const transcript = entry.messages
      .map((m) => `${m.role === 'user' ? t.you : 'ReflectAI'}: ${m.content}`)
      .join('\n\n');
    const textToCopy = `# ${entry.title}\n\n${transcript || t.noReflectionsYet}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
  };

  const starterPrompts = [
    {
      title: t.starterDailyEnergy,
      prompt: t.starterDailyEnergyPrompt,
      Icon: Sun,
      color: 'text-[#f29900]',
    },
    {
      title: t.starterReframe,
      prompt: t.starterReframePrompt,
      Icon: Compass,
      color: 'text-[#1a73e8]',
    },
    {
      title: t.starterBrainstorm,
      prompt: t.starterBrainstormPrompt,
      Icon: Lightbulb,
      color: 'text-[#9334e6]',
    },
    {
      title: t.starterGratitude,
      prompt: t.starterGratitudePrompt,
      Icon: Heart,
      color: 'text-[#34a853]',
    },
  ];

  const quickActionChips = [
    {
      label: t.chipSuggestActions,
      icon: Zap,
      prompt: t.chipSuggestActionsPrompt,
    },
    {
      label: t.chipAlternativeView,
      icon: Compass,
      prompt: t.chipAlternativeViewPrompt,
    },
    {
      label: t.chipSummarize,
      icon: Sparkles,
      prompt: t.chipSummarizePrompt,
    },
  ];

  return (
    <div className="flex-1 flex h-full min-w-0 bg-[#ffffff] relative font-sans select-none overflow-hidden">
      {/* Floating Quote Popup */}
      {quotePopup && (
        <div
          id="quote-selection-popup"
          style={{
            position: 'fixed',
            left: `${quotePopup.x}px`,
            top: `${quotePopup.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          className="animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleApplyQuote(quotePopup.text);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#202124] hover:bg-[#3c4043] text-white text-xs font-semibold shadow-xl cursor-pointer transition active:scale-95 border border-white/20 whitespace-nowrap"
          >
            <Quote className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>{t.quoteReply}</span>
          </button>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header: Clean single header */}
        <header className="px-3 sm:px-5 py-2.5 border-b border-[#dadce0] bg-white flex items-center justify-between shrink-0 z-10 shadow-2xs">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {/* Sidebar Toggle Button for Hide & Seek (Desktop & Mobile) */}
            {onToggleSidebar && (
              <button
                type="button"
                id="header-toggle-sidebar-btn"
                onClick={onToggleSidebar}
                className="p-1.5 -ml-1 rounded-lg text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] active:bg-[#e8eaed] transition cursor-pointer shrink-0 border border-transparent hover:border-[#dadce0]"
                title={isSidebarOpen ? t.collapseSidebar : t.openSidebar}
                aria-label={isSidebarOpen ? t.collapseSidebar : t.openSidebar}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4 hidden md:block" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 hidden md:block" />
                )}
                <Menu className="w-4 h-4 md:hidden" />
              </button>
            )}

            {isEditingTitle ? (
              <div className="flex items-center space-x-2 max-w-md w-full">
                <input
                  id="edit-title-input"
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  autoFocus
                  maxLength={120}
                  className="bg-white border border-[#1a73e8] rounded-md px-2 py-0.5 text-xs sm:text-sm font-semibold text-[#202124] w-full focus:outline-none"
                />
                <button
                  onClick={handleTitleSubmit}
                  className="text-xs px-2.5 py-1 bg-[#1a73e8] text-white rounded font-medium cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group min-w-0">
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xs sm:text-sm font-semibold text-[#202124] hover:text-[#1a73e8] transition cursor-pointer truncate max-w-[200px] sm:max-w-[360px]"
                  title={t.rename}
                >
                  {getLocalizedTitle(entry.title, currentLanguage, entry.messages.length > 0)}
                </h2>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#80868b] hover:text-[#1a73e8] rounded hover:bg-[#f1f3f4] transition cursor-pointer"
                  title={t.rename}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Right Controls: Language Selector & Emotional Trends */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* APAC Language Selector */}
            {onSelectLanguage && (
              <LanguageSelector
                currentLanguage={currentLanguage}
                onSelectLanguage={onSelectLanguage}
              />
            )}

            {/* Emotional Trends Button */}
            {onOpenTrends && (
              <button
                type="button"
                onClick={onOpenTrends}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#d2e3fc] transition cursor-pointer"
                title={t.emotionalTrends}
              >
                <BarChart2 className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span className="hidden md:inline">{t.emotionalTrends}</span>
              </button>
            )}
          </div>
        </header>

        {/* Chat Scroll Container */}
        <div
          ref={chatScrollContainerRef}
          onMouseUp={handleTextMouseUp}
          className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 sm:py-6"
        >
          {entry.messages.length === 0 ? (
            /* Empty State / Welcome Screen with starter prompts */
            <div className="max-w-2xl mx-auto text-center space-y-6 pt-6 sm:pt-10">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#202124] tracking-tight">
                  {t.hello}, <span className="text-[#1a73e8]">{firstName}</span>
                </h1>
                <p className="text-xs sm:text-sm text-[#5f6368] max-w-md mx-auto leading-relaxed">
                  {t.welcomeSubtitle}
                </p>
              </div>

              {/* 4 Starter Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {starterPrompts.map((starter, idx) => {
                  const Icon = starter.Icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(starter.prompt);
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="p-3.5 rounded-2xl bg-white border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md transition-all text-left space-y-1.5 group cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${starter.color}`} />
                        <h3 className="text-xs font-semibold text-[#202124] group-hover:text-[#1a73e8] transition">
                          {starter.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#5f6368] line-clamp-2 leading-relaxed">
                        {starter.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Multi-turn Messages List */
            <div className="max-w-3xl mx-auto space-y-5 pb-4">
              {entry.messages.map((message, msgIdx) => {
                const isUser = message.role === 'user';
                const timeString = formatMessageTime(message.createdAt);

                if (isUser) {
                  return (
                    <div
                      key={message.id || msgIdx}
                      id={`msg-${message.id}`}
                      className="group relative flex justify-end items-end gap-1.5"
                    >
                      {/* Message action cluster for user message (Reply & 3-dots) */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 mb-1">
                        <button
                          type="button"
                          onClick={() => handleSelectReply(message)}
                          className="p-1.5 rounded-full text-[#80868b] hover:text-[#1a73e8] hover:bg-[#f1f3f4] transition cursor-pointer"
                          title={t.clickToReply}
                        >
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative message-action-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMessageMenuId(activeMessageMenuId === message.id ? null : message.id);
                            }}
                            className="p-1.5 rounded-full text-[#80868b] hover:text-[#202124] hover:bg-[#f1f3f4] transition cursor-pointer"
                            title="Opsi pesan"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          <AnimatePresence>
                            {activeMessageMenuId === message.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.12 }}
                                className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-white border border-[#dadce0] shadow-lg py-1 z-50 text-xs text-[#202124] font-sans"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectReply(message);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] cursor-pointer"
                                >
                                  <CornerDownLeft className="w-3.5 h-3.5 text-[#5f6368]" />
                                  <span>{t.clickToReply || 'Balas & Kutip'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCopyMessage(message.content, msgIdx);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-[#5f6368]" />
                                  <span>{t.copy}</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div
                        onClick={() => handleSelectReply(message)}
                        className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs px-4 py-2.5 bg-[#e8f0fe] border border-[#c2e7ff] hover:border-[#1a73e8]/50 text-[#202124] text-xs sm:text-sm leading-relaxed shadow-2xs font-sans transition cursor-pointer"
                        title={t.clickToReply}
                      >
                        {/* If this message was a reply to another message */}
                        {message.replyTo && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = document.getElementById(`msg-${message.replyTo?.id}`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="mb-2 rounded-lg p-2 text-xs bg-white/80 border-l-3 border-[#1a73e8] text-[#3c4043] cursor-pointer hover:bg-white"
                          >
                            <div className="flex items-center gap-1 font-semibold text-[11px] text-[#1a73e8]">
                              <CornerDownLeft className="w-3 h-3" />
                              <span>{message.replyTo.senderName}</span>
                            </div>
                            <p className="truncate text-[11px] mt-0.5 text-[#5f6368] italic">
                              "{message.replyTo.snippet}"
                            </p>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap select-text">{message.content}</p>
                        {timeString && (
                          <div className="text-[10px] text-[#1967d2] text-right mt-1 font-mono">
                            {timeString}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // AI Response: Split into paragraphs for humanlike multi-bubble presentation
                const paragraphs = message.content
                  .split(/\n\n+/)
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0);

                return (
                  <div
                    key={message.id || msgIdx}
                    id={`msg-${message.id}`}
                    className="group relative flex items-start space-x-2.5 justify-start"
                  >
                    <img
                      src="/logo.png"
                      alt="ReflectAI"
                      className="w-7 h-7 rounded-lg border border-[#dadce0] object-cover shrink-0 shadow-2xs mt-1"
                    />

                    <div className="max-w-[88%] sm:max-w-[80%] space-y-2">
                      {/* Thinking Duration & Timestamp Header */}
                      <div className="text-[10px] text-[#80868b] font-mono flex items-center space-x-1.5 pl-1 select-none">
                        {message.thoughtDuration !== undefined && (
                          <div className="flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#1a73e8]" />
                            <span>{t.thoughtFor} {message.thoughtDuration}{t.seconds}</span>
                          </div>
                        )}
                        {message.thoughtDuration !== undefined && timeString && <span>•</span>}
                        {timeString && <span>{timeString}</span>}
                      </div>

                      {/* Quoted preview inside AI message if it replied to a user quote */}
                      {message.replyTo && (
                        <div
                          onClick={() => {
                            const el = document.getElementById(`msg-${message.replyTo?.id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="rounded-lg p-2 text-xs bg-[#f1f3f4] border-l-3 border-[#188038] text-[#3c4043] cursor-pointer hover:bg-[#e8eaed]"
                        >
                          <div className="flex items-center gap-1 font-semibold text-[11px] text-[#188038]">
                            <CornerDownLeft className="w-3 h-3" />
                            <span>{message.replyTo.senderName}</span>
                          </div>
                          <p className="truncate text-[11px] mt-0.5 text-[#5f6368] italic">
                            "{message.replyTo.snippet}"
                          </p>
                        </div>
                      )}

                      {/* Multi-bubble paragraphs - clicking bubble triggers WhatsApp reply */}
                      {paragraphs.map((para, pIdx) => (
                        <motion.div
                          key={pIdx}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: pIdx * 0.05 }}
                          onClick={() => handleSelectReply(message)}
                          className="bg-white border border-[#dadce0] hover:border-[#1a73e8]/60 rounded-2xl rounded-tl-xs px-4 py-3 text-xs sm:text-sm text-[#202124] shadow-2xs cursor-pointer transition"
                          title={t.clickToReply}
                        >
                          <div className="prose prose-xs sm:prose-sm max-w-none text-[#202124] select-text">
                            <MarkdownView content={para} />
                          </div>
                        </motion.div>
                      ))}

                      {/* Message actions: Reply, Copy, 3-dots Menu & Timestamp */}
                      <div className="flex items-center justify-between pt-0.5 pl-1 pr-1">
                        <div className="flex items-center space-x-2">
                          {/* Quick reply action */}
                          <button
                            type="button"
                            onClick={() => handleSelectReply(message)}
                            className="p-1 rounded text-[#80868b] hover:text-[#1a73e8] hover:bg-[#e8f0fe] transition cursor-pointer text-[11px] flex items-center gap-1"
                            title={t.clickToReply}
                          >
                            <CornerDownLeft className="w-3 h-3" />
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(message.content, msgIdx)}
                            className="p-1 rounded text-[#80868b] hover:text-[#202124] hover:bg-[#f1f3f4] transition cursor-pointer text-[11px] flex items-center gap-1"
                            title={t.copy}
                          >
                            {copiedIndex === msgIdx ? (
                              <>
                                <Check className="w-3 h-3 text-[#34a853]" />
                                <span className="text-[#34a853]">{t.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{t.copy}</span>
                              </>
                            )}
                          </button>

                          {/* 3-dots Menu exclusively for Chat Message */}
                          <div className="relative message-action-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMessageMenuId(activeMessageMenuId === message.id ? null : message.id);
                              }}
                              className="p-1 rounded text-[#80868b] hover:text-[#202124] hover:bg-[#f1f3f4] transition cursor-pointer text-[11px] flex items-center"
                              title="Opsi pesan chat"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            <AnimatePresence>
                              {activeMessageMenuId === message.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 mt-1 w-48 rounded-xl bg-white border border-[#dadce0] shadow-lg py-1 z-50 text-xs text-[#202124] font-sans"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectReply(message);
                                      setActiveMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] cursor-pointer"
                                  >
                                    <CornerDownLeft className="w-3.5 h-3.5 text-[#5f6368]" />
                                    <span>{t.clickToReply || 'Balas & Kutip'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyMessage(message.content, msgIdx);
                                      setActiveMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[#5f6368]" />
                                    <span>{t.copy}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowSidePanel(true);
                                      setActiveMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#e8f0fe] text-[#1967d2] cursor-pointer font-medium"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
                                    <span>{t.summaryActionItems}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleShareCopy();
                                      setActiveMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] cursor-pointer"
                                  >
                                    <Share2 className="w-3.5 h-3.5 text-[#5f6368]" />
                                    <span>{t.shareConversation}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleExportMarkdown();
                                      setActiveMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[#5f6368]" />
                                    <span>{t.exportMd}</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {timeString && (
                          <div className="text-[10px] text-[#80868b] font-mono select-none">
                            {timeString}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Generating AI Indicator - Animated Typing Indicator */}
              {isGeneratingAI && (
                <div className="flex items-start space-x-2.5 justify-start animate-in fade-in duration-150">
                  <img
                    src="/logo.png"
                    alt="ReflectAI"
                    className="w-7 h-7 rounded-lg border border-[#dadce0] object-cover shrink-0 shadow-2xs mt-1"
                  />
                  <div className="bg-white border border-[#dadce0] rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center space-x-1.5 h-10">
                    <span className="w-2 h-2 rounded-full bg-[#80868b] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[#80868b] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[#80868b] animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Gemini-Style Chat Footer */}
        <footer className="p-3 sm:p-4 bg-transparent shrink-0">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto space-y-2">
            {/* Quick Action Chips if messages exist */}
            {entry.messages.length > 0 && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {quickActionChips.map((chip, idx) => {
                  const ChipIcon = chip.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isGeneratingAI}
                      onClick={() => {
                        setInputText(chip.prompt);
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white hover:bg-[#e8f0fe] border border-[#dadce0] hover:border-[#1a73e8]/50 text-[#3c4043] hover:text-[#1a73e8] transition shadow-2xs whitespace-nowrap cursor-pointer active:scale-95 disabled:opacity-40"
                    >
                      <ChipIcon className="w-3 h-3 text-[#1a73e8]" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* WhatsApp-Style Quoted Reply Preview Banner */}
            <AnimatePresence>
              {replyContext && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#f0f4f9] border border-[#dadce0] border-b-0 rounded-t-2xl px-4 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`w-1 self-stretch rounded-full shrink-0 ${
                          replyContext.role === 'user' ? 'bg-[#34a853]' : 'bg-[#1a73e8]'
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`font-semibold text-[11px] ${
                            replyContext.role === 'user' ? 'text-[#188038]' : 'text-[#1a73e8]'
                          }`}
                        >
                          {t.replyingTo} {replyContext.senderName}
                        </p>
                        <p className="text-[#5f6368] text-xs truncate max-w-lg">
                          {replyContext.snippet}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyContext(null)}
                      className="p-1 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#dadce0] transition cursor-pointer"
                      title={t.cancelReply}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pill Capsule Chat Input matching Gemini Image 3 */}
            <div
              className={`relative flex items-center bg-white border border-[#dadce0] focus-within:border-[#1a73e8] focus-within:ring-2 focus-within:ring-[#1a73e8]/15 ${
                replyContext ? 'rounded-b-3xl rounded-t-none border-t-0' : 'rounded-3xl'
              } px-3 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-all`}
            >
              {/* Left: Plus button for prompt starters */}
              <div className="relative shrink-0" ref={promptPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowPromptPicker(!showPromptPicker)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition cursor-pointer"
                  title="Starter Prompts"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {showPromptPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-11 left-0 w-64 rounded-2xl bg-white border border-[#dadce0] shadow-xl p-2 z-50 text-xs"
                    >
                      <div className="px-2 py-1 text-[11px] font-semibold text-[#5f6368] border-b border-[#f1f3f4]">
                        {t.starterHeading}
                      </div>
                      <div className="space-y-1 mt-1">
                        {starterPrompts.map((sp, idx) => {
                          const Icon = sp.Icon;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInputText(sp.prompt);
                                setShowPromptPicker(false);
                                if (textareaRef.current) textareaRef.current.focus();
                              }}
                              className="w-full p-2 text-left rounded-xl hover:bg-[#f1f3f4] transition flex items-center space-x-2 cursor-pointer"
                            >
                              <Icon className={`w-3.5 h-3.5 ${sp.color}`} />
                              <span className="text-xs font-medium text-[#202124]">{sp.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


              {/* Center: Textarea Input */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  currentLanguage === 'id'
                    ? 'Curhat santai, tulis renungan, atau tanya Gemini 3.6 Flash...'
                    : 'Type a thought, reflection, or ask Gemini 3.6 Flash...'
                }
                disabled={isGeneratingAI}
                className="flex-1 bg-transparent px-2.5 py-2 text-xs sm:text-sm text-[#202124] placeholder-[#80868b] focus:outline-none resize-none max-h-40 min-h-[36px]"
              />

              {/* Right: Default Model Badge & Send Action */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Clear / Discard Draft Button */}
                {inputText.trim() && (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="p-1.5 text-[#80868b] hover:text-[#d93025] rounded-full transition cursor-pointer"
                    title="Hapus draf"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Fixed Default Model Pill: Gemini 3.6 Flash */}
                <div
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#c2e7ff] select-none shrink-0"
                  title="Model AI Default: Gemini 3.6 Flash"
                >
                  <Sparkles className="w-3 h-3 text-[#1a73e8]" />
                  <span>Gemini 3.6 Flash</span>
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  id="send-message-btn"
                  disabled={!inputText.trim() || isGeneratingAI}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                    inputText.trim() && !isGeneratingAI
                      ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white active:scale-95'
                      : 'bg-[#f1f3f4] text-[#9aa0a6] cursor-not-allowed'
                  }`}
                  title="Kirim (Enter)"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1a73e8]" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </footer>
      </div>

      {/* Slide-out Summary Side Panel (Off by default, user-triggered only) */}
      <AnimatePresence>
        {showSidePanel && (
          <QuickSummaryPanel
            entry={entry}
            currentLanguage={currentLanguage}
            onClose={() => setShowSidePanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

