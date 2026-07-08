'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client'; // Adjust to your Supabase client path

type RealtimeContextType = {
  player: any | null; // Replace 'any' with your actual Player type
  room: any | null;   // Replace 'any' with your actual Room type
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

  // Initialize your Supabase client (ensure this uses the browser singleton pattern)
  const supabase = createClient(); 

  useEffect(() => {
    let isMounted = true;
    let channel = supabase.channel('global-game-state');

    const initRealtime = async () => {
      // 1. Authenticate current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // 2. Fetch initial player and room state
      const { data: initialPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
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
          { event: '*', schema: 'public', table: 'players', filter: `id=eq.${user.id}` },
          (payload) => {
            const updatedPlayer = payload.new;
            setPlayer(updatedPlayer);

            // Dynamically handle if the player joins a new room or leaves one
            if (updatedPlayer.room_id) {
              setRoom((prevRoom) => {
                if (prevRoom?.id !== updatedPlayer.room_id) {
                  // Fetch the newly joined room
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
              setRoom(null); // Player left the room
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms' },
          (payload) => {
            // Update the room state ONLY if it's the room the player is currently in
            setRoom((currentRoom) => {
              if (currentRoom?.id === payload.new.id) {
                // If it's a DELETE event, payload.new might be missing data depending on your replica settings
                return payload.eventType === 'DELETE' ? null : payload.new;
              }
              return currentRoom;
            });
          }
        )
        .subscribe();
    };

    initRealtime();

    // Cleanup channel on unmount
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <RealtimeContext.Provider value={{ player, room, isLoading }}>
      {children}
    </RealtimeContext.Provider>
  );
}
