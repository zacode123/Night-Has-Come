'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, UserPlus, X, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';

interface BotHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHireBots: (bots: Array<{ username: string; personality: string }>) => Promise<void>;
  onRemoveBot: (botId: string) => Promise<void>;
  currentBots: any[];
  maxSlots: number;
}

const BOT_NAME_POOL = [
  'Kim Jun-hee',
  'Lee Yoon-seo',
  'Shin So-mi',
  'Ko Kyung-jun',
  'Oh Jung-won',
  'Jin Da-bum',
  'Park Woo-ram',
  'Kim Dong-hyun',
  'Choi Mi-na',
  'Yoo Tae-sik'
];

const PERSONALITY_POOL = [
  'Leader',
  'Quiet Observer',
  'Strategic Thinker',
  'Rebellious',
  'Aggressive',
  'Friendly',
  'Cautious',
  'Empathetic'
];

export default function BotHireModal({
  isOpen,
  onClose,
  onHireBots,
  onRemoveBot,
  currentBots,
  maxSlots
}: BotHireModalProps) {
  const [hireCount, setHireCount] = useState(1);
  const [selectedPersonality, setSelectedPersonality] = useState('Strategic Thinker');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSlots = Math.max(0, maxSlots - currentBots.length);

  const handleHire = async () => {
    if (hireCount <= 0 || hireCount > availableSlots) return;
    setIsSubmitting(true);
    audioEngine.playClick();

    try {
      const botsToCreate = [];
      const usedNames = new Set(currentBots.map((b) => b.username));
      const pool = BOT_NAME_POOL.filter((n) => !usedNames.has(n));

      for (let i = 0; i < hireCount; i++) {
        const name = pool[i] || `Student #${Math.floor(100 + Math.random() * 900)}`;
        const personality = i === 0 ? selectedPersonality : PERSONALITY_POOL[Math.floor(Math.random() * PERSONALITY_POOL.length)];
        botsToCreate.push({
          username: name,
          personality: personality,
        });
      }

      await onHireBots(botsToCreate);
      onClose();
    } catch (err) {
      console.error('Error hiring bots:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-950 border border-red-900/60 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-950/60 border border-red-600/40 text-red-400">
                <Bot size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Hire AI Bot Participants</h2>
                <p className="text-xs text-zinc-400">Fills empty player slots with autonomous NPCs</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Hired Bots */}
          {currentBots.length > 0 && (
            <div className="mb-5">
              <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2 block">
                Active Hired Bots ({currentBots.length})
              </label>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {currentBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                        <Bot size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-200">{bot.username}</span>
                        <span className="text-xs text-zinc-500 ml-2">({bot.personality})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveBot(bot.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Dismiss bot"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hire Controls */}
          {availableSlots > 0 ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Number of Bots to Hire</span>
                  <span className="text-red-400 font-bold">{hireCount} (Max {availableSlots} available)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={Math.min(availableSlots, 8)}
                  value={hireCount}
                  onChange={(e) => setHireCount(parseInt(e.target.value))}
                  className="w-full accent-red-600 bg-zinc-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2 block">
                  Lead Personality Archetype
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {PERSONALITY_POOL.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPersonality(p)}
                      className={`p-2 rounded-lg text-left text-xs font-medium border transition-all ${
                        selectedPersonality === p
                          ? 'bg-red-950/60 border-red-500 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/20 border border-red-900/40 text-xs text-red-300">
                <ShieldAlert size={16} className="flex-shrink-0 text-red-400" />
                <span>AI Bots will wander 3D rooms like NPCs, investigate items, debate in chat, and vote.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleHire}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Hire {hireCount} Bot{hireCount > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-zinc-400 text-sm">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p>Room is at full player capacity ({maxSlots}/{maxSlots})</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
