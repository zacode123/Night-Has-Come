'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Shield, Skull, Heart, Search, Volume2, X, Check, AlertTriangle, Flame, Sparkles } from 'lucide-react';

interface RulesBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayAudio?: () => void;
  activeStepIndex?: number;
  isAutomatedIntro?: boolean;
}

export default function RulesBanner({
  isOpen,
  onClose,
  onReplayAudio,
  activeStepIndex = -1,
  isAutomatedIntro = false,
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
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 transition-colors"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                  {!isAutomatedIntro && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* CRITICAL WARNING STIPULATION (Explicitly requested by user) */}
              <div className="mt-3.5 p-3 rounded-2xl bg-red-950/90 border-2 border-red-600 shadow-lg shadow-red-950/60 flex items-start gap-2.5">
                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-red-300 font-mono block">
                    ⚠️ MANDATORY SURVIVAL WARNING ⚠️
                  </span>
                  <p className="text-xs sm:text-sm text-red-100 font-semibold mt-0.5 leading-snug">
                    Everyone must follow the rules, otherwise you will be immediately eliminated and face instant execution!
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
                  <strong className="text-emerald-400">Citizens:</strong> Win by working together to identify and vote out every Mafia member.
                  <br />
                  <strong className="text-red-400">Mafia:</strong> Wins by secretly eliminating Citizens until they outnumber or equal the living survivors.
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
                  Rule 2: Secret Roles & Abilities
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/60 border border-red-900/40 flex items-start gap-2.5">
                    <Skull size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-400 block font-semibold">Mafia</strong>
                      <span>Secretly strikes and eliminates one victim each Night.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-900/40 flex items-start gap-2.5">
                    <Heart size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-400 block font-semibold">Doctor</strong>
                      <span>Shields and heals one player each Night from lethal attacks.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-blue-900/40 flex items-start gap-2.5">
                    <Search size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-400 block font-semibold">Police / Detective</strong>
                      <span>Investigates one suspect each Night in secret to uncover their true role.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-700/40 flex items-start gap-2.5">
                    <Shield size={18} className="text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-200 block font-semibold">Citizen</strong>
                      <span>Deduces clues, cross-examines alibis, and votes during daytime.</span>
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
                      <strong className="text-white">Night Curfew:</strong> Lights go out. Special roles deploy their actions secretly.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 border border-amber-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Morning Roll Call:</strong> Casualties of the night are announced to all survivors.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 border border-blue-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Discussion:</strong> Walk the 3D manor, speak in chat, interrogate alibis, and find suspects.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 border border-purple-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="text-white">Voting & Execution:</strong> Cast your vote before curfew expires. The highest-voted player is eliminated!
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
                  The game has begun! Night Curfew is about to descend. Enter your quarters, keep your doors locked, and prepare to act when night falls!
                </p>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="p-4 border-t border-amber-900/30 bg-black/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400">
                {isAutomatedIntro ? 'AI Narrator Audio Active...' : 'Briefing Complete'}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-extrabold text-xs shadow-xl shadow-red-950/60 active:scale-95 transition-all cursor-pointer"
              >
                <Check size={16} />
                <span>I Am Ready: Enter Night</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
