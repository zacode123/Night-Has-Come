'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Home } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeProvider';
import { audioEngine } from '@/lib/audioEngine';
import DrippingText from '@/components/DrippingText';

export default function StartedPage() {
  const { player, room, isLoading } = useRealtime();

  useEffect(() => {
    if (isLoading) return;

    if (room.status === 'in_game' && player) {
      router.replace(`/game/${room.id}`);
      return;
    }
    
    // Automatically route them if the admin changes their status
    if (player.status === 'approved') {
      router.replace('/approved');
      return;
    }

    if (player.status === 'rejected') {
      router.replace('/rejected');
      return;
    }

    if (player.status === 'pending') {
      router.replace('/lobby');
      return;
    }
  }, [player, isLoading, router]);
  
  useEffect(() => {
    audioEngine.startMainMenuAmbient();

    return () => {
      audioEngine.stopAmbient();
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(60,0,0,0.8)_0%,rgba(0,0,0,1)_100%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center max-w-2xl text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mb-8 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]"
        >
          <AlertTriangle size={120} strokeWidth={1.5} />
        </motion.div>

        <DrippingText 
          text="NIGHT HAS COME" 
          className="text-4xl md:text-6xl font-['var(--font-nosifer)'] font-black tracking-widest text-red-600 mb-6 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
        />

        <p className="text-2xl text-zinc-300 mb-6 tracking-widest font-bold">
          The game has already started.
        </p>

        <p className="text-xl text-zinc-400 mb-12 tracking-wider leading-relaxed">
          You cannot join the night once it has begun. Please wait for the next game to start.
        </p>
      </motion.div>
    </div>
  );
}
