import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';
import { GameEngine } from '@/lib/gameEngine';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { roomId } = await request.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  try {
    const result = await GameEngine.startGame(roomId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
