'use client';

import { Player } from '@/hooks/useGameState';
import { motion } from 'motion/react';

export default function GameBoard({ 
  phase, 
  dayNumber, 
  players, 
  currentUserId 
}: { 
  phase: string, 
  dayNumber: number, 
  players: Player[],
  currentUserId: string
}) {
  const currentPlayer = players.find(p => p.id === currentUserId);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/20 text-sm tracking-widest uppercase text-gray-300">
        Day {dayNumber} • {phase}
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-serif text-white tracking-wide">
          Your Role: <span className="text-blue-400">{currentPlayer?.role || 'Unknown'}</span>
        </h2>
        {!currentPlayer?.alive && (
          <p className="text-red-400 uppercase tracking-widest font-bold">You are dead</p>
        )}
      </div>

      {phase === 'Night' && currentPlayer?.role === 'Mafia' && currentPlayer?.alive && (
        <div className="mt-8 p-6 bg-red-950/30 border border-red-900/50 rounded-xl max-w-md w-full">
          <h3 className="text-red-400 font-serif text-xl mb-4">Select a target to eliminate</h3>
          {/* Mafia target selection UI would go here */}
          <p className="text-gray-400 text-sm">Waiting for mafia consensus...</p>
        </div>
      )}
    </div>
  );
}
