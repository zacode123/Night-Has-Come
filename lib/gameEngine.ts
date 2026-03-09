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
  players: any[]; // Replace with proper Player type
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
      throw new Error('Not enough players to start game');
    }

    // 2. Assign Roles
    const assignedPlayers = this.assignRoles(players);

    // 3. Update Players in DB
    for (const player of assignedPlayers) {
      await supabase
        .from('players')
        .update({ role: player.role })
        .eq('id', player.id);
    }

    // 4. Update Room Status
    await supabase
      .from('rooms')
      .update({ 
        status: 'playing',
        phase: 'Night',
        day_number: 1 
      })
      .eq('id', roomId);

    return { success: true };
  },

  assignRoles(players: any[]) {
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const totalPlayers = players.length;
    
    // Determine number of Mafia
    const mafiaCount = Math.min(
      Math.floor(totalPlayers / 3), 
      gameConfig.maxMafia
    );

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

  async processNightPhase(roomId: string) {
    // 1. Fetch actions (kills, saves, investigations)
    // This would be called by a cron job or a timer trigger
    // For now, we'll assume it's triggered manually or by the last action
    
    // Logic to resolve night actions
    // ...
    
    // Transition to Morning
    await this.transitionPhase(roomId, 'Morning');
  },

  async transitionPhase(roomId: string, nextPhase: GamePhase) {
    await supabase
      .from('rooms')
      .update({ phase: nextPhase })
      .eq('id', roomId);
  },

  async checkWinCondition(roomId: string) {
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .eq('alive', true);

    if (!players) return null;

    const mafiaCount = players.filter(p => p.role === 'Mafia').length;
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
