import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { roomId, playerId } = await request.json();

  if (!roomId || !playerId) {
    return NextResponse.json({ error: 'Room ID and Player ID are required' }, { status: 400 });
  }

  // Check if room exists and is open
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('status, id')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  // Update player's room_id
  const { error: updateError } = await supabase
    .from('players')
    .update({ room_id: roomId, connected: true })
    .eq('id', playerId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
