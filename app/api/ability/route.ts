import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { roomId, playerId, abilityType, targetId, night } = await request.json();

  if (!roomId || !playerId || !abilityType || !targetId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const currentNight = night ?? 1;

  const { data, error } = await supabase
    .from('abilities')
    .insert({
      room_id: roomId,
      player_id: playerId,
      ability_type: abilityType,
      target_id: targetId,
      night: currentNight
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If police/detective is investigating, return private intel on target
  let targetInfo: any = null;
  if (abilityType === 'investigate') {
    const { data: targetPlayer } = await supabase
      .from('players')
      .select('username, role')
      .eq('id', targetId)
      .maybeSingle();
    targetInfo = targetPlayer;
  }

  return NextResponse.json({ ...data, targetInfo });
}
