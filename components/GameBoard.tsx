'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  username: string;
  alive: boolean;
}

interface GameBoardProps {
  roomId: string;
  playerId: string;
  myRole: string | null;
  phase: string;
  dayNumber: number;
  players: Player[];
  narratorText: string;
}

export function GameBoard({ roomId, playerId, myRole, phase, dayNumber, players, narratorText }: GameBoardProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasActed, setHasActed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset state on phase change
    setSelectedTarget(null);
    setHasActed(false);
  }, [phase]);

  const handleAction = async () => {
    if (!selectedTarget || hasActed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (myRole === 'Mafia') {
        const { error } = await supabase.from('kills').insert([{
          room_id: roomId,
          mafia_id: playerId,
          target_id: selectedTarget,
          night: dayNumber
        }]);
        if (error) throw error;
      } else if (['Doctor', 'Police', 'Detective', 'Hero'].includes(myRole || '')) {
        const { error } = await supabase.from('abilities').insert([{
          room_id: roomId,
          player_id: playerId,
          ability_type: myRole,
          target_id: selectedTarget,
          night: dayNumber
        }]);
        if (error) throw error;
      }

      setHasActed(true);
    } catch (err) {
      console.error('Error performing action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNightAction = () => {
    if (phase !== 'night') return null;

    const amIAlive = players.find(p => p.id === playerId)?.alive;
    if (!amIAlive) {
      return (
        <div className="mt-8 p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
          <p className="text-slate-500 italic">You are dead. You cannot perform actions.</p>
        </div>
      );
    }

    if (myRole === 'Citizen') {
      return (
        <div className="mt-8 p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
          <p className="text-slate-400">You are a Citizen. Sleep tight and hope you wake up tomorrow.</p>
        </div>
      );
    }

    if (hasActed) {
      return (
        <div className="mt-8 p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
          <p className="text-blue-400 font-medium">Action confirmed. Waiting for morning...</p>
        </div>
      );
    }

    const alivePlayers = players.filter(p => p.alive);
    const validTargets = myRole === 'Mafia' 
      ? alivePlayers.filter(p => p.id !== playerId) // Mafia can't kill themselves
      : alivePlayers;

    let actionLabel = 'Select Target';
    if (myRole === 'Mafia') actionLabel = 'Select player to eliminate';
    if (myRole === 'Doctor') actionLabel = 'Select player to save';
    if (myRole === 'Police') actionLabel = 'Select player to investigate';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 p-6 bg-slate-900/80 rounded-2xl border border-slate-700 shadow-xl max-w-md mx-auto"
      >
        <h3 className="text-xl font-bold text-slate-200 mb-2">{myRole} Action</h3>
        <p className="text-slate-400 text-sm mb-4">{actionLabel}</p>

        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
          {validTargets.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedTarget(p.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedTarget === p.id
                  ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800'
              }`}
            >
              <p className="font-medium truncate">{p.username} {p.id === playerId && '(You)'}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleAction}
          disabled={!selectedTarget || isSubmitting}
          className="w-full py-3 mt-4 rounded-xl font-bold tracking-widest uppercase transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          {isSubmitting ? 'Confirming...' : 'Confirm Action'}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={narratorText}
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="text-center max-w-2xl z-10"
        >
          <p className="text-2xl md:text-3xl lg:text-4xl font-light tracking-wide text-slate-200 leading-relaxed drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {narratorText}
          </p>
        </motion.div>
      </AnimatePresence>

      {renderNightAction()}
    </div>
  );
}
