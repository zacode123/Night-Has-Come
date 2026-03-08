'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'motion/react';
import { Player } from '@/hooks/useGameState';

export default function RoomLobby({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const localId = localStorage.getItem('playerId');
    if (!localId) {
      router.push('/');
      return;
    }

    const fetchRoom = async () => {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (room) {
        setIsHost(room.host_id === localId);
        if (room.status === 'playing') {
          router.push(`/game/${roomId}`);
        }
      }
    };

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);
      if (data) setPlayers(data);
    };

    fetchRoom();
    fetchPlayers();

    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => {
        fetchPlayers();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === 'playing') {
          setCountdown(5);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, router]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      router.push(`/game/${roomId}`);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, roomId, router]);

  const startGame = async () => {
    if (!isHost) return;
    await fetch('/api/start-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-serif text-blue-400 mb-2 text-center">GAME LOBBY</h1>
        <p className="text-gray-400 text-center mb-12 tracking-widest uppercase text-sm">Room Code: {roomId.slice(0, 8)}</p>

        {countdown !== null ? (
          <div className="text-center py-20">
            <motion.div 
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-mono text-white mb-4"
            >
              {countdown}
            </motion.div>
            <p className="text-blue-400 tracking-widest uppercase">Game starting soon</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-medium">Players ({players.length})</h2>
              {isHost && (
                <button 
                  onClick={startGame}
                  disabled={players.length < 3}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Start Game
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {players.map(player => (
                <div key={player.id} className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">{player.username}</p>
                    <p className="text-xs text-gray-500">{player.personality || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {players.length < 3 && isHost && (
              <p className="text-red-400 text-sm mt-6 text-center">Need at least 3 players to start.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
