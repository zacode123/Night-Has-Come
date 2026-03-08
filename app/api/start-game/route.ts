import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { roomId } = await req.json();

    // 1. Get players
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId);

    if (!players || players.length < 3) {
      return NextResponse.json({ error: 'Not enough players' }, { status: 400 });
    }

    // 2. Assign roles (simple logic: 1 mafia, rest citizens)
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const mafiaId = shuffled[0].id;
    
    for (const player of shuffled) {
      const role = player.id === mafiaId ? 'Mafia' : 'Citizen';
      await supabase
        .from('players')
        .update({ role, alive: true })
        .eq('id', player.id);
    }

    // 3. Update room status
    await supabase
      .from('rooms')
      .update({ 
        status: 'playing', 
        phase: 'Night', 
        day_number: 1 
      })
      .eq('id', roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
