'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'motion/react';
import { audioEngine } from '@/lib/audioEngine';

export default function WaitingLobby() {
  const router = useRouter();
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    audioEngine.startMainMenuAmbient();
  }, []);

  useEffect(() => {
    const localId = localStorage.getItem('playerId');
    if (!localId) {
      router.push('/');
      return;
    }

    // Initial check
    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('status, room_id')
        .eq('id', localId)
        .maybeSingle();

      if (!data) {
        setStatus('rejected');
        localStorage.removeItem('playerId');
      } else {
        setStatus(data.status);
        if (data.status === 'approved' && data.room_id) {
          router.push(`/room/${data.room_id}`);
        } else if (data.status === 'rejected') {
          setStatus('rejected');
          localStorage.removeItem('playerId');
        }
      }
    };

    checkStatus();

    // Realtime subscription
    const channel = supabase.channel(`player_status:${localId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'players', 
        filter: `id=eq.${localId}` 
      }, (payload) => {
        const newStatus = payload.new.status;
        const newRoomId = payload.new.room_id;
        
        if (newStatus === 'approved' && newRoomId) {
          setStatus('approved');
          router.push(`/room/${newRoomId}`);
        } else if (newStatus === 'rejected') {
          setStatus('rejected');
          localStorage.removeItem('playerId');
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'players', 
        filter: `id=eq.${localId}` 
      }, () => {
        setStatus('rejected');
        localStorage.removeItem('playerId');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-red-900/20 z-10" />
        <h2 className="text-3xl font-serif tracking-widest mb-4 text-red-500 z-20">Access Denied</h2>
        <p className="text-gray-400 z-20">Your request to join has been rejected.</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-500 rounded text-white z-20"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.2)_0%,transparent_70%)] z-10" />
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay z-0"
      />
      
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-32 h-32 rounded-full bg-blue-600/20 border border-blue-500/50 shadow-[0_0_50px_rgba(37,99,235,0.3)] mb-12 flex items-center justify-center"
      >
        <div className="w-16 h-16 rounded-full bg-blue-500/40 blur-md" />
      </motion.div>

      <h2 className="text-2xl md:text-3xl font-serif tracking-widest mb-4">
        {status === 'approved' ? 'Access Granted' : 'Awaiting Approval'}
      </h2>
      
      <p className="text-gray-400 text-center max-w-md px-6">
        {status === 'approved' 
          ? 'Connecting to the game room...' 
          : 'Waiting for approval from the admin...'}
      </p>
    </div>
  );
}
