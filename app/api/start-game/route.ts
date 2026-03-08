import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gameConfig, Role } from '@/config/gameConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // 1. Fetch all players in the room
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId);

    if (playersError || !players) {
      throw new Error('Failed to fetch players');
    }

    if (players.length < gameConfig.minPlayers) {
      return NextResponse.json({ error: 'Not enough players' }, { status: 400 });
    }

    // 2. Determine role distribution
    const numPlayers = players.length;
    let numMafia = Math.floor(numPlayers / 4);
    if (numMafia < 1) numMafia = 1;
    if (numMafia > gameConfig.maxMafia) numMafia = gameConfig.maxMafia;

    const roles: Role[] = [];
    
    // Add Mafia
    for (let i = 0; i < numMafia; i++) roles.push('Mafia');
    
    // Add special roles if enough players
    if (numPlayers >= 5) roles.push('Doctor');
    if (numPlayers >= 6) roles.push('Police');
    if (numPlayers >= 8) roles.push('Detective');
    if (numPlayers >= 10) roles.push('Hero');

    // Fill the rest with Citizens
    while (roles.length < numPlayers) {
      roles.push('Citizen');
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // 3. Assign roles to players
    const updatePromises = players.map((player, index) => {
      return supabase
        .from('players')
        .update({ role: roles[index], alive: true })
        .eq('id', player.id);
    });

    await Promise.all(updatePromises);

    // 4. Update room status and phase
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ 
        status: 'playing', 
        phase: 'night', 
        day_number: 1 
      })
      .eq('id', roomId);

    if (roomError) {
      throw new Error('Failed to update room status');
    }

    // 5. Create initial episode entry
    await supabase
      .from('episodes')
      .insert([{
        room_id: roomId,
        day_number: 1,
        phase: 'intro',
        content: 'The game begins. Night has fallen. Trust no one.'
      }]);

    return NextResponse.json({ success: true, message: 'Game started' });
  } catch (error: any) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: error.message || 'Failed to start game' }, { status: 500 });
  }
}
