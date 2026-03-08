import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Player {
  id: string;
  username: string;
  room_id: string;
  role: string | null;
  alive: boolean;
  connected: boolean;
  personality: string;
}

export interface GameState {
  id: string;
  room_code: string;
  host_id: string;
  status: string;
  phase: string;
  day_number: number;
}

export function useGameState(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const fetchState = async () => {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (room) setGameState(room);

      const { data: p } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);
      if (p) setPlayers(p);
    };

    fetchState();

    const channel = supabase.channel(`game:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setGameState(payload.new as GameState);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => {
        // Refetch players to get full list
        supabase.from('players').select('*').eq('room_id', roomId).then(({ data }) => {
          if (data) setPlayers(data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const castVote = async (targetId: string) => {
    const localId = localStorage.getItem('playerId');
    if (!localId || !gameState) return;

    await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        voterId: localId,
        targetId,
        day: gameState.day_number
      })
    });
  };

  return { gameState, players, castVote };
}
