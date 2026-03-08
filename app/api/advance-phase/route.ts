import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gameConfig } from '@/config/gameConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { roomId, currentPhase, dayNumber } = await request.json();

    if (!roomId || !currentPhase) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Fetch room
    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (!room) throw new Error('Room not found');

    // Fetch players
    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
    if (!players) throw new Error('Players not found');

    let nextPhase = '';
    let nextDay = dayNumber;
    let narration = '';

    // Phase Logic
    if (currentPhase === 'night') {
      // Resolve night actions
      const { data: kills } = await supabase.from('kills').select('*').eq('room_id', roomId).eq('night', dayNumber);
      const { data: abilities } = await supabase.from('abilities').select('*').eq('room_id', roomId).eq('night', dayNumber);

      let victimId = null;
      let savedId = null;

      // Determine victim (most voted by mafia, or just the first one for simplicity)
      if (kills && kills.length > 0) {
        // Simple logic: first mafia kill target
        victimId = kills[0].target_id;
      }

      // Determine if saved
      if (abilities && abilities.length > 0) {
        const docSave = abilities.find(a => a.ability_type === 'Doctor');
        if (docSave && docSave.target_id === victimId) {
          savedId = victimId;
          victimId = null; // Saved!
        }
      }

      if (victimId) {
        // Kill player
        await supabase.from('players').update({ alive: false }).eq('id', victimId);
        const victim = players.find(p => p.id === victimId);
        narration = `Morning arrives. The town wakes up to find ${victim?.username} dead. They were a ${victim?.role}.`;
      } else {
        narration = `Morning arrives. Miraculously, no one died last night.`;
      }

      nextPhase = 'morning';

    } else if (currentPhase === 'morning') {
      nextPhase = 'discussion';
      narration = `The town has ${gameConfig.discussionDuration} seconds to discuss the events and find the killer.`;

    } else if (currentPhase === 'discussion') {
      nextPhase = 'voting';
      narration = `Time is up. It's time to vote. Who do you suspect?`;

    } else if (currentPhase === 'voting') {
      // Resolve votes
      const { data: votes } = await supabase.from('votes').select('*').eq('room_id', roomId).eq('day', dayNumber);
      
      if (votes && votes.length > 0) {
        // Count votes
        const voteCounts: Record<string, number> = {};
        votes.forEach(v => {
          voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
        });

        // Find max
        let maxVotes = 0;
        let executedId = null;
        let tie = false;

        for (const [targetId, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) {
            maxVotes = count;
            executedId = targetId;
            tie = false;
          } else if (count === maxVotes) {
            tie = true;
          }
        }

        if (tie || !executedId) {
          narration = `The town could not reach a consensus. No one is executed today.`;
        } else {
          // Execute player
          await supabase.from('players').update({ alive: false }).eq('id', executedId);
          const executed = players.find(p => p.id === executedId);
          narration = `The votes are counted. ${executed?.username} has been executed. They were a ${executed?.role}.`;
        }
      } else {
        narration = `No votes were cast. The town sleeps in fear.`;
      }

      nextPhase = 'execution';

    } else if (currentPhase === 'execution') {
      // Check win conditions
      const { data: updatedPlayers } = await supabase.from('players').select('*').eq('room_id', roomId);
      const alivePlayers = updatedPlayers?.filter(p => p.alive) || [];
      const aliveMafia = alivePlayers.filter(p => p.role === 'Mafia').length;
      const aliveCitizens = alivePlayers.length - aliveMafia;

      if (aliveMafia === 0) {
        nextPhase = 'game_end';
        narration = `All Mafia have been eliminated. The Citizens win!`;
      } else if (aliveMafia >= aliveCitizens) {
        nextPhase = 'game_end';
        narration = `The Mafia have taken over the town. The Mafia wins!`;
      } else {
        nextPhase = 'night';
        nextDay = dayNumber + 1;
        narration = `Night falls again. Go to sleep.`;
      }
    }

    // Update room
    await supabase.from('rooms').update({ phase: nextPhase, day_number: nextDay }).eq('id', roomId);

    // Insert episode
    await supabase.from('episodes').insert([{
      room_id: roomId,
      day_number: nextDay,
      phase: nextPhase,
      content: narration
    }]);

    return NextResponse.json({ success: true, nextPhase, narration });
  } catch (error: any) {
    console.error('Error advancing phase:', error);
    return NextResponse.json({ error: error.message || 'Failed to advance phase' }, { status: 500 });
  }
}
