'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function WaitingRoom() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const router = useRouter();

  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    
    if (!playerId) {
      router.push('/');
      return;
    }

    // Check initial status
    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('status')
        .eq('id', playerId)
        .single();
        
      if (data) {
        setStatus(data.status as any);
        if (data.status === 'approved') {
          router.push('/lobby');
        }
      }
    };
    
    checkStatus();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`player_status_${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          setStatus(newStatus);
          if (newStatus === 'approved') {
            router.push('/lobby');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white font-sans overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_50%)]" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-t-2 border-b-2 border-blue-500 mb-8 relative"
        >
          <div className="absolute inset-0 rounded-full border-l-2 border-r-2 border-purple-500/50 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-blue-500/20 blur-md" />
        </motion.div>

        <h2 className="text-2xl font-bold tracking-widest text-blue-100 mb-4 uppercase">
          Waiting for Approval
        </h2>
        
        <p className="text-slate-400 text-lg font-light">
          Waiting for approval from <span className="text-blue-400 font-medium">Zahid Arman</span>...
        </p>

        {status === 'rejected' && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-red-500 font-medium"
          >
            Your request to join was rejected.
          </motion.p>
        )}
      </div>
    </main>
  );
}
