'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import PlayerList from '@/components/PlayerList';
import ChatTab from '@/components/ChatTab';
import GameBoard from '@/components/GameBoard';
import NarrationPanel from '@/components/NarrationPanel';
import VotingPanel from '@/components/VotingPanel';
import Timer from '@/components/Timer';
import { motion, AnimatePresence } from 'motion/react';

export default function GameRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [narrationText, setNarrationText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const { gameState, players, castVote } = useGameState(roomId);
  const { messages, sendMessage } = useChat(roomId, userId || '');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // For testing, we might just use a local storage ID if not auth'd
        const localId = localStorage.getItem('playerId');
        if (localId) {
          setUserId(localId);
        } else {
          router.push('/');
        }
      } else {
        setUserId(session.user.id);
      }
    };
    checkUser();
  }, [router]);

  // Handle phase changes and narration
  useEffect(() => {
    if (!gameState) return;

    setIsSpeaking(true);
    
    switch (gameState.phase) {
      case 'Night':
        setNarrationText('Night has fallen. Somewhere in the darkness, a killer chooses their target.');
        audioEngine.startNightAmbient();
        audioEngine.stopAmbient(); // Stop discussion music
        break;
      case 'Morning':
        setNarrationText('Morning arrives. But someone will never wake up again.');
        audioEngine.stopAmbient();
        audioEngine.playRoleReveal();
        break;
      case 'Discussion':
        setNarrationText('Discuss among yourselves. Who do you suspect?');
        audioEngine.startDiscussionMusic();
        break;
      case 'Voting':
        setNarrationText('It is time to vote. Choose wisely.');
        audioEngine.stopAmbient();
        break;
      case 'Execution':
        setNarrationText('The votes are counted. The execution will now proceed.');
        audioEngine.playDeathSound();
        break;
      case 'GameEnd':
        setNarrationText('The game has ended.');
        audioEngine.stopAmbient();
        // Check win condition
        break;
    }

    const timer = setTimeout(() => {
      setIsSpeaking(false);
    }, 5000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase]);

  if (!gameState || !userId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentPlayer = players.find(p => p.id === userId);
  const isAlive = currentPlayer?.alive ?? false;
  const canChat = isAlive && (gameState.phase === 'Discussion' || gameState.phase === 'Lobby');

  // Theme colors based on phase
  const getThemeClass = () => {
    switch (gameState.phase) {
      case 'Night': return 'bg-slate-950';
      case 'Voting': return 'bg-purple-950/50';
      case 'Execution': return 'bg-red-950/50';
      case 'GameEnd': return 'bg-amber-950/50';
      default: return 'bg-slate-900';
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${getThemeClass()} text-white overflow-hidden flex flex-col`}>
      {/* Cinematic background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay z-0"
        />
        {gameState.phase === 'Night' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-blue-900/10 mix-blend-overlay z-20"
          />
        )}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md">
        <h1 className="text-xl font-serif tracking-widest text-blue-400">NIGHT HAS COME</h1>
        <div className="flex items-center space-x-4">
          <Timer 
            duration={60} // This should come from gameState
            isActive={gameState.phase === 'Discussion' || gameState.phase === 'Voting'}
            onExpire={() => console.log('Timer expired')}
          />
          <div className="text-sm text-gray-400">Room: {gameState.room_code}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        
        {/* Left: Chat */}
        <div className="w-full md:w-1/4 h-64 md:h-auto flex-shrink-0">
          <ChatTab 
            messages={messages}
            currentUserId={userId}
            onSendMessage={sendMessage}
            disabled={!canChat}
          />
        </div>

        {/* Center: Game Area */}
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto">
          <NarrationPanel text={narrationText} isSpeaking={isSpeaking} />
          
          <div className="w-full max-w-2xl mt-8">
            <GameBoard 
              phase={gameState.phase}
              dayNumber={gameState.day_number}
              players={players}
              currentUserId={userId}
            />

            <AnimatePresence>
              {gameState.phase === 'Voting' && isAlive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8"
                >
                  <VotingPanel 
                    players={players}
                    currentUserId={userId}
                    onVote={(targetId) => castVote(targetId)}
                    hasVoted={false} // Should track if user has voted
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Players */}
        <div className="w-full md:w-1/4 h-64 md:h-auto flex-shrink-0">
          <PlayerList players={players} currentUserId={userId} />
        </div>

      </main>
    </div>
  );
}
