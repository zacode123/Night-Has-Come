'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Volume2, Sparkles, Award, Square } from 'lucide-react';
import { narrationEngine } from '@/lib/narrationEngine';

export interface GameOverModalProps {
  isOpen: boolean;
  winnerTeam: 'Citizens' | 'Mafia' | null;
  players: Array<{
    id: string;
    username: string;
    role: string | null;
    alive: boolean;
    is_bot?: boolean;
    avatar_base64?: string | null;
  }>;
  isAdmin?: boolean;
  onStopGame?: () => void;
}

export default function GameOverModal({
  isOpen,
  winnerTeam,
  players,
  isAdmin = false,
  onStopGame,
}: GameOverModalProps) {
  if (!isOpen || !winnerTeam) return null;

  const isCitizensWinner = winnerTeam === 'Citizens';

  const winningPlayers = players.filter((p) => {
    if (isCitizensWinner) {
      return p.role !== 'Mafia';
    } else {
      return p.role === 'Mafia';
    }
  });

  const losingPlayers = players.filter((p) => {
    if (isCitizensWinner) {
      return p.role === 'Mafia';
    } else {
      return p.role !== 'Mafia';
    }
  });

  const replayAudio = () => {
    narrationEngine.narrateGameEnd(winnerTeam, winningPlayers, losingPlayers);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto select-none pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-2xl bg-zinc-950 border ${
            isCitizensWinner ? 'border-emerald-500/70 shadow-emerald-950/80' : 'border-red-600/70 shadow-red-950/80'
          } rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]`}
        >
          {/* Ambient Header Glow */}
          <div
            className={`px-6 py-6 text-center border-b ${
              isCitizensWinner
                ? 'bg-gradient-to-b from-emerald-950/90 via-zinc-950 to-zinc-950 border-emerald-900/50'
                : 'bg-gradient-to-b from-red-950/90 via-zinc-950 to-zinc-950 border-red-900/50'
            }`}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-xl ring-2 ${isCitizensWinner ? 'ring-emerald-400/40 bg-emerald-500/20' : 'ring-red-400/40 bg-red-500/20'}">
              {isCitizensWinner ? (
                <Trophy size={36} className="text-emerald-400 animate-bounce" />
              ) : (
                <Skull size={36} className="text-red-500 animate-pulse" />
              )}
            </div>

            <span className="text-xs font-mono font-black tracking-widest uppercase px-3 py-1 rounded-full bg-black/60 border border-white/10 text-zinc-400 inline-block mb-2">
              SIMULATION CONCLUDED
            </span>

            <h1
              className={`text-2xl sm:text-3xl font-black tracking-tight font-mono uppercase ${
                isCitizensWinner ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]'
              }`}
            >
              {isCitizensWinner ? '🎉 CITIZENS TRIUMPH!' : '☠️ MAFIA TAKEOVER!'}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 max-w-lg mx-auto leading-relaxed">
              {isCitizensWinner
                ? 'All Mafia conspirators were identified and eliminated! Yooil Manor survives the darkness.'
                : 'The Mafia overpowered the citizens and seized complete control of the retreat center.'}
            </p>

            {/* Voice Announcement Button */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={replayAudio}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/15 text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Volume2 size={16} className={isCitizensWinner ? 'text-emerald-400' : 'text-red-400'} />
                <span>Hear Winner Announcement Again</span>
              </button>
            </div>
          </div>

          {/* Body Content with Scroll */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* Explicit Congratulations to Winners Section */}
            <div
              className={`p-4 rounded-2xl border ${
                isCitizensWinner ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-red-950/30 border-red-500/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className={isCitizensWinner ? 'text-emerald-400' : 'text-red-400'} />
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-zinc-100">
                  🏆 CONGRATULATIONS TO OUR WINNERS!
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {winningPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/70 border border-white/10 hover:border-white/20 transition-all shadow"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                        <Award size={16} className="text-amber-400" />
                      </div>
                      <div className="truncate">
                        <span className="text-sm font-bold text-white block truncate">
                          {player.username}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Role: <strong className={isCitizensWinner ? 'text-emerald-400' : 'text-red-400'}>{player.role || 'Citizen'}</strong>
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300">
                      WINNER
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Defeated Players Section */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Skull size={16} className="text-zinc-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Defeated & Eliminated Guests
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {losingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 opacity-80"
                  >
                    <div className="truncate">
                      <span className="text-xs font-semibold text-zinc-300 block truncate">
                        {player.username}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Revealed Role: <strong className="text-zinc-400">{player.role || 'Citizen'}</strong>
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[9px] font-mono text-zinc-500 bg-black/40 border border-white/5">
                      DEFEATED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer: ONLY shown for ADMIN player to STOP GAME */}
          {isAdmin && onStopGame && (
            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/80 flex items-center justify-center">
              <button
                type="button"
                onClick={onStopGame}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest border border-red-500/60 shadow-xl shadow-red-950/80 transition-all cursor-pointer active:scale-95"
              >
                <Square size={16} className="fill-current" />
                <span>STOP GAME (ADMIN SESSION RESET)</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
