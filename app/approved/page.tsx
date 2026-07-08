'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeProvider';
import { audioEngine } from '@/lib/audioEngine';
import DrippingText from '@/components/DrippingText';
import Cookies from 'js-cookie';

export default function ApprovedPage() {
  const router = useRouter();

  // 1. Get live state directly from your global provider
  const { player, room, isLoading } = useRealtime(); 

  // Handle routing based on live state changes
  useEffect(() => {
    // Do nothing while the provider is initially fetching data
    if (isLoading) return;

    // If player doesn't exist, or got rejected/deleted, kick them out
    if (!player || player.status === 'rejected') {
      router.replace('/rejected');
      return;
    }

    // If they were somehow moved back to pending
    if (player.status === 'pending') {
      router.replace('/lobby');
      return;
    }

    // If they are no longer in a room
    if (!player.room_id) {
      router.replace('/');
      return;
    }

    // If the admin started the game
    if (room?.status === 'in_game') {
      router.replace(`/game/${player.room_id}`);
      return;
    }
  }, [player, room, isLoading, router]); // Re-runs instantly whenever provider state updates

  // Handle ambient audio
  useEffect(() => {
    audioEngine.startMainMenuAmbient();
    
    return () => {
      audioEngine.stopAmbient();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,40,0,0.8)_0%,rgba(0,0,0,1)_100%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center max-w-md text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mb-8 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]"
        >
          <CheckCircle2 size={120} strokeWidth={1.5} />
        </motion.div>

        <DrippingText
          text="APPROVED"
          className="text-5xl md:text-6xl font-['var(--font-nosifer)'] font-black tracking-widest text-emerald-500 mb-6 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
        />

        <p className="text-xl text-zinc-400 mb-12 tracking-wider leading-relaxed">
          The admin has approved your request. You are now part of the night.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-emerald-500 animate-spin" />
          <p className="text-sm text-emerald-500/70 tracking-widest uppercase font-bold">
            Waiting for admin to start the game...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
