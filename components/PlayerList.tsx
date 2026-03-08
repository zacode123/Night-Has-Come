'use client';

import { motion } from 'framer-motion';
import { Skull, User, Shield, Eye } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  role: string | null;
  alive: boolean;
  connected: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  phase: string;
  myRole: string | null;
}

export function PlayerList({ players, currentPlayerId, phase, myRole }: PlayerListProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900/80 border-l border-slate-800 backdrop-blur-md overflow-hidden p-4">
      <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
        <User size={18} className="text-blue-400" />
        Players ({players.filter(p => p.alive).length}/{players.length})
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {players.map((player) => {
          const isMe = player.id === currentPlayerId;
          const isDead = !player.alive;
          
          // Determine if we should show their role
          // 1. If it's me
          // 2. If they are dead (roles are revealed on death)
          // 3. If I am Mafia and they are Mafia
          let displayRole = 'Unknown';
          let showRole = false;

          if (isMe) {
            displayRole = player.role || 'Unknown';
            showRole = true;
          } else if (isDead) {
            displayRole = player.role || 'Unknown';
            showRole = true;
          } else if (myRole === 'Mafia' && player.role === 'Mafia') {
            displayRole = 'Mafia';
            showRole = true;
          }

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`relative p-3 rounded-xl border flex items-center gap-3 transition-all ${
                isDead
                  ? 'bg-slate-950/80 border-red-900/30 opacity-60 grayscale'
                  : isMe
                  ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-inner ${
                isDead ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-600'
              }`}>
                {isDead ? (
                  <Skull size={18} className="text-red-500" />
                ) : (
                  <span className="text-lg font-bold text-slate-300">
                    {player.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDead ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {player.username} {isMe && '(You)'}
                </p>
                {showRole && (
                  <p className={`text-xs font-medium mt-0.5 ${
                    displayRole === 'Mafia' ? 'text-red-400' : 
                    displayRole === 'Doctor' ? 'text-green-400' : 
                    displayRole === 'Police' ? 'text-blue-400' : 
                    'text-slate-400'
                  }`}>
                    {displayRole}
                  </p>
                )}
              </div>

              {!player.connected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-600" title="Disconnected" />
              )}
              {player.connected && !isDead && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" title="Connected" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
