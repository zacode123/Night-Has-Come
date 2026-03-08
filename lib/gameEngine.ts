import { supabase } from './supabaseClient';

export class GameEngine {
  static async startPhase(roomId: string, phase: string, dayNumber: number) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ phase, day_number: dayNumber })
      .eq('id', roomId);
    return { data, error };
  }

  static async processNightActions(roomId: string, night: number) {
    // 1. Get all kills
    const { data: kills } = await supabase.from('kills').select('*').eq('room_id', roomId).eq('night', night);
    // 2. Get all abilities (doctor saves, police investigates)
    const { data: abilities } = await supabase.from('abilities').select('*').eq('room_id', roomId).eq('night', night);

    const doctorSaves = abilities?.filter(a => a.ability_type === 'save').map(a => a.target_id) || [];
    const mafiaKills = kills?.map(k => k.target_id) || [];

    const deadPlayers = mafiaKills.filter(id => !doctorSaves.includes(id));

    if (deadPlayers.length > 0) {
      await supabase.from('players').update({ alive: false }).in('id', deadPlayers);
    }

    return deadPlayers;
  }

  static async processVoting(roomId: string, day: number) {
    const { data: votes } = await supabase.from('votes').select('*').eq('room_id', roomId).eq('day', day);
    if (!votes || votes.length === 0) return null;

    const voteCounts: Record<string, number> = {};
    votes.forEach(v => {
      voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
    });

    let maxVotes = 0;
    let eliminatedId: string | null = null;
    let tie = false;

    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }

    if (tie) {
      const tiedIds = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
      eliminatedId = tiedIds[Math.floor(Math.random() * tiedIds.length)];
    }

    if (eliminatedId) {
      await supabase.from('players').update({ alive: false }).eq('id', eliminatedId);
    }

    return eliminatedId;
  }

  static async checkWinCondition(roomId: string) {
    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).eq('alive', true);
    if (!players) return null;

    const mafia = players.filter(p => p.role === 'Mafia');
    const citizens = players.filter(p => p.role !== 'Mafia');

    if (mafia.length === 0) return 'Citizens';
    if (mafia.length >= citizens.length) return 'Mafia';

    return null;
  }
}
