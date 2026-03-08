import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useGameState(roomId: string) {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const fetchState = async () => {
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId);
      setRoom(roomData);
      setPlayers(playersData || []);
    };

    fetchState();

    const roomSub = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => {
        setRoom(payload.new as any);
      })
      .subscribe();

    const playersSub = supabase
      .channel(`room:${roomId}:players`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, payload => {
        setPlayers(prev => {
          const newPlayers = [...prev];
          const newRecord = payload.new as any;
          const index = newPlayers.findIndex(p => p.id === newRecord.id);
          if (index !== -1) {
            newPlayers[index] = newRecord;
          } else {
            newPlayers.push(newRecord);
          }
          return newPlayers;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomSub);
      supabase.removeChannel(playersSub);
    };
  }, [roomId]);

  return { room, players };
}
