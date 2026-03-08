'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Player } from '@/hooks/useGameState';

interface VotingPanelProps {
  players: Player[];
  currentUserId: string;
  onVote: (targetId: string) => void;
  hasVoted: boolean;
}

export default function VotingPanel({ players, currentUserId, onVote, hasVoted }: VotingPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleVote = () => {
    if (selectedId && !hasVoted) {
      onVote(selectedId);
    }
  };

  const alivePlayers = players.filter(p => p.alive && p.id !== currentUserId);

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-md">
      <h3 className="text-xl font-serif text-purple-300 mb-4 text-center">Cast Your Vote</h3>
      
      {hasVoted ? (
        <div className="text-center text-gray-400 py-8">
          Vote cast. Waiting for others...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {alivePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedId(player.id)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedId === player.id 
                    ? 'bg-purple-500/20 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {player.username}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleVote}
            disabled={!selectedId}
            className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            Confirm Vote
          </button>
        </div>
      )}
    </div>
  );
}
