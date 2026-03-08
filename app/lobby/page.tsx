'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { audioEngine } from '@/lib/audioEngine';

export default function Lobby() {
  const router = useRouter();
  const [status, setStatus] = useState('pending');
  const [countdown, setCountdown] = useState(20);
  const [players, setPlayers] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('playerName') || 'Player';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerName(name);

    // Simulate admin approval
    const timer = setTimeout(() => {
      setStatus('approved');
      audioEngine.playSound('ping', false, 0.5);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'approved') {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            router.push('/room/test-room'); // Redirect to game room
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, router]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-8 p-8">
        {status === 'pending' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-6"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 rounded-full border-t-2 border-b-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            />
            <h2 className="text-2xl font-display font-light text-blue-200 tracking-widest">
              Waiting for approval from Zahid Arman...
            </h2>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-8 w-full max-w-2xl"
          >
            <h1 className="text-4xl font-display font-bold text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              Game Lobby
            </h1>
            
            <div className="w-full bg-slate-900/50 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(59,130,246,0.1)]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h3 className="text-xl font-medium text-blue-200">Players Joined</h3>
                <span className="text-sm font-mono text-slate-400">1 / 15</span>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-center space-x-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center">
                    <span className="text-blue-200 font-bold">{playerName.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-white font-medium">{playerName}</span>
                  <span className="ml-auto text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Ready</span>
                </li>
                {/* Mock other players */}
                <li className="flex items-center space-x-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 opacity-50">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-slate-400">?</span>
                  </div>
                  <span className="text-slate-400 italic">Waiting for player...</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm text-blue-200/70 uppercase tracking-widest">Game begins in</p>
              <motion.div 
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-display font-bold text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]"
              >
                {countdown}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
