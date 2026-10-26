'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Shield, Skull, Heart, Search, Volume2, X, Check } from 'lucide-react';

interface RulesBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayAudio?: () => void;
}

export default function RulesBanner({
  isOpen,
  onClose,
  onReplayAudio,
}: RulesBannerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-zinc-950 border border-amber-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/40 bg-gradient-to-r from-amber-950/40 to-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-amber-100 tracking-wide font-mono">
                    GAME RULES & BRIEFING
                  </h2>
                  <p className="text-xs text-amber-300/70">
                    Simple English guide to survive the night
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {onReplayAudio && (
                  <button
                    onClick={onReplayAudio}
                    title="Replay Voice Narration"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 transition-colors"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Rules Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {/* Objective */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
                <span className="font-bold text-amber-400 block mb-1">
                  🎯 MAIN OBJECTIVE
                </span>
                <p className="text-zinc-300 text-xs">
                  <strong className="text-white">Citizens</strong> win by finding and voting out every Mafia member.
                  <br />
                  <strong className="text-red-400">Mafia</strong> wins by eliminating Citizens until they outnumber the living.
                </p>
              </div>

              {/* Roles Breakdown */}
              <div>
                <span className="text-[11px] font-mono text-amber-400/90 font-bold tracking-wider uppercase block mb-2">
                  Player Roles
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-red-900/30 flex items-start gap-2.5">
                    <Skull size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-400 block font-semibold">Mafia</strong>
                      <span>Secretly votes to eliminate one victim each Night.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-emerald-900/30 flex items-start gap-2.5">
                    <Heart size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-400 block font-semibold">Doctor</strong>
                      <span>Chooses one player to protect each Night from death.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-blue-900/30 flex items-start gap-2.5">
                    <Search size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-400 block font-semibold">Police / Detective</strong>
                      <span>Investigates one suspect each Night to uncover their true role.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/30 flex items-start gap-2.5">
                    <Shield size={18} className="text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-200 block font-semibold">Citizen</strong>
                      <span>Uses discussion and clues to vote out the killers during daytime.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Phases Cycle */}
              <div>
                <span className="text-[11px] font-mono text-amber-400/90 font-bold tracking-wider uppercase block mb-2">
                  Daily Cycle (4 Phases)
                </span>
                <ol className="space-y-2 text-xs">
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-red-950 text-red-400 border border-red-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Night Curfew (30s):</strong> The lights dim. Special roles use their abilities. Mafia strikes.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 border border-amber-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Morning (8s):</strong> Manor lights turn back on and casualties of the night are announced.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 border border-blue-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Discussion (60s):</strong> Move freely around the 3D manor, talk in chat, interrogate suspects, and build trust.
                    </div>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 border border-purple-700/50 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="text-white">Voting (30s):</strong> Cast your vote on the player you think is the Mafia. The player with the most votes is eliminated!
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            {/* Footer Dismiss Button */}
            <div className="p-4 border-t border-amber-900/30 bg-black/50 flex justify-end">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950/60 active:scale-95 transition-all cursor-pointer"
              >
                <Check size={16} />
                <span>I Understand the Rules</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
