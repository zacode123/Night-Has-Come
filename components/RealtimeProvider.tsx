'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Cookies from 'js-cookie';

type RealtimeContextType = {
  player: any | null; 
  room: any | null;   
  isLoading: boolean;
};

const RealtimeContext = createContext<RealtimeContextType>({
  player: null,
  room: null,
  isLoading: true,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<any | null>(null);
  const [room, setRoom] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const channel = supabase.channel('global-game-state');

    const initRealtime = async () => {
      const playerId = Cookies.get('playerId') || localStorage.getItem('playerId');

      if (!playerId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // 2. Fetch initial player and room state
      const { data: initialPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (initialPlayer && isMounted) {
        setPlayer(initialPlayer);

        if (initialPlayer.room_id) {
          const { data: initialRoom } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', initialPlayer.room_id)
            .single();

          if (isMounted && initialRoom) setRoom(initialRoom);
        }
      }

      if (isMounted) setIsLoading(false);

      // 3. Set up persistent Realtime Subscriptions
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `id=eq.${playerId}` },
          (payload) => {
            const updatedPlayer = payload.new as any;
            setPlayer(updatedPlayer);

            // Handle moving between rooms or leaving a room dynamically
            if (updatedPlayer && updatedPlayer.room_id) {
              setRoom((prevRoom) => {
                if (prevRoom?.id !== updatedPlayer.room_id) {
                  supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', updatedPlayer.room_id)
                    .single()
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
          (payload) => {
            setRoom((currentRoom) => {
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
  }, []); // Empty array is completely safe now since supabase is a module import

  if (isLoading) {
    // Keeps your pure white screen overlay active during the initial setup
    return <div className="fixed inset-0 bg-white z-[9999]" />;
  }

  return (
    <RealtimeContext.Provider value={{ player, room, isLoading }}>
      {children}
    </RealtimeContext.Provider>
  );
}
