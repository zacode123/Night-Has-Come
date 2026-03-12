import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

export async function createRoom(hostId: string) {
  const roomCode = crypto.randomUUID().slice(0, 6).toUpperCase();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      room_code: roomCode,
      host_id: hostId,
      status: 'waiting',
      phase: 'Lobby',
      day_number: 0
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Helper to subscribe to room updates
export const subscribeToRoom = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      callback
    )
    .subscribe();
};

// Helper to subscribe to player updates in a room
export const subscribeToPlayers = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`players:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    )
    .subscribe();
};

// Helper to subscribe to chat messages in a room
export const subscribeToMessages = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    )
    .subscribe();
};

// Helper to subscribe to game events (votes, kills, etc.)
export const subscribeToGameEvents = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`game_events:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => callback({ type: 'vote', ...payload })
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'kills',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => callback({ type: 'kill', ...payload })
    )
    .subscribe();
};
