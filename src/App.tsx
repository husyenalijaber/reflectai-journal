/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Sparkles, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-10 h-10 rounded-sm bg-[#c5a059]/15 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059]">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex items-center space-x-2.5 text-[#a3a3a3] text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
          <span className="font-serif italic text-[#d4d4d4]">Accessing your private sanctuary...</span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#525252]">
          Firestore Encrypted &bull; Isolated Vault
        </p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
