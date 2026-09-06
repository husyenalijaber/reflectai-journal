import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  Shield,
  Lock,
  BrainCircuit,
  BookHeart,
  ArrowRight,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, signingIn, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-white text-[#202124] flex flex-col font-sans selection:bg-[#d2e3fc] selection:text-[#174ea6]">
      {/* Top clean header */}
      <div className="w-full border-b border-[#dadce0] bg-white px-6 sm:px-10 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="ReflectAI Journal Logo"
            className="w-9 h-9 rounded-xl border border-[#dadce0] object-cover shadow-xs"
          />
          <div className="flex items-baseline space-x-1.5">
            <span className="font-semibold text-xl tracking-tight text-[#202124]">ReflectAI</span>
            <span className="text-xs text-[#5f6368] font-normal">Journal</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-[#5f6368]">
          <Shield className="w-4 h-4 text-[#1a73e8]" />
          <span className="text-xs font-medium">Private &amp; Secure</span>
        </div>
      </div>

      {/* Main Hero Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20 max-w-5xl mx-auto w-full">
        {error && (
          <div className="w-full max-w-md mb-8 p-4 rounded-xl bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs flex items-start justify-between shadow-xs">
            <div className="flex items-start space-x-2.5">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-[#c5221f] hover:text-[#b31412] text-xs ml-2 cursor-pointer font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="text-center max-w-3xl space-y-6">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#202124] leading-tight sm:leading-tight">
            A private space for thoughtful reflection &amp; mindful clarity
          </h1>

          <p className="text-[#5f6368] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Converse with Gemini to unpack your thoughts, track emotional trends, discover daily inspiration, and synthesize key takeaways - securely preserved in your personal Firestore vault.
          </p>

          {/* Primary Call to Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="google-signin-btn"
              onClick={() => signInWithGoogle()}
              disabled={signingIn}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-white bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] active:scale-98 transition-all flex items-center justify-center space-x-3 shadow-md shadow-[#1a73e8]/20 cursor-pointer disabled:opacity-60"
            >
              {signingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-sm font-medium text-white">Opening your journal vault...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-sm text-white tracking-wide">Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-white ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 sm:mt-20 w-full">
          <div className="bg-white border border-[#dadce0] rounded-2xl p-6 text-left space-y-3 hover:border-[#1a73e8]/50 hover:shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#202124]">Multi-Turn Gemini Reflections</h3>
            <p className="text-[#5f6368] text-xs leading-relaxed">
              Have a thoughtful, empathetic dialogue. Gemini listens, reframes negative friction, and asks perceptive questions.
            </p>
          </div>

          <div className="bg-white border border-[#dadce0] rounded-2xl p-6 text-left space-y-3 hover:border-[#34a853]/50 hover:shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4ea] border border-[#ceead6] flex items-center justify-center text-[#137333]">
              <TrendingUp className="w-5 h-5 text-[#34a853]" />
            </div>
            <h3 className="text-sm font-semibold text-[#202124]">Emotional Trend Tracking</h3>
            <p className="text-[#5f6368] text-xs leading-relaxed">
              Visualize your emotional journey over time with interactive Recharts diagrams analyzing sentiments across entries.
            </p>
          </div>

          <div className="bg-white border border-[#dadce0] rounded-2xl p-6 text-left space-y-3 hover:border-[#f9ab00]/50 hover:shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-[#fef7e0] border border-[#fce8b2] flex items-center justify-center text-[#ea8600]">
              <BookHeart className="w-5 h-5 text-[#ea8600]" />
            </div>
            <h3 className="text-sm font-semibold text-[#202124]">Prompts &amp; Draft Recovery</h3>
            <p className="text-[#5f6368] text-xs leading-relaxed">
              Never stare at a blank page with Gemini Prompt of the Day, and never lose your thoughts with local storage draft recovery.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#dadce0] py-5 text-center text-xs text-[#5f6368] bg-[#f8f9fa]">
        ReflectAI Journal &bull; Built by Husyen Ali Alhabsy
      </footer>
    </div>
  );
};
