import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JournalEntry } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';
import { getTranslation, getLocalizedTitle } from '../utils/i18n.ts';
import {
  Plus,
  Trash2,
  BookOpen,
  X,
  MoreVertical,
  Pin,
  Edit2,
  Share2,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User as UserIcon,
  Check,
  Settings,
  BarChart2,
} from 'lucide-react';

interface EntrySidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onRenameEntry?: (entryId: string, newTitle: string) => Promise<void>;
  onTogglePinEntry?: (entryId: string) => Promise<void>;
  onOpenSummary?: (entry: JournalEntry) => void;
  onToggleCollapse?: () => void;
  onOpenTrends?: () => void;
  isCollapsed?: boolean;
  currentLanguage?: string;
  loading: boolean;
}

export const EntrySidebar: React.FC<EntrySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  onRenameEntry,
  onTogglePinEntry,
  onOpenSummary,
  onToggleCollapse,
  onOpenTrends,
  isCollapsed = false,
  currentLanguage = 'id',
  loading,
}) => {
  const { user, signOutUser } = useAuth();
  const t = getTranslation(currentLanguage);

  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenEntryId, setMenuOpenEntryId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const collapsedProfileRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenEntryId(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (collapsedProfileRef.current && !collapsedProfileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter entries based on keyword search
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = entries;
    if (query) {
      list = entries.filter((entry) => {
        return (
          entry.title.toLowerCase().includes(query) ||
          (entry.prompt && entry.prompt.toLowerCase().includes(query)) ||
          (entry.summary && entry.summary.toLowerCase().includes(query)) ||
          entry.messages.some((m) => m.content.toLowerCase().includes(query))
        );
      });
    }

    // Sort: pinned first, then by date/order
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [entries, searchQuery]);

  const [entryToDelete, setEntryToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleDeleteClick = (entry: JournalEntry) => {
    setMenuOpenEntryId(null);
    setEntryToDelete({
      id: entry.id,
      title: getLocalizedTitle(entry.title, currentLanguage, entry.messages.length > 0),
    });
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    const targetId = entryToDelete.id;
    setEntryToDelete(null);
    setDeletingId(targetId);
    try {
      await onDeleteEntry(targetId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartRename = (entry: JournalEntry) => {
    setMenuOpenEntryId(null);
    setEditingTitleId(entry.id);
    setEditingTitleValue(getLocalizedTitle(entry.title, currentLanguage, entry.messages.length > 0));
  };

  const handleSaveRename = async (entryId: string) => {
    if (!editingTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }
    const newTitle = editingTitleValue.trim();
    setEditingTitleId(null);
    if (onRenameEntry) {
      await onRenameEntry(entryId, newTitle);
    }
  };

  const handleShareClick = (entry: JournalEntry) => {
    setMenuOpenEntryId(null);
    const transcript = entry.messages
      .map((m) => `${m.role === 'user' ? t.you : 'ReflectAI'}: ${m.content}`)
      .join('\n\n');
    const textToCopy = `# ${entry.title}\n\n${transcript || t.noReflectionsYet}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setShareToast(t.conversationCopied);
      setTimeout(() => setShareToast(null), 3000);
    }
  };

  const handleSummaryClick = (entry: JournalEntry) => {
    setMenuOpenEntryId(null);
    onSelectEntry(entry);
    if (onOpenSummary) {
      onOpenSummary(entry);
    }
  };

  const handleTogglePinClick = async (entry: JournalEntry) => {
    setMenuOpenEntryId(null);
    if (onTogglePinEntry) {
      await onTogglePinEntry(entry.id);
    }
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  // ==========================================================
  // GEMINI MINI-RAIL (WHEN COLLAPSED)
  // ==========================================================
  if (isCollapsed) {
    return (
      <motion.aside
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="w-16 bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col h-full shrink-0 items-center justify-between py-3 font-sans select-none z-20"
      >
        {/* Top Rail Controls */}
        <div className="flex flex-col items-center space-y-3 w-full">
          {/* Expand Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2.5 rounded-xl text-[#5f6368] hover:text-[#202124] hover:bg-[#e8eaed] transition cursor-pointer"
              title={t.openSidebar}
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

          {/* New Reflection Icon (Only shown when conversations exist) */}
          {entries.length > 0 && (
            <button
              onClick={onNewEntry}
              className="w-10 h-10 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95"
              title={t.newReflection}
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* Emotional Trends Icon */}
          {onOpenTrends && (
            <button
              onClick={onOpenTrends}
              className="p-2.5 rounded-xl text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#e8f0fe] transition cursor-pointer"
              title={t.emotionalTrends}
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom User Profile Icon (Gemini Rail Style) */}
        {user && (
          <div className="relative" ref={collapsedProfileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 rounded-full border border-[#dadce0] overflow-hidden hover:ring-2 hover:ring-[#1a73e8] transition cursor-pointer flex items-center justify-center bg-[#e8f0fe] text-[#1a73e8] font-semibold text-xs"
              title={user.displayName || 'User'}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : user.displayName ? (
                user.displayName.slice(0, 2).toUpperCase()
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </button>

            {/* Profile Popover */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-2 w-56 rounded-xl bg-white border border-[#dadce0] shadow-xl py-1.5 z-50 text-xs text-[#202124]"
                >
                  <div className="px-3 py-2 border-b border-[#f1f3f4]">
                    <p className="font-semibold text-xs text-[#202124]">{user.displayName || 'ReflectAI User'}</p>
                    <p className="text-[11px] text-[#5f6368] truncate">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowSignOutConfirm(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 hover:bg-[#fce8e6] text-[#c5221f] transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#ea4335]" />
                      <span className="font-medium">{t.signOut}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* Sign Out Confirmation Modal */}
        <ConfirmModal
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={handleConfirmSignOut}
          title={t.signOut}
          message={t.signOutConfirmMsg}
          confirmText={t.signOut}
          cancelText={t.cancel}
          type="primary"
          isLoading={isSigningOut}
        />
      </motion.aside>
    );
  }

  // ==========================================================
  // FULL EXPANDED SIDEBAR
  // ==========================================================
  return (
    <motion.aside
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col h-full shrink-0 font-sans select-none relative z-20"
    >
      {/* Toast notification */}
      {shareToast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-[#202124] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-[#34a853]" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Top Header: Brand & Collapse Button */}
      <div className="p-3 border-b border-[#dadce0] bg-white flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <img
            src="/logo.png"
            alt="ReflectAI Logo"
            className="w-7 h-7 rounded-lg border border-[#dadce0] object-cover shadow-2xs shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-sm tracking-tight text-[#202124] leading-tight flex items-center gap-1">
              <span className="truncate">{t.appTitle}</span>
              <span className="text-[10px] font-normal text-[#5f6368] shrink-0">{t.journal}</span>
            </h2>
            <p className="text-[10px] text-[#80868b] leading-none truncate">{t.builtBy}</p>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] active:bg-[#e8eaed] transition cursor-pointer shrink-0 border border-transparent hover:border-[#dadce0]"
            title={t.collapseSidebar}
            aria-label={t.collapseSidebar}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Reflection Button (Only shown when conversations exist) */}
      {entries.length > 0 && (
        <div className="p-3 bg-[#f8f9fa] border-b border-[#dadce0]">
          <button
            id="new-reflection-btn"
            onClick={onNewEntry}
            className="w-full py-2 px-3.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-medium text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newReflection}</span>
          </button>
        </div>
      )}

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#5f6368] space-y-2">
            <div className="w-5 h-5 border-2 border-[#dadce0] border-t-[#1a73e8] rounded-full animate-spin mx-auto" />
            <p>{t.loadingVault}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#dadce0] flex items-center justify-center text-[#80868b] mx-auto">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#202124]">{t.noReflectionsYet}</p>
              <p className="text-[11px] text-[#5f6368] mt-1">
                {t.startConversationPrompt}
              </p>
            </div>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const isMenuOpen = menuOpenEntryId === entry.id;
            const isEditing = editingTitleId === entry.id;
            const localizedTitle = getLocalizedTitle(entry.title, currentLanguage, entry.messages.length > 0);

            return (
              <div
                key={entry.id}
                onClick={() => !isEditing && onSelectEntry(entry)}
                className={`group relative px-3 py-2 rounded-xl transition-all cursor-pointer border text-left flex items-center justify-between gap-1.5 ${
                  isActive
                    ? 'bg-[#e8f0fe] border-[#c2e7ff] text-[#1967d2] shadow-2xs'
                    : 'bg-white hover:bg-[#f1f3f4] border-[#e0e0e0] hover:border-[#dadce0] text-[#3c4043]'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {entry.pinned ? (
                    <Pin className="w-3 h-3 text-[#1a73e8] fill-[#1a73e8] shrink-0" />
                  ) : (
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActive ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'
                      }`}
                    />
                  )}

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(entry.id);
                        if (e.key === 'Escape') setEditingTitleId(null);
                      }}
                      onBlur={() => handleSaveRename(entry.id)}
                      autoFocus
                      className="w-full bg-white border border-[#1a73e8] rounded px-1.5 py-0.5 text-xs text-[#202124] focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate leading-tight">
                        {localizedTitle}
                      </p>
                      <p className="text-[10px] text-[#80868b] truncate leading-tight mt-0.5">
                        {entry.messages.length > 0
                          ? entry.messages[entry.messages.length - 1].content.slice(0, 38)
                          : t.noReflectionsYet}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3-Dot Actions Menu */}
                <div
                  className="relative shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  ref={isMenuOpen ? menuRef : null}
                >
                  <button
                    type="button"
                    onClick={() => setMenuOpenEntryId(isMenuOpen ? null : entry.id)}
                    className="p-1.5 rounded-lg text-[#5f6368] hover:text-[#202124] bg-[#f1f3f4] hover:bg-[#e2e5e9] border border-[#dadce0] transition cursor-pointer shrink-0 shadow-3xs flex items-center justify-center"
                    title="Menu"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 mt-1 w-44 rounded-xl bg-white border border-[#dadce0] shadow-lg py-1 z-50 text-xs text-[#202124]"
                      >
                        <button
                          type="button"
                          onClick={() => handleShareClick(entry)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] transition cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>{t.shareConversation}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePinClick(entry)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] transition cursor-pointer"
                        >
                          <Pin className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>{entry.pinned ? t.unpin : t.pin}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartRename(entry)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>{t.rename}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSummaryClick(entry)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#f1f3f4] transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>{t.summaryActionItems}</span>
                        </button>

                        <div className="border-t border-[#f1f3f4] my-1" />

                        <button
                          type="button"
                          onClick={() => handleDeleteClick(entry)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#fce8e6] text-[#d93025] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#ea4335]" />
                          <span>{t.delete}</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Profile & Sign-Out Section (Gemini Style) */}
      {user && (
        <div className="p-2.5 border-t border-[#dadce0] bg-white relative" ref={profileMenuRef}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center justify-between p-1.5 rounded-xl hover:bg-[#f1f3f4] transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-[#dadce0] object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-xs font-semibold text-[#1a73e8] shrink-0">
                  {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#202124] truncate leading-tight">
                  {user.displayName || 'ReflectAI User'}
                </p>
                <p className="text-[10px] text-[#80868b] truncate leading-tight">
                  {user.email || 'user@reflectai'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="p-1 text-[#5f6368] hover:text-[#202124] rounded-lg cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Popover Menu */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-14 left-2 right-2 rounded-xl bg-white border border-[#dadce0] shadow-lg py-1.5 z-50 text-xs text-[#202124]"
              >
                <div className="px-3 py-2 border-b border-[#f1f3f4]">
                  <p className="font-semibold text-xs text-[#202124]">{user.displayName || 'ReflectAI User'}</p>
                  <p className="text-[11px] text-[#5f6368] truncate">{user.email}</p>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    id="signout-button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSignOutConfirm(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 hover:bg-[#fce8e6] text-[#c5221f] transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#ea4335]" />
                    <span className="font-medium">{t.signOut}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={entryToDelete !== null}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t.deleteConfirmTitle}
        message={`${t.deleteConfirmMsg} ("${entryToDelete?.title}")`}
        confirmText={t.delete}
        cancelText={t.cancel}
        type="danger"
        isLoading={deletingId !== null}
      />

      {/* Sign Out Confirmation Modal */}
      <ConfirmModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleConfirmSignOut}
        title={t.signOut}
        message={t.signOutConfirmMsg}
        confirmText={t.signOut}
        cancelText={t.cancel}
        type="primary"
        isLoading={isSigningOut}
      />
    </motion.aside>
  );
};
