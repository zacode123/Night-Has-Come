import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { roomId, voterId, targetId, day } = await req.json();

    const { error } = await supabase
      .from('votes')
      .insert({
        room_id: roomId,
        voter_id: voterId,
        target_id: targetId,
        day: day
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
  }
}
