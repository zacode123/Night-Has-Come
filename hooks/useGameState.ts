'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GamePhase, GameEngine } from '@/lib/gameEngine';

export interface Player {
  id: string;
  username: string;
  room_id: string;
  role: string | null;
  alive: boolean;
  connected: boolean;
  personality: string;
  avatar_base64?: string | null;
  is_bot?: boolean;
  x?: number;
  z?: number;
  rotation?: number;
  gesture?: 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate';
}

export interface GameState {
  id: string;
  name?: string;
  room_code: string;
  host_id?: string;
  status: string;
  phase: string;
  day_number: number;
}

export function useGameState(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial room & player state
  const fetchState = useCallback(async () => {
    if (!roomId) return;
    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (room) setGameState(room);

      const { data: p } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);

      if (p) setPlayers(p as Player[]);
    } catch (err) {
      console.warn('Error fetching game state:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchState();

    // Subscribe to Room & Player changes
    const channel = supabase
      .channel(`game:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setGameState(payload.new as GameState);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => {
          supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
            .then(({ data }) => {
              if (data) setPlayers(data as Player[]);
            });
        }
      )
      .on('broadcast', { event: 'player_position' }, ({ payload }) => {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === payload.id
              ? {
                  ...p,
                  x: payload.x,
                  z: payload.z,
                  rotation: payload.rotation,
                  gesture: payload.gesture,
                }
              : p
          )
        );
      })
      .on('broadcast', { event: 'phase_change' }, ({ payload }) => {
        setGameState((prev) => (prev ? { ...prev, phase: payload.phase, day_number: payload.day_number } : null));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, fetchState]);

  // Cast vote
  const castVote = async (targetId: string) => {
    const localId = localStorage.getItem('playerId');
    if (!localId || !gameState) return;

    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          voterId: localId,
          targetId,
          day: gameState.day_number,
        }),
      });
    } catch (e) {
      console.warn('Vote fetch error:', e);
    }
  };

  // Perform Role Action (Mafia Kill, Doctor Heal, Police Scan)
  const performRoleAction = async (action: 'attack' | 'heal' | 'investigate', targetId: string) => {
    const localId = localStorage.getItem('playerId');
    if (!localId) return;

    try {
      await fetch('/api/ability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerId: localId,
          targetId,
          abilityType: action,
        }),
      });
    } catch (e) {
      console.warn('Role action non-fatal error:', e);
    }
  };

  // Advance to next game phase
  const advancePhase = async (nextPhase: GamePhase) => {
    if (!gameState) return;
    try {
      await GameEngine.transitionPhase(roomId, nextPhase);
      const nextDay = nextPhase === 'Night' && gameState.phase === 'Execution' ? gameState.day_number + 1 : gameState.day_number;

      setGameState((prev) => (prev ? { ...prev, phase: nextPhase, day_number: nextDay } : null));

      const channel = supabase.channel(`game:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'phase_change',
        payload: { phase: nextPhase, day_number: nextDay },
      });
    } catch (err) {
      console.error('Phase advance error:', err);
    }
  };

  // Hire Bots
  const hireBots = async (bots: Array<{ username: string; personality: string }>) => {
    try {
      await GameEngine.hireBots(roomId, bots);
      await fetchState();
    } catch (err) {
      console.error('Failed to hire bots:', err);
    }
  };

  // Remove Bot
  const removeBot = async (botId: string) => {
    try {
      await GameEngine.removeBot(botId);
      await fetchState();
    } catch (err) {
      console.error('Failed to remove bot:', err);
    }
  };

  // Broadcast current player position
  const broadcastPosition = (pos: { x: number; z: number; rotation: number; gesture: string }) => {
    const localId = localStorage.getItem('playerId');
    if (!localId) return;

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_position',
        payload: { id: localId, ...pos },
      });
    } else {
      const channel = supabase.channel(`game:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'player_position',
        payload: { id: localId, ...pos },
      });
    }
  };

  return {
    gameState,
    players,
    loading,
    castVote,
    performRoleAction,
    advancePhase,
    hireBots,
    removeBot,
    broadcastPosition,
    refreshState: fetchState,
  };
}
