import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { hostId } = await request.json();

  if (!hostId) {
    return NextResponse.json(
      { error: 'Host ID is required' },
      { status: 400 }
    );
  }

  // Generate room code using crypto
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

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    roomId: data.id,
    roomCode: data.room_code
  });
}
