'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneCall, X, User, Check, Users } from 'lucide-react';
import { getPersonalityBorder } from '@/lib/personalityBorder';

interface PlayerItem {
  id: string;
  username: string;
  avatar_base64?: string | null;
  personality?: string;
  alive?: boolean;
}

interface LiveCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerItem[];
  currentUserId: string;
  onStartCall: (selectedIds: string[], selectedPlayers: any[]) => void;
}

export default function LiveCallModal({
  isOpen,
  onClose,
  players,
  currentUserId,
  onStartCall,
}: LiveCallModalProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const eligiblePlayers = players.filter(
    (p) => p.id !== currentUserId && (p.alive ?? true)
  );

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (selectedPlayerIds.length === 0) return;
    const selectedData = players.filter((p) => selectedPlayerIds.includes(p.id));
    onStartCall(selectedPlayerIds, selectedData);
    onClose();
    setSelectedPlayerIds([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-sm bg-zinc-950 border border-red-600/40 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2 text-red-500">
              <PhoneCall size={20} />
              <h3 className="font-bold text-sm tracking-wide uppercase font-mono">
                Start Live Group Call
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-zinc-400 mb-3">
            Select 2 or more players for an independent secret audio call. You can talk while walking in 3D and chatting.
          </p>

          {/* Players List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {eligiblePlayers.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No other players available to call.
              </div>
            ) : (
              eligiblePlayers.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <div
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/60 border-red-500 shadow-md shadow-red-950/50'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border-2 ${getPersonalityBorder(
                          player.personality || 'Leader'
                        )}`}
                      >
                        {player.avatar_base64 && !player.avatar_base64.startsWith('bot_prompt:') ? (
                          <img
                            src={player.avatar_base64}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="flex items-center justify-center h-full text-zinc-400">
                            <User size={16} />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">
                          {player.username}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {player.personality || 'Citizen'}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'border-white/20 bg-black/40'
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-white/10 mt-3 flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={selectedPlayerIds.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-1.5"
            >
              <Users size={14} />
              <span>Call ({selectedPlayerIds.length})</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
