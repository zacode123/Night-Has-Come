'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeProvider';
import { audioEngine } from '@/lib/audioEngine';
import { supabase } from '@/lib/supabaseClient';
import DrippingText from '@/components/DrippingText';

export default function ApprovedPage() {
  const router = useRouter();

  // 1. Get live state directly from your global provider
  const { player, room, isLoading, refreshPlayer, setRoom } = useRealtime(); 
  const [isVerifyingRoom, setIsVerifyingRoom] = useState(true);
  const [currentRoomStatus, setCurrentRoomStatus] = useState<string | null>(null);

  // Verify fresh ground-truth room status directly from Supabase upon mounting
  useEffect(() => {
    let isMounted = true;
    const verifyRoom = async () => {
      try {
        const activePlayer = player || (await refreshPlayer());
        if (activePlayer?.room_id) {
          const { data: freshRoom } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', activePlayer.room_id)
            .maybeSingle();

          if (isMounted) {
            if (freshRoom) {
              setRoom(freshRoom);
              setCurrentRoomStatus(freshRoom.status);
              // If the room is already in_game, redirect directly
              if (freshRoom.status === 'in_game') {
                router.replace(`/game/${activePlayer.room_id}`);
                return;
              }
            } else {
              setCurrentRoomStatus(null);
            }
            setIsVerifyingRoom(false);
          }
        } else {
          if (isMounted) setIsVerifyingRoom(false);
        }
      } catch {
        if (isMounted) setIsVerifyingRoom(false);
      }
    };

    verifyRoom();

    return () => {
      isMounted = false;
    };
  }, [player?.room_id, router, setRoom, refreshPlayer]);

  // Keep currentRoomStatus in sync with realtime room changes
  useEffect(() => {
    if (room && room.id === player?.room_id) {
      setCurrentRoomStatus(room.status);
    }
  }, [room, player?.room_id]);

  // Handle routing based on live state changes
  useEffect(() => {
    // Wait until both global loading and room verification are completed
    if (isLoading || isVerifyingRoom) return;

    // If player doesn't exist at all, send to root sign-in
    if (!player) {
      router.replace('/');
      return;
    }

    // If explicitly rejected, redirect to rejected page
    if (player.status === 'rejected') {
      router.replace('/rejected');
      return;
    }

    // If they were moved back to pending
    if (player.status === 'pending') {
      router.replace('/lobby');
      return;
    }

    // STRICT GAME START GUARD: Only redirect to game if room status is verified as in_game
    if (currentRoomStatus === 'in_game' && player.room_id) {
      router.replace(`/game/${player.room_id}`);
      return;
    }
  }, [player, currentRoomStatus, isLoading, isVerifyingRoom, router]);

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
