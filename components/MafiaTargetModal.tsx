'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, Heart, Search, X, Check, Shield, Bot, User } from 'lucide-react';
import { Player3DData } from './GameBoard';
import { audioEngine } from '@/lib/audioEngine';

interface MafiaTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player3DData[];
  currentUserId: string;
  role?: string | null;
  onConfirmTarget: (targetId: string) => void;
}

export default function MafiaTargetModal({
  isOpen,
  onClose,
  players,
  currentUserId,
  role = 'Mafia',
  onConfirmTarget,
}: MafiaTargetModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const isMafia = role === 'Mafia';
  const isDoctor = role === 'Doctor';
  const isPolice = role === 'Police' || role === 'Detective';

  const eligibleTargets = players.filter(
    (p) => p.id !== currentUserId && (p.alive ?? true)
  );

  const handleSelect = (id: string) => {
    audioEngine.playSelect();
    setSelectedTargetId(id);
  };

  const handleConfirm = () => {
    if (!selectedTargetId) return;
    audioEngine.playRoleReveal();
    onConfirmTarget(selectedTargetId);
    setSelectedTargetId(null);
    onClose();
  };

  const themeConfig = isMafia
    ? {
        border: 'border-red-600/80',
        headerGradient: 'from-red-950 via-zinc-950 to-black',
        iconBg: 'bg-red-950/80 border-red-500/60 text-red-400',
        accentText: 'text-red-400',
        title: 'CHOOSE TARGET TO ELIMINATE',
        subtitle: 'Select any living student to strike tonight before dawn.',
        confirmBtn: 'bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border-red-500 text-white shadow-red-950/80',
        selectedBorder: 'border-red-500 ring-2 ring-red-500/50 bg-red-950/40',
        selectedBadge: 'bg-red-900/80 text-red-200 border-red-500/60',
        icon: <Skull size={22} className="animate-pulse" />,
        actionWord: 'CONFIRM ELIMINATION',
      }
    : isDoctor
    ? {
        border: 'border-emerald-600/80',
        headerGradient: 'from-emerald-950 via-zinc-950 to-black',
        iconBg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400',
        accentText: 'text-emerald-400',
        title: 'CHOOSE PLAYER TO SHIELD',
        subtitle: 'Select one student to protect tonight from the Mafia.',
        confirmBtn: 'bg-gradient-to-r from-emerald-700 to-emerald-900 hover:from-emerald-600 hover:to-emerald-800 border-emerald-500 text-white shadow-emerald-950/80',
        selectedBorder: 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-950/40',
        selectedBadge: 'bg-emerald-900/80 text-emerald-200 border-emerald-500/60',
        icon: <Heart size={22} className="animate-pulse" />,
        actionWord: 'CONFIRM SHIELD',
      }
    : {
        border: 'border-blue-600/80',
        headerGradient: 'from-blue-950 via-zinc-950 to-black',
        iconBg: 'bg-blue-950/80 border-blue-500/60 text-blue-400',
        accentText: 'text-blue-400',
        title: 'CHOOSE SUSPECT TO INVESTIGATE',
        subtitle: 'Scan any student to uncover their secret role identity.',
        confirmBtn: 'bg-gradient-to-r from-blue-700 to-indigo-900 hover:from-blue-600 hover:to-indigo-800 border-blue-500 text-white shadow-blue-950/80',
        selectedBorder: 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-950/40',
        selectedBadge: 'bg-blue-900/80 text-blue-200 border-blue-500/60',
        icon: <Search size={22} className="animate-pulse" />,
        actionWord: 'CONFIRM INVESTIGATION',
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-lg bg-zinc-950 border ${themeConfig.border} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]`}
          >
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r ${themeConfig.headerGradient} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${themeConfig.iconBg}`}>
                  {themeConfig.icon}
                </div>
                <div>
                  <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${themeConfig.accentText} block`}>
                    SECRET NIGHT OPERATION
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                    {themeConfig.title}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {themeConfig.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Players Selection Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 max-h-[50vh]">
              {eligibleTargets.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 font-mono text-xs">
                  No other living players available to target.
                </div>
              ) : (
                eligibleTargets.map((player) => {
                  const isSelected = selectedTargetId === player.id;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleSelect(player.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? themeConfig.selectedBorder
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar thumbnail */}
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center shrink-0">
                          {player.avatar_base64 ? (
                            <img
                              src={player.avatar_base64}
                              alt={player.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-sm font-bold text-zinc-300 font-mono">
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {player.is_bot && (
                            <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-zinc-900/90 text-[8px] text-zinc-400">
                              <Bot size={10} />
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono">
                              {player.username}
                            </span>
                            {player.is_bot ? (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
                                <Bot size={10} /> BOT
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-700/40 text-blue-300 flex items-center gap-1">
                                <User size={10} /> HUMAN
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400 mt-0.5 block">
                            {player.personality || 'Quiet Observer'}
                          </span>
                        </div>
                      </div>

                      {/* Radio / Selection Indicator */}
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? `${themeConfig.selectedBadge} scale-110`
                            : 'border-zinc-700 bg-black/40'
                        }`}
                      >
                        {isSelected && <Check size={14} className="stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-white/10 bg-black/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="button"
                disabled={!selectedTargetId}
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl border font-mono font-bold text-xs uppercase shadow-xl transition-all cursor-pointer flex items-center gap-2 ${
                  selectedTargetId
                    ? `${themeConfig.confirmBtn} active:scale-95`
                    : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
              >
                <Shield size={14} />
                <span>{themeConfig.actionWord}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
