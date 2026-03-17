'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { XCircle, RefreshCcw } from 'lucide-react';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import DrippingText from '@/components/DrippingText';

export default function RejectedPage() {
  const router = useRouter();

  useEffect(() => {
    audioEngine.startMainMenuAmbient();

    const playerId =
      Cookies.get('playerId') || localStorage.getItem('playerId');

    let channel;

    if (playerId) {
      channel = supabase
        .channel(`rejected_watch_${playerId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'players',
            filter: `id=eq.${playerId}`,
          },
          (payload) => {
            if (payload.new.status === 'approved') {
              audioEngine.stopAmbient();
              router.push('/approved');
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      audioEngine.stopAmbient();
    };
  }, [router]);

  const handleReset = () => {
    audioEngine.playClick();
    audioEngine.stopAmbient();
    Cookies.remove('playerId');
    Cookies.remove('playerStatus');
    localStorage.removeItem('playerId');
    router.push('/');
  };

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
        className="relative z-10 flex flex-col items-center max-w-md text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mb-8 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]"
        >
          <XCircle size={120} strokeWidth={1.5} />
        </motion.div>

        <DrippingText
          text="REJECTED"
          className="text-5xl md:text-6xl font-['var(--font-nosifer)'] font-black tracking-widest text-red-600 mb-6 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
        />

        <p className="text-xl text-zinc-400 mb-12 tracking-wider leading-relaxed">
          The admin has rejected your request to join the night. Perhaps you are too suspicious... or not suspicious enough.
        </p>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(220, 38, 38, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="flex items-center gap-3 px-8 py-4 bg-red-700 hover:bg-red-600 text-white rounded-full font-bold tracking-widest transition-all shadow-lg"
        >
          <RefreshCcw size={20} />
          SUBMIT AGAIN
        </motion.button>
      </motion.div>
    </div>
  );
}
