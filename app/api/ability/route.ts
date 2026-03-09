import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { roomId, playerId, abilityType, targetId, night } = await request.json();

  if (!roomId || !playerId || !abilityType || !targetId || night === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check cooldowns or restrictions based on abilityType
  // For now, we'll assume basic validation

  const { data, error } = await supabase
    .from('abilities')
    .insert({
      room_id: roomId,
      player_id: playerId,
      ability_type: abilityType,
      target_id: targetId,
      night: night
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
