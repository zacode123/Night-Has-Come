'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Shield, Skull, Heart, Search, Volume2, AlertTriangle, Sparkles, Clock, Radio } from 'lucide-react';

interface RulesBannerProps {
  isOpen: boolean;
  onClose?: () => void;
  onReplayAudio?: () => void;
  activeStepIndex?: number;
  autoCloseSeconds?: number | null;
}

export default function RulesBanner({
  isOpen,
  onReplayAudio,
  activeStepIndex = -1,
  autoCloseSeconds = null,
}: RulesBannerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-amber-600/70 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          >
            {/* Dramatic Header with Warning Pulsing Banner */}
            <div className="p-4 sm:p-5 border-b border-amber-900/40 bg-gradient-to-r from-red-950/70 via-amber-950/50 to-zinc-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400">
                    <Shield size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400 block">
                      OFFICIAL SYSTEM MANDATE
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-wide font-mono uppercase">
                      GAME HAS OFFICIALLY BEGUN
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onReplayAudio && (
                    <button
                      type="button"
                      onClick={onReplayAudio}
                      title="Replay Voice Narration"
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 transition-colors cursor-pointer"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* CRITICAL WARNING STIPULATION */}
              <div className="mt-3.5 p-3 rounded-2xl bg-red-950/90 border-2 border-red-600 shadow-lg shadow-red-950/60 flex items-start gap-2.5">
                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-red-300 font-mono block">
                    ⚠️ MANDATORY SURVIVAL WARNING ⚠️
                  </span>
                  <p className="text-xs sm:text-sm text-red-100 font-semibold mt-0.5 leading-snug">
                    Everyone must follow the rules, otherwise you will face instant execution!
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Rules Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {/* Objective */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activeStepIndex === 2
                    ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-zinc-900/60 border-amber-500/20'
                }`}
              >
                <span className="font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-2 mb-1">
                  <span>🎯</span>
                  <span className="font-mono uppercase">Rule 1: The Core Objective</span>
                </span>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  <strong className="text-emerald-400">Citizens:</strong> Work together to find and vote out every Mafia member.
                  <br />
                  <strong className="text-red-400">Mafia:</strong> Secretly eliminates Citizens until the Mafia outnumbers or equals the living survivors.
                </p>
              </div>

              {/* Roles Breakdown */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activeStepIndex === 3
                    ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className="text-[11px] font-mono text-amber-400 font-bold tracking-wider uppercase block mb-2">
                  Rule 2: Special Roles & Abilities
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/60 border border-red-900/40 flex items-start gap-2.5">
                    <Skull size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-400 block font-semibold">Mafia</strong>
                      <span>Strikes secretly each night to eliminate a victim.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-900/40 flex items-start gap-2.5">
                    <Heart size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-400 block font-semibold">Doctor</strong>
                      <span>Shields and protects one player each night from dying.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-blue-900/40 flex items-start gap-2.5">
                    <Search size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-400 block font-semibold">Police / Detective</strong>
                      <span>Investigates one suspect each night to reveal their identity.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-700/40 flex items-start gap-2.5">
                    <Shield size={18} className="text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-200 block font-semibold">Citizen</strong>
                      <span>Shares clues, checks alibis, and votes during daytime.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Phases Cycle */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activeStepIndex === 4
                    ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className="text-[11px] font-mono text-amber-400 font-bold tracking-wider uppercase block mb-2">
                  Rule 3: Daily Round Cycle
                </span>
                <ol className="space-y-2 text-xs">
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-red-950 text-red-400 border border-red-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Night Curfew:</strong> Lights go out. Special roles act secretly.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 border border-amber-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Morning Roll Call:</strong> Casualties are announced to all survivors.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 border border-blue-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Discussion:</strong> Talk in chat, question alibis, and find suspects.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 border border-purple-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="text-white">Voting:</strong> Cast your vote before curfew. The player with the highest votes is eliminated!
                    </div>
                  </li>
                </ol>
              </div>

              {/* BE READY & WHAT TO DO NEXT INSTRUCTION */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  activeStepIndex === 5
                    ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/50'
                    : 'bg-emerald-950/40 border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-emerald-400" />
                  <span className="font-bold text-emerald-300 font-mono text-xs uppercase">
                    BE READY: NEXT IMMEDIATE INSTRUCTION
                  </span>
                </div>
                <p className="text-emerald-100 text-xs leading-relaxed">
                  The game has begun! Head immediately to your quarters, keep your doors locked, and prepare for night curfew!
                </p>
              </div>
            </div>

            {/* Footer with Automatic Countdown (Manual button removed as requested) */}
            <div className="p-4 border-t border-amber-900/30 bg-black/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono">
                {autoCloseSeconds !== null && autoCloseSeconds >= 0 ? (
                  <span className="flex items-center gap-2 text-amber-400 font-bold animate-pulse">
                    <Clock size={16} className="text-amber-400" />
                    <span>Briefing complete. Entering Night Curfew in {autoCloseSeconds}s...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Radio size={14} className="text-red-400 animate-pulse" />
                    <span>Voice briefing in progress... Modal will close automatically in 3 seconds after audio.</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <span>AUTOMATIC TRANSITION</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
