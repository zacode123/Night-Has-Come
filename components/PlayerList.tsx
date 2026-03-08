'use client';

import { Player } from '@/hooks/useGameState';
import { motion } from 'motion/react';
import { Skull, User } from 'lucide-react';

export default function PlayerList({ players, currentUserId }: { players: Player[], currentUserId: string }) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md h-full overflow-y-auto">
      <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4 font-semibold">Players ({players.length})</h3>
      <div className="space-y-2">
        {players.map(player => (
          <div 
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.id === currentUserId ? 'bg-blue-900/20 border-blue-500/30' : 'bg-white/5 border-transparent'
            } ${!player.alive ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                !player.alive ? 'bg-red-950 text-red-500' : 'bg-gray-800 text-gray-300'
              }`}>
                {!player.alive ? <Skull size={16} /> : <User size={16} />}
              </div>
              <div>
                <p className={`font-medium ${!player.alive ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {player.username} {player.id === currentUserId && '(You)'}
                </p>
                {player.id === currentUserId && player.role && (
                  <p className="text-xs text-blue-400">{player.role}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-500' : 'bg-gray-600'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
