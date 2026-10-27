'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import DrippingText from '@/components/DrippingText';

export default function StartedPage() {
  useEffect(() => {
    audioEngine.startMainMenuAmbient();

    return () => {
      audioEngine.stopAmbient();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(80,0,0,0.85)_0%,rgba(0,0,0,1)_100%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/25 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center max-w-xl text-center bg-zinc-950/80 border border-red-600/50 p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-md"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mb-6 p-4 rounded-3xl bg-red-950/70 border-2 border-red-600 text-red-500 shadow-xl shadow-red-950/80"
        >
          <ShieldAlert size={80} strokeWidth={1.5} />
        </motion.div>

        <DrippingText 
          text="ENTRY LOCKED" 
          className="text-3xl sm:text-5xl font-['var(--font-nosifer)'] font-black tracking-widest text-red-600 mb-4 drop-shadow-[0_0_12px_rgba(220,38,38,0.8)]"
        />

        <span className="text-xs font-mono font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 mb-4 inline-block shadow">
          MATCH ALREADY IN PROGRESS
        </span>

        <p className="text-base sm:text-lg text-zinc-200 font-semibold mb-3 tracking-wide">
          The 60-second warmup period has expired and the game has officially begun!
        </p>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md">
          No new players or guests can join or spawn once night curfew has fallen. You must wait for the current simulation to conclude before entering a new match.
        </p>
      </motion.div>
    </div>
  );
}
