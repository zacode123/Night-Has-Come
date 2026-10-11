import { supabase } from './supabaseClient';
import { gameConfig } from '@/config/gameConfig';

export type GamePhase = 
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
    // 1. Fetch players
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId);

    if (error || !players || players.length < gameConfig.minPlayers) {
      throw new Error(`Need at least ${gameConfig.minPlayers} players (or AI bots) to start`);
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

    // 4. Update Room Status
    await supabase
      .from('rooms')
      .update({ 
        status: 'in_game',
        phase: 'Night',
        day_number: 1 
      })
      .eq('id', roomId);

    return { success: true };
  },

  assignRoles(players: any[]) {
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const totalPlayers = players.length;
    
    // Determine number of Mafia (at least 1, max based on config)
    const mafiaCount = Math.max(1, Math.min(
      Math.floor(totalPlayers / 3), 
      gameConfig.maxMafia
    ));

    // Assign Mafia
    for (let i = 0; i < mafiaCount; i++) {
      shuffled[i].role = 'Mafia';
    }

    // Assign Special Roles
    const specialRoles: PlayerRole[] = ['Doctor', 'Police', 'Detective', 'Hero'];
    let currentIndex = mafiaCount;

    for (const role of specialRoles) {
      if (currentIndex < totalPlayers) {
        shuffled[currentIndex].role = role;
        currentIndex++;
      }
    }

    // Assign Citizens
    for (let i = currentIndex; i < totalPlayers; i++) {
      shuffled[i].role = 'Citizen';
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

  async processNightPhase(roomId: string) {
    // Transition to Morning
    await this.transitionPhase(roomId, 'Morning');
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

  async checkWinCondition(roomId: string) {
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .eq('alive', true);

    if (!players || players.length === 0) return null;

    const mafiaCount = players.filter((p) => p.role === 'Mafia').length;
    const citizenCount = players.length - mafiaCount;

    if (mafiaCount === 0) {
      return 'Citizens';
    }

    if (mafiaCount >= citizenCount) {
      return 'Mafia';
    }

    return null;
  }
};
