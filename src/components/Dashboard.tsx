import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import { db } from '../lib/firebase.ts';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { JournalEntry, JournalMessage, ReflectionMode, AIModelTier, QuotedMessagePreview } from '../types.ts';
import { EntrySidebar } from './EntrySidebar.tsx';
import { EntryEditor } from './EntryEditor.tsx';
import { EmotionalTrendsChart } from './EmotionalTrendsChart.tsx';
import { getTranslation, isDefaultTitle } from '../utils/i18n.ts';
import { AlertCircle } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

interface FirestoreErrorInfo {
  code: string;
  message: string;
  operation: OperationType;
  path: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Language selector state
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem('reflectai_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const t = getTranslation(selectedLanguage);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>('new');
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gemini-style unified Sidebar: Desktop collapse toggles between full width & mini-rail
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('reflectai_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Mobile sidebar drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Emotional Trends overlay modal
  const [showTrends, setShowTrends] = useState(false);

  const handleSelectLanguage = async (code: string) => {
    setSelectedLanguage(code);
    try {
      localStorage.setItem('reflectai_language', code);
    } catch (e) {
      console.error('Failed to persist language:', e);
    }

    // Sync default titles of existing entries in Firestore to the new language
    if (user && entries.length > 0) {
      const newT = getTranslation(code);
      const updates = entries
        .filter((entry) => isDefaultTitle(entry.title))
        .map((entry) =>
          updateDoc(doc(db, 'users', user.uid, 'entries', entry.id), {
            title: entry.messages.length === 0 ? newT.newReflection : newT.untitledReflection,
            updatedAt: serverTimestamp(),
          }).catch((err) => console.warn('Title language sync notice:', err))
        );
      Promise.all(updates);
    }
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      const next = !isSidebarOpen;
      setIsSidebarOpen(next);
      try {
        localStorage.setItem('reflectai_sidebar_open', String(next));
      } catch (e) {
        console.error('Failed to save sidebar state:', e);
      }
    }
  };

  const handleFirestoreError = (
    error: any,
    operation: OperationType,
    path: string
  ) => {
    const errorInfo: FirestoreErrorInfo = {
      code: error?.code || 'unknown',
      message: error?.message || 'Unknown Firestore error',
      operation,
      path,
    };
    console.error('Firestore operation failed:', JSON.stringify(errorInfo, null, 2));
    if (error?.code === 'permission-denied') {
      setErrorMessage(
        'Akses ditolak: Verifikasi izin Firestore. Hanya Anda yang dapat mengakses data ini.'
      );
    } else {
      setErrorMessage(`Operasi database gagal (${operation}): ${errorInfo.message}`);
    }
  };

  // Real-time Firestore sync for entries (fast, non-composite-index query)
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoadingEntries(false);
      return;
    }

    setLoadingEntries(true);
    const path = `users/${user.uid}/entries`;

    try {
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      // Use single-field query to avoid missing composite index timeout (eliminates ~60s stall)
      const q = query(entriesRef, where('userId', '==', user.uid));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedEntries: JournalEntry[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let parsedDate = new Date().toISOString();
            if (data.updatedAt) {
              parsedDate =
                typeof data.updatedAt.toDate === 'function'
                  ? data.updatedAt.toDate().toISOString()
                  : new Date(data.updatedAt).toISOString();
            } else if (data.createdAt) {
              parsedDate =
                typeof data.createdAt.toDate === 'function'
                  ? data.createdAt.toDate().toISOString()
                  : new Date(data.createdAt).toISOString();
            }

            return {
              id: docSnap.id,
              userId: data.userId || user.uid,
              title: data.title || '',
              prompt: data.prompt || '',
              summary: data.summary || '',
              messages: Array.isArray(data.messages) ? data.messages : [],
              tags: Array.isArray(data.tags) ? data.tags : [],
              pinned: Boolean(data.pinned),
              createdAt: parsedDate,
              updatedAt: parsedDate,
            };
          });

          // Sort in memory by pinned and most recent updatedAt/createdAt
          fetchedEntries.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const timeB = new Date(b.updatedAt || b.createdAt).getTime();
            const timeA = new Date(a.updatedAt || a.createdAt).getTime();
            return timeB - timeA;
          });

          setEntries(fetchedEntries);
          setLoadingEntries(false);

          setActiveEntryId((current) => {
            if (current && current !== 'new' && fetchedEntries.some((e) => e.id === current)) {
              return current;
            }
            try {
              const savedActiveId = localStorage.getItem(`reflectai_active_entry_${user.uid}`);
              if (savedActiveId && savedActiveId !== 'new' && fetchedEntries.some((e) => e.id === savedActiveId)) {
                return savedActiveId;
              }
            } catch (e) {
              console.error('Error reading active entry from storage:', e);
            }
            return fetchedEntries.length > 0 ? fetchedEntries[0].id : 'new';
          });
        },
        (error) => {
          console.error('Firestore snapshot error:', error);
          setLoadingEntries(false);
          handleFirestoreError(error, OperationType.LIST, path);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Subscription setup error:', err);
      setLoadingEntries(false);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }, [user]);

  // Keep track of active entry in localStorage
  useEffect(() => {
    if (user && activeEntryId) {
      try {
        localStorage.setItem(`reflectai_active_entry_${user.uid}`, activeEntryId);
      } catch (e) {
        console.error('Error saving active entry to storage:', e);
      }
    }
  }, [user, activeEntryId]);

  // Transient blank entry definition (client-side only until first message is sent)
  const blankEntry: JournalEntry = useMemo(
    () => ({
      id: 'new',
      userId: user?.uid || '',
      title: t.newReflection,
      prompt: '',
      summary: '',
      messages: [],
      tags: ['reflection'],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [user?.uid, t.newReflection]
  );

  // Active entry resolution: always guaranteed to exist
  const activeEntry = useMemo(() => {
    if (activeEntryId && activeEntryId !== 'new') {
      return entries.find((e) => e.id === activeEntryId) || blankEntry;
    }
    return blankEntry;
  }, [activeEntryId, entries, blankEntry]);

  // Start a new reflection without creating an empty Firestore record
  const handleStartNewConversation = () => {
    setActiveEntryId('new');
    setMobileSidebarOpen(false);
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    setErrorMessage(null);
    const path = `users/${user.uid}/entries/${entryId}`;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', entryId));
      const remaining = entries.filter((e) => e.id !== entryId);
      if (activeEntryId === entryId) {
        if (remaining.length > 0) {
          setActiveEntryId(remaining[0].id);
        } else {
          // No more conversations: directly show new blank reflection without creating Firestore doc
          setActiveEntryId('new');
        }
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setErrorMessage('Failed to delete entry from Firestore.');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Rename an entry
  const handleRenameEntry = async (entryId: string, newTitle: string) => {
    if (!user) return;
    if (entryId === 'new') return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'entries', entryId), {
        title: newTitle,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error renaming entry:', error);
    }
  };

  // Toggle Pin on an entry
  const handleTogglePinEntry = async (entryId: string) => {
    if (!user) return;
    if (entryId === 'new') return;
    const target = entries.find((e) => e.id === entryId);
    if (!target) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'entries', entryId), {
        pinned: !target.pinned,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Send a multi-turn message to Gemini (default: Gemini 3.6 Flash) and update/create in Firestore
  const handleSendMessage = async (
    text: string,
    mode: ReflectionMode = 'reflective',
    language: string = selectedLanguage,
    replyTo?: QuotedMessagePreview
  ) => {
    if (!user) return;

    const isNewConversation = !activeEntryId || activeEntryId === 'new' || !entries.some((e) => e.id === activeEntryId);
    const currentEntry = isNewConversation ? blankEntry : entries.find((e) => e.id === activeEntryId)!;

    setErrorMessage(null);
    setIsGeneratingAI(true);
    setIsSaving(true);

    const userMessage: JournalMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      ...(replyTo ? { replyTo } : {}),
    };

    const updatedMessages = [...currentEntry.messages, userMessage];

    // Determine title: automatically derived from first prompt
    let updatedTitle = currentEntry.title;
    if (isNewConversation || isDefaultTitle(currentEntry.title) || currentEntry.messages.length === 0) {
      const preview = text.split(/[.\n?!]/)[0].trim();
      updatedTitle = preview.length > 50 ? `${preview.slice(0, 47)}...` : preview || t.newReflection;
    }

    const targetEntryId = isNewConversation
      ? `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      : currentEntry.id;

    try {
      if (isNewConversation) {
        // Create document in Firestore ONLY when user sends their first message
        await setDoc(doc(db, 'users', user.uid, 'entries', targetEntryId), {
          id: targetEntryId,
          userId: user.uid,
          title: updatedTitle,
          prompt: text,
          summary: '',
          messages: updatedMessages,
          tags: ['reflection'],
          pinned: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActiveEntryId(targetEntryId);
      } else {
        await updateDoc(doc(db, 'users', user.uid, 'entries', targetEntryId), {
          title: updatedTitle,
          prompt: currentEntry.prompt || text,
          messages: updatedMessages,
          updatedAt: serverTimestamp(),
        });
      }

      // Call Gemini backend (Gemini 3.6 Flash) with language and mode
      const startTime = Date.now();
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          reflectionMode: mode,
          language,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const modelReply = data.reply || 'No reflection response generated.';
      const thoughtDuration = Math.max(1, Math.round((Date.now() - startTime) / 1000));

      const modelMessage: JournalMessage = {
        id: `msg_${Date.now()}_model`,
        role: 'model',
        content: modelReply,
        createdAt: new Date().toISOString(),
        thoughtDuration,
        ...(replyTo ? { replyTo } : {}),
      };

      const finalMessages = [...updatedMessages, modelMessage];

      // Save Gemini response to Firestore
      await updateDoc(doc(db, 'users', user.uid, 'entries', targetEntryId), {
        messages: finalMessages,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error handling message exchange:', error);
      setErrorMessage(error?.message || 'Failed to complete Gemini reflection dialogue.');
    } finally {
      setIsGeneratingAI(false);
      setIsSaving(false);
    }
  };

  // Update entry title
  const handleUpdateTitle = async (newTitle: string) => {
    if (!user || !activeEntryId || activeEntryId === 'new') return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'entries', activeEntryId), {
        title: newTitle,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating title:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/entries/${activeEntryId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-white text-[#202124] font-sans selection:bg-[#d2e3fc] selection:text-[#174ea6]">
      {/* Error notification banner */}
      {errorMessage && (
        <div className="bg-[#fce8e6] border-b border-[#fad2cf] px-4 py-2 text-xs text-[#c5221f] flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#ea4335] shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#c5221f] hover:text-[#b31412] cursor-pointer font-bold px-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Emotional Trends Modal Overlay */}
      {entries.length > 0 && showTrends && (
        <EmotionalTrendsChart
          entries={entries}
          onClose={() => setShowTrends(false)}
          isModal={true}
        />
      )}

      {/* Main Full-Height Workspace Layout (Gemini Style) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar: full expanded or slim mini-rail with smooth animated spring width */}
        <motion.div
          animate={{ width: isSidebarOpen ? 288 : 64 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240, mass: 0.8 }}
          className="hidden md:block h-full shrink-0 overflow-hidden"
        >
          <EntrySidebar
            entries={entries}
            activeEntryId={activeEntryId}
            onSelectEntry={(entry) => setActiveEntryId(entry.id)}
            onNewEntry={handleStartNewConversation}
            onDeleteEntry={handleDeleteEntry}
            onRenameEntry={handleRenameEntry}
            onTogglePinEntry={handleTogglePinEntry}
            onOpenSummary={(entry) => setActiveEntryId(entry.id)}
            onToggleCollapse={handleToggleSidebar}
            onOpenTrends={() => setShowTrends(true)}
            isCollapsed={!isSidebarOpen}
            currentLanguage={selectedLanguage}
            loading={loadingEntries}
          />
        </motion.div>

        {/* Mobile Fullscreen Sidebar Drawer with smooth AnimatePresence hide-and-seek */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="relative w-72 max-w-[85%] h-full bg-white z-10 shadow-2xl"
              >
                <EntrySidebar
                  entries={entries}
                  activeEntryId={activeEntryId}
                  onSelectEntry={(entry) => {
                    setActiveEntryId(entry.id);
                    setMobileSidebarOpen(false);
                  }}
                  onNewEntry={() => {
                    handleStartNewConversation();
                    setMobileSidebarOpen(false);
                  }}
                  onDeleteEntry={handleDeleteEntry}
                  onRenameEntry={handleRenameEntry}
                  onTogglePinEntry={handleTogglePinEntry}
                  onOpenSummary={(entry) => {
                    setActiveEntryId(entry.id);
                    setMobileSidebarOpen(false);
                  }}
                  onToggleCollapse={() => setMobileSidebarOpen(false)}
                  onOpenTrends={() => {
                    setShowTrends(true);
                    setMobileSidebarOpen(false);
                  }}
                  isCollapsed={false}
                  currentLanguage={selectedLanguage}
                  loading={loadingEntries}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* Main Editor */}
        <EntryEditor
          entry={activeEntry}
          onSendMessage={handleSendMessage}
          onUpdateTitle={handleUpdateTitle}
          onTogglePin={handleTogglePinEntry}
          onDeleteEntry={handleDeleteEntry}
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
          onOpenTrends={() => setShowTrends(true)}
          currentLanguage={selectedLanguage}
          onSelectLanguage={handleSelectLanguage}
          isGeneratingAI={isGeneratingAI}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
};
