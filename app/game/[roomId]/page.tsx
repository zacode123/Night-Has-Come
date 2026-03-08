'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { NarratorSphere } from '@/components/NarratorSphere';
import { ChatTab } from '@/components/ChatTab';
import { PlayerList } from '@/components/PlayerList';
import { VotingPanel } from '@/components/VotingPanel';
import { GameBoard } from '@/components/GameBoard';
import { Timer } from '@/components/Timer';
import { gameConfig } from '@/config/gameConfig';
import { themeConfig, ThemeState } from '@/config/themeConfig';

interface Player {
  id: string;
  username: string;
  role: string | null;
  alive: boolean;
  connected: boolean;
}

interface Room {
  id: string;
  host_id: string;
  status: string;
  phase: string;
  day_number: number;
}

export default function GameScreen() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [narratorText, setNarratorText] = useState('Loading...');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const speak = (text: string) => {
    if (!synthRef.current || !gameConfig.voiceEnabled) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good dramatic voice (e.g., Google UK English Male or similar)
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.lang === 'en-GB');
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.pitch = 0.8; // Slightly lower pitch for drama
    utterance.rate = 0.9;  // Slightly slower

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    const initGame = async () => {
      const playerId = localStorage.getItem('playerId');
      if (!playerId) {
        router.push('/');
        return;
      }

      // Fetch player
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (!playerData || playerData.room_id !== roomId) {
        router.push('/');
        return;
      }
      setPlayer(playerData);

      // Fetch room
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomData) setRoom(roomData);

      // Fetch players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);
      
      if (playersData) setPlayers(playersData);

      // Subscribe to room changes
      const roomChannel = supabase
        .channel(`game_room_${roomId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            setRoom(payload.new as Room);
          }
        )
        .subscribe();

      // Subscribe to players changes
      const playersChannel = supabase
        .channel(`game_players_${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
          async () => {
            const { data } = await supabase
              .from('players')
              .select('*')
              .eq('room_id', roomId);
            if (data) setPlayers(data);
          }
        )
        .subscribe();

      // Subscribe to episodes (narration)
      const episodesChannel = supabase
        .channel(`game_episodes_${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'episodes', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const content = payload.new.content;
            setNarratorText(content);
            speak(content);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(roomChannel);
        supabase.removeChannel(playersChannel);
        supabase.removeChannel(episodesChannel);
      };
    };

    initGame();
  }, [roomId, router]);

  // Handle phase changes (Theme and Audio)
  const phase = room?.phase;
  useEffect(() => {
    if (!phase) return;

    let bgSound = '/sounds/suspense_ambience.mp3';

    switch (phase) {
      case 'night':
        bgSound = '/sounds/night_horror_drone.mp3';
        break;
      case 'morning':
        bgSound = '/sounds/suspense_ambience.mp3';
        break;
      case 'discussion':
        bgSound = '/sounds/discussion_music.mp3';
        break;
      case 'voting':
        bgSound = '/sounds/suspense_ambience.mp3';
        break;
      case 'execution':
        bgSound = '/sounds/death_sound.mp3';
        break;
      case 'game_end':
        // Check win condition (we'll assume a field in room or just set to normal for now)
        bgSound = '/sounds/victory.mp3';
        break;
    }

    // Play background audio
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
    }
    bgAudioRef.current = new Audio(bgSound);
    bgAudioRef.current.loop = phase !== 'execution' && phase !== 'game_end';
    bgAudioRef.current.volume = 0.3;
    bgAudioRef.current.play().catch(() => {});

    return () => {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
      }
    };
  }, [phase]);

  const handlePhaseEnd = async () => {
    if (!room || !player) return;
    
    // Only the host advances the phase to prevent race conditions
    if (room.host_id === player.id) {
      try {
        await fetch('/api/advance-phase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            currentPhase: room.phase,
            dayNumber: room.day_number,
          }),
        });
      } catch (error) {
        console.error('Failed to advance phase:', error);
      }
    }
  };

  if (!player || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  let theme: ThemeState = 'normal';
  switch (room.phase) {
    case 'night':
    case 'morning':
    case 'discussion':
      theme = 'normal';
      break;
    case 'voting':
      theme = 'voting';
      break;
    case 'execution':
      theme = 'danger';
      break;
    case 'game_end':
      theme = 'win'; // Or loss
      break;
  }

  const currentTheme = themeConfig[theme];
  const isHost = room.host_id === player.id;

  return (
    <main className={`min-h-screen flex flex-col overflow-hidden font-sans transition-colors duration-1000 ${currentTheme.background}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-20 h-20 border-b border-slate-800/50 bg-black/40 backdrop-blur-md flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className={`text-2xl font-bold tracking-widest uppercase ${currentTheme.color} drop-shadow-[0_0_10px_currentColor]`}>
            Night Has Come
          </h1>
          <span className="text-sm text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
            Day {room.day_number} • {room.phase.toUpperCase()}
          </span>
        </div>
        
        {/* Timer */}
        {room.phase !== 'game_end' && room.phase !== 'lobby' && (
          <Timer 
            key={room.phase}
            duration={
              room.phase === 'night' ? gameConfig.nightDuration : 
              room.phase === 'discussion' ? gameConfig.discussionDuration : 
              room.phase === 'voting' ? gameConfig.voteDuration : 
              room.phase === 'morning' ? gameConfig.dayDuration : 
              gameConfig.executionDuration
            } 
            phase={room.phase}
            onComplete={isHost ? handlePhaseEnd : undefined}
          />
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Panel: Chat */}
        <div className="w-80 hidden md:block flex-shrink-0">
          <ChatTab 
            roomId={roomId} 
            playerId={player.id} 
            playerName={player.username} 
            isAlive={player.alive} 
            phase={room.phase} 
          />
        </div>

        {/* Center Panel: Game Board & Narrator */}
        <div className="flex-1 flex flex-col relative">
          
          {/* Narrator Sphere */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
            <NarratorSphere isSpeaking={isSpeaking} themeGlow={currentTheme.glow} />
          </div>

          {/* Game Board */}
          <div className="flex-1 pt-40 pb-8 px-8 overflow-y-auto scrollbar-none">
            <GameBoard 
              roomId={roomId}
              playerId={player.id}
              myRole={player.role}
              phase={room.phase}
              dayNumber={room.day_number}
              players={players}
              narratorText={narratorText}
            />

            {/* Voting Panel Overlay */}
            <AnimatePresence>
              {room.phase === 'voting' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                >
                  <VotingPanel 
                    roomId={roomId}
                    playerId={player.id}
                    players={players}
                    dayNumber={room.day_number}
                    phase={room.phase}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Player List */}
        <div className="w-72 hidden lg:block flex-shrink-0">
          <PlayerList 
            players={players} 
            currentPlayerId={player.id} 
            phase={room.phase} 
            myRole={player.role} 
          />
        </div>
      </div>
    </main>
  );
}
