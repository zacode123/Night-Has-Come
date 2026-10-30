import { supabase } from './supabaseClient';
import { gameConfig } from '@/config/gameConfig';

export type GamePhase = 
  | 'Warmup'
  | 'Lobby'
  | 'RoleAssignment'
  | 'Night'
  | 'Morning'
  | 'Discussion'
  | 'Voting'
  | 'Execution'
  | 'GameEnd';

export type PlayerRole = 
  | 'Citizen'
  | 'Mafia'
  | 'Doctor'
  | 'Police'
  | 'Detective'
  | 'Hero';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  dayNumber: number;
  players: any[];
  votes: any[];
  kills: any[];
}

export const GameEngine = {
  async startGame(roomId: string) {
    // 1. Fetch approved players
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'approved');

    if (error || !players || players.length < gameConfig.minPlayers) {
      throw new Error(`Need at least ${gameConfig.minPlayers} players (1 Mafia and 2 Citizens) to start`);
    }

    // 2. Assign Roles
    const assignedPlayers = this.assignRoles(players);

    // 3. Update Players in DB
    for (const player of assignedPlayers) {
      await supabase
        .from('players')
        .update({ role: player.role, alive: true })
        .eq('id', player.id);
    }

    // 4. Update Room Status with 60-second Warmup phase
    await supabase
      .from('rooms')
      .update({ 
        status: 'in_game',
        phase: 'Warmup',
        day_number: 1 
      })
      .eq('id', roomId);

    return { success: true };
  },

  assignRoles(players: any[]) {
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const totalPlayers = players.length;

    if (totalPlayers < 3) {
      throw new Error('At least 3 players (1 Mafia and 2 Citizens) are required to start');
    }

    // Step 1: ALWAYS guarantee at least 1 Mafia and 2 non-Mafia (Citizens/Doctor/Police)
    shuffled[0].role = 'Mafia';

    if (totalPlayers === 3) {
      shuffled[1].role = 'Citizen';
      shuffled[2].role = 'Citizen';
      return shuffled;
    }

    if (totalPlayers === 4) {
      shuffled[1].role = 'Doctor';
      shuffled[2].role = 'Police';
      shuffled[3].role = 'Citizen';
      return shuffled;
    }

    // For 5+ players:
    // Assign 1 Doctor & 1 Police/Detective
    shuffled[1].role = 'Doctor';
    shuffled[2].role = 'Police';

    const targetMafiaCount = Math.max(1, Math.min(Math.floor(totalPlayers / 3), gameConfig.maxMafia));
    let mafiaAssigned = 1;

    for (let i = 3; i < totalPlayers; i++) {
      if (mafiaAssigned < targetMafiaCount && (i === 3 || i === 6)) {
        shuffled[i].role = 'Mafia';
        mafiaAssigned++;
      } else if (i === 4 && totalPlayers >= 6) {
        shuffled[i].role = 'Detective';
      } else {
        shuffled[i].role = 'Citizen';
      }
    }

    return shuffled;
  },



  async hireBots(roomId: string, bots: Array<{ username: string; personality: string }>) {
    const records = bots.map((bot) => ({
      username: bot.username,
      room_id: roomId,
      personality: bot.personality,
      is_bot: true,
      status: 'approved',
      alive: true,
      connected: true,
      age: 18,
    }));

    const { data, error } = await supabase
      .from('players')
      .insert(records)
      .select();

    if (error) {
      throw error;
    }
    return data;
  },

  async removeBot(botId: string) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', botId);

    if (error) throw error;
    return { success: true };
  },

  async transitionPhase(roomId: string, nextPhase: GamePhase) {
    const { data: room } = await supabase
      .from('rooms')
      .select('day_number, phase')
      .eq('id', roomId)
      .maybeSingle();

    const currentDay = room?.day_number || 1;
    const nextDay = nextPhase === 'Night' && room?.phase === 'Execution' ? currentDay + 1 : currentDay;

    await supabase
      .from('rooms')
      .update({
        phase: nextPhase,
        day_number: nextDay,
      })
      .eq('id', roomId);
  },

  /**
   * Resolve night attacks and heals:
   * Compares Mafia attack target against Doctor heal target.
   */
  async resolveNightAbilities(roomId: string, nightNumber: number) {
    try {
      const { data: abilities } = await supabase
        .from('abilities')
        .select('*')
        .eq('room_id', roomId)
        .eq('night', nightNumber);

      const attacks = abilities?.filter((a) => a.ability_type === 'attack') || [];
      const heals = abilities?.filter((a) => a.ability_type === 'heal') || [];

      if (attacks.length === 0) {
        return { casualty: null, wasSaved: false, message: 'It was a peaceful night. No casualties were reported.' };
      }

      // Plurality target for attack
      const targetCounts: Record<string, number> = {};
      attacks.forEach((a) => {
        if (a.target_id) {
          targetCounts[a.target_id] = (targetCounts[a.target_id] || 0) + 1;
        }
      });

      let victimId: string | null = null;
      let maxAttack = 0;
      Object.entries(targetCounts).forEach(([id, count]) => {
        if (count > maxAttack) {
          maxAttack = count;
          victimId = id;
        }
      });

      if (!victimId) {
        return { casualty: null, wasSaved: false, message: 'No casualties were reported last night.' };
      }

      // Check if victim was protected by Doctor
      const wasSaved = heals.some((h) => h.target_id === victimId);

      if (wasSaved) {
        return { casualty: null, wasSaved: true, message: 'A student was targeted last night, but the Doctor heroically protected them!' };
      }

      // Eliminate victim in DB
      await supabase
        .from('players')
        .update({ alive: false })
        .eq('id', victimId);

      const { data: victimPlayer } = await supabase
        .from('players')
        .select('username, role')
        .eq('id', victimId)
        .maybeSingle();

      const victimName = victimPlayer?.username || 'A student';

      return {
        casualty: { id: victimId, username: victimName, role: victimPlayer?.role },
        wasSaved: false,
        message: `Tragedy struck last night. ${victimName} was eliminated in the darkness!`,
      };
    } catch (err) {
      console.warn('Error resolving night abilities:', err);
      return { casualty: null, wasSaved: false, message: 'Morning has broken with no confirmed casualties.' };
    }
  },

  /**
   * Tally votes cast during voting phase and eliminate the highest-voted player.
   */
  async resolveDayVotes(roomId: string, dayNumber: number) {
    try {
      const { data: votes } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', roomId)
        .eq('day', dayNumber);

      if (!votes || votes.length === 0) {
        return { executed: null, message: 'No votes were cast before curfew. No one was executed today.' };
      }

      const voteCounts: Record<string, number> = {};
      votes.forEach((v) => {
        if (v.target_id) {
          voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
        }
      });

      let highestTargetId: string | null = null;
      let maxVotes = 0;
      let isTie = false;

      Object.entries(voteCounts).forEach(([id, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          highestTargetId = id;
          isTie = false;
        } else if (count === maxVotes) {
          isTie = true;
        }
      });

      if (isTie || !highestTargetId || maxVotes === 0) {
        return { executed: null, message: 'The votes resulted in a tie! Curfew spared all suspects today.' };
      }

      // Eliminate executed player in DB
      await supabase
        .from('players')
        .update({ alive: false })
        .eq('id', highestTargetId);

      const { data: targetPlayer } = await supabase
        .from('players')
        .select('username, role')
        .eq('id', highestTargetId)
        .maybeSingle();

      const executedName = targetPlayer?.username || 'Suspect';

      return {
        executed: { id: highestTargetId, username: executedName, role: targetPlayer?.role, votes: maxVotes },
        message: `The majority has spoken! ${executedName} received ${maxVotes} votes and was executed!`,
      };
    } catch (err) {
      console.warn('Error resolving day votes:', err);
      return { executed: null, message: 'Curfew ended without an execution.' };
    }
  },

  /**
   * Check win condition and return winner team with list of winners and losers.
   * Strictly verifies room status, phase, player count, and assigned roles first.
   */
  async checkWinCondition(roomId: string): Promise<{
    winner: 'Citizens' | 'Mafia';
    winningPlayers: any[];
    losingPlayers: any[];
  } | null> {
    const { data: room } = await supabase
      .from('rooms')
      .select('status, phase')
      .eq('id', roomId)
      .maybeSingle();

    // Guard: Win condition can ONLY trigger during active gameplay, after Warmup phase
    if (!room || room.status !== 'in_game' || room.phase === 'Warmup' || room.phase === 'Lobby') {
      return null;
    }

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'approved');

    if (!players || players.length < 3) return null;

    // Guard: Ensure roles have been assigned to players in the database
    const hasRolesAssigned = players.some((p) => Boolean(p.role));
    const hasMafiaAssigned = players.some((p) => p.role === 'Mafia');
    if (!hasRolesAssigned || !hasMafiaAssigned) {
      return null;
    }

    const alivePlayers = players.filter((p) => p.alive);
    const aliveMafia = alivePlayers.filter((p) => p.role === 'Mafia');
    const aliveCitizens = alivePlayers.filter((p) => p.role !== 'Mafia');

    // 1. All Mafia dead -> Citizens win!
    if (aliveMafia.length === 0) {
      const winningPlayers = players.filter((p) => p.role !== 'Mafia');
      const losingPlayers = players.filter((p) => p.role === 'Mafia');
      return {
        winner: 'Citizens',
        winningPlayers,
        losingPlayers,
      };
    }

    // 2. Mafia outnumber or equal living Citizens -> Mafia wins!
    if (aliveMafia.length >= aliveCitizens.length) {
      const winningPlayers = players.filter((p) => p.role === 'Mafia');
      const losingPlayers = players.filter((p) => p.role !== 'Mafia');
      return {
        winner: 'Mafia',
        winningPlayers,
        losingPlayers,
      };
    }

    return null;
  },
};
