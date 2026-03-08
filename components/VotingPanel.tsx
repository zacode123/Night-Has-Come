'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { gameConfig } from '@/config/gameConfig';

interface Player {
  id: string;
  username: string;
  alive: boolean;
}

interface VotingPanelProps {
  roomId: string;
  playerId: string;
  players: Player[];
  dayNumber: number;
  phase: string;
}

export function VotingPanel({ roomId, playerId, players, dayNumber, phase }: VotingPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alivePlayers = players.filter(p => p.alive && p.id !== playerId);
  const amIAlive = players.find(p => p.id === playerId)?.alive;

  useEffect(() => {
    // Reset vote state when phase changes to voting
    if (phase === 'voting') {
      setSelectedTarget(null);
      setHasVoted(false);
    }
  }, [phase]);

  const handleVote = async () => {
    if (!selectedTarget || hasVoted || !amIAlive || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('votes')
        .insert([{
          room_id: roomId,
          voter_id: playerId,
          target_id: selectedTarget,
          day: dayNumber
        }]);

      if (error) throw error;

      setHasVoted(true);
      
      // Play drum hit sound
      const voteSound = new Audio('/sounds/vote_drum_hit.mp3');
      voteSound.volume = 0.6;
      voteSound.play().catch(() => {});

    } catch (err) {
      console.error('Error casting vote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase !== 'voting') return null;

  if (!amIAlive) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl text-center">
        <h3 className="text-xl font-bold text-slate-400 mb-2">Voting Phase</h3>
        <p className="text-slate-500">You are dead and cannot vote.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/90 border border-purple-500/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-md w-full max-w-md mx-auto"
    >
      <h3 className="text-2xl font-bold text-purple-400 mb-2 text-center uppercase tracking-widest">
        Cast Your Vote
      </h3>
      <p className="text-slate-400 text-center mb-6 text-sm">
        Select a player to eliminate. The player with the most votes will be executed.
      </p>

      {hasVoted ? (
        <div className="text-center p-8 bg-purple-900/20 rounded-xl border border-purple-500/20">
          <p className="text-xl font-medium text-purple-300 mb-2">Vote Cast</p>
          <p className="text-slate-400">Waiting for other players...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-900">
            {alivePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedTarget(p.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedTarget === p.id
                    ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-purple-500/50 hover:bg-slate-800'
                }`}
              >
                <p className="font-medium truncate">{p.username}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedTarget || isSubmitting}
            className="w-full py-4 mt-4 rounded-xl font-bold tracking-widest uppercase transition-all bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
          >
            {isSubmitting ? 'Voting...' : 'Confirm Vote'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
