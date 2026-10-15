'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Cookies from 'js-cookie';

type RealtimeContextType = {
  player: any | null; 
  room: any | null;   
  isLoading: boolean;
  setPlayer: (player: any) => void;
  setRoom: (room: any) => void;
  refreshPlayer: (id?: string) => Promise<any>;
};

const RealtimeContext = createContext<RealtimeContextType>({
  player: null,
  room: null,
  isLoading: true,
  setPlayer: () => {},
  setRoom: () => {},
  refreshPlayer: async () => null,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<any | null>(null);
  const [room, setRoom] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // 1. Initial read on mount
  useEffect(() => {
    let initialId: string | null = null;
    try {
      initialId = Cookies.get('playerId') || localStorage.getItem('playerId') || null;
    } catch {
      initialId = null;
    }

    if (initialId) {
      setCurrentPlayerId(initialId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // 2. Manage subscription and player/room fetching whenever currentPlayerId changes
  useEffect(() => {
    if (currentPlayerId === null) {
      return;
    }

    if (!currentPlayerId) {
      setPlayer(null);
      setRoom(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const channel = supabase.channel(`global-game-state-${currentPlayerId}`);

    const initRealtime = async () => {
      try {
        // Fetch initial player and room state
        const { data: initialPlayer, error: pError } = await supabase
          .from('players')
          .select('*')
          .eq('id', currentPlayerId)
          .maybeSingle();

        if (initialPlayer && isMounted) {
          setPlayer(initialPlayer);

          if (initialPlayer.room_id) {
            const { data: initialRoom } = await supabase
              .from('rooms')
              .select('*')
              .eq('id', initialPlayer.room_id)
              .maybeSingle();

            if (isMounted && initialRoom) setRoom(initialRoom);
          } else {
            if (isMounted) setRoom(null);
          }
        } else if (isMounted) {
          // If query returned null (player deleted or invalid ID), clean up
          setPlayer(null);
          setRoom(null);
        }
      } catch (err) {
        console.error('Error in initRealtime:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }

      // Persistent Realtime Subscriptions
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `id=eq.${currentPlayerId}` },
          (payload) => {
            const updatedPlayer = payload.new as any;
            if (payload.eventType === 'DELETE') {
              setPlayer(null);
              setRoom(null);
              return;
            }
            setPlayer(updatedPlayer);

            // Handle moving between rooms or leaving a room dynamically
            if (updatedPlayer && updatedPlayer.room_id) {
              setRoom((prevRoom: any) => {
                if (prevRoom?.id !== updatedPlayer.room_id) {
                  supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', updatedPlayer.room_id)
                    .maybeSingle()
                    .then(({ data }) => {
                      if (data && isMounted) setRoom(data);
                    });
                }
                return prevRoom;
              });
            } else {
              setRoom(null); 
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms' },
          (payload: any) => {
            setRoom((currentRoom: any) => {
              const targetId = payload.new?.id || payload.old?.id;
              if (currentRoom?.id === targetId) {
                return payload.eventType === 'DELETE' ? null : payload.new;
              }
              return currentRoom;
            });
          }
        )
        .subscribe();
    };

    initRealtime();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentPlayerId]);

  const refreshPlayer = async (id?: string) => {
    const targetId = id || Cookies.get('playerId') || localStorage.getItem('playerId');

    if (!targetId) {
      setPlayer(null);
      setRoom(null);
      setCurrentPlayerId(null);
      setIsLoading(false);
      return null;
    }

    if (currentPlayerId !== targetId) {
      setCurrentPlayerId(targetId);
    }

    try {
      const { data: fetchedPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (fetchedPlayer) {
        setPlayer(fetchedPlayer);
        if (fetchedPlayer.room_id) {
          const { data: initialRoom } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', fetchedPlayer.room_id)
            .maybeSingle();
          if (initialRoom) setRoom(initialRoom);
        } else {
          setRoom(null);
        }
      }
      return fetchedPlayer;
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-red-500/80 font-mono tracking-widest uppercase">Connecting to Night...</span>
        </div>
      </div>
    );
  }

  return (
    <RealtimeContext.Provider value={{ player, room, isLoading, setPlayer, setRoom, refreshPlayer }}>
      {children}
    </RealtimeContext.Provider>
  );
}
