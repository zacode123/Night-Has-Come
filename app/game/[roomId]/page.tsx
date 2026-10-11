'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  SplitSquareVertical,
  Bot,
  Sliders,
  Play,
  RotateCcw,
  LogOut,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import { narrationEngine } from '@/lib/narrationEngine';
import GameBoard from '@/components/GameBoard';
import ChatTab from '@/components/ChatTab';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import BotHireModal from '@/components/BotHireModal';
import VotingPanel from '@/components/VotingPanel';
import Timer from '@/components/Timer';
import DrippingText from '@/components/DrippingText';

type ViewportMode = 'split' | 'gameOnly' | 'chatOnly';

export default function GameRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewportMode>('split');
  const [showBotModal, setShowBotModal] = useState(false);
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [ttsInput, setTtsInput] = useState('');
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const {
    gameState,
    players,
    loading,
    castVote,
    performRoleAction,
    advancePhase,
    hireBots,
    removeBot,
    broadcastPosition,
  } = useGameState(roomId);

  const {
    messages,
    sendMessage,
    sendVoiceMessage,
    editMessage,
    deleteMessage,
  } = useChat(roomId, userId || '');

  // Initialize Auth & Player ID
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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

  useEffect(() => {
    if (!loading && !gameState) {
      setRoomNotFound(true);
    }
  }, [loading, gameState]);

  // Handle ambient sound by game phase
  useEffect(() => {
    if (!gameState) return;

    switch (gameState.phase) {
      case 'Night':
        audioEngine.startNightAmbient();
        break;
      case 'Morning':
        audioEngine.stopAmbient();
        audioEngine.playRoleReveal();
        break;
      case 'Discussion':
        audioEngine.startDiscussionMusic();
        break;
      case 'Voting':
        audioEngine.stopAmbient();
        break;
      case 'Execution':
        audioEngine.playDeathSound();
        break;
      case 'GameEnd':
        audioEngine.stopAmbient();
        break;
    }
  }, [gameState?.phase]);

  // Load custom TTS endpoint from engine
  useEffect(() => {
    setTtsInput(narrationEngine.getCustomTtsEndpoint() || '');
  }, []);

  const handleSaveTtsEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    narrationEngine.setCustomTtsEndpoint(ttsInput.trim() || null);
    setShowTtsModal(false);
    audioEngine.playSelect();
  };

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === userId),
    [players, userId]
  );
  const isAlive = currentPlayer?.alive ?? true;
  const canChat = isAlive && (gameState?.phase === 'Discussion' || gameState?.phase === 'Lobby');

  // Next phase advance logic
  const handleNextPhase = () => {
    if (!gameState) return;
    audioEngine.playClick();
    const cycle: Record<string, any> = {
      Lobby: 'Night',
      Night: 'Morning',
      Morning: 'Discussion',
      Discussion: 'Voting',
      Voting: 'Execution',
      Execution: 'Night',
    };
    const next = cycle[gameState.phase] || 'Discussion';
    advancePhase(next);
  };

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4 font-mono">ROOM NOT FOUND</h1>
        <p className="text-zinc-400 mb-8 text-sm">The retreat game room has expired or been terminated.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-sm shadow-lg shadow-red-900/50"
        >
          RETURN TO MAIN MENU
        </button>
      </div>
    );
  }

  if (!gameState || !userId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-black/80 backdrop-blur-md border-b border-white/10 z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <DrippingText
            text="NIGHT HAS COME"
            className="text-lg sm:text-xl font-['var(--font-nosifer)'] text-red-600 tracking-wider drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"
          />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-600/40 text-red-400">
            DAY {gameState.day_number}
          </span>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Hire Bots Button */}
          <button
            onClick={() => setShowBotModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/15 hover:border-cyan-500 text-xs text-cyan-300 transition-colors shadow"
            title="Hire AI Bots"
          >
            <Bot size={14} />
            <span className="hidden sm:inline">Hire Bots</span>
            <span className="font-mono text-[10px]">
              ({players.filter((p) => p.is_bot).length})
            </span>
          </button>

          {/* TTS Endpoint Settings Button */}
          <button
            onClick={() => setShowTtsModal(true)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/15 hover:border-red-500 text-zinc-300 hover:text-white transition-colors"
            title="Configure TTS Endpoint"
          >
            <Sliders size={15} />
          </button>

          {/* Advance Phase Button (For host or progression) */}
          <button
            onClick={handleNextPhase}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/50 text-xs font-bold text-red-200 transition-colors shadow"
            title="Advance Phase"
          >
            <Play size={12} className="fill-current" />
            <span className="hidden sm:inline">Next Phase</span>
          </button>

          {/* Exit Button */}
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/15 hover:border-zinc-500 text-zinc-400 hover:text-white transition-colors"
            title="Exit Room"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Cinematic Top Announcement Banner with Pluggable Audio */}
      <AnnouncementBanner
        phase={gameState.phase}
        dayNumber={gameState.day_number}
        customAlert={customAlert}
        onClearCustomAlert={() => setCustomAlert(null)}
      />

      {/* Split-Screen Sizing Divider Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-950 border-y border-white/10 z-20 flex-shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">
            Role: <strong className="text-red-400">{currentPlayer?.role || 'Citizen'}</strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-[11px] font-mono text-zinc-400">
            Status: <strong className={isAlive ? 'text-emerald-400' : 'text-red-500'}>{isAlive ? 'Alive' : 'Eliminated'}</strong>
          </span>
        </div>

        {/* Viewport Sizing Mode Buttons */}
        <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('gameOnly')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
              viewMode === 'gameOnly'
                ? 'bg-red-700 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Full 3D Video Game Mode"
          >
            <Maximize2 size={11} />
            <span className="hidden sm:inline">Full 3D Game</span>
          </button>

          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
              viewMode === 'split'
                ? 'bg-red-700 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="50 / 50 Split Screen"
          >
            <SplitSquareVertical size={11} />
            <span>50/50</span>
          </button>

          <button
            onClick={() => setViewMode('chatOnly')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
              viewMode === 'chatOnly'
                ? 'bg-red-700 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Full Chat Mode"
          >
            <Minimize2 size={11} />
            <span className="hidden sm:inline">Full Chat</span>
          </button>
        </div>
      </div>

      {/* Main Split-Screen Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* TOP HALF: 3D Video Game Viewport */}
        <div
          style={{
            display: viewMode === 'chatOnly' ? 'none' : 'block',
            height: viewMode === 'gameOnly' ? '100%' : '50%',
          }}
          className="w-full relative transition-all duration-300 overflow-hidden"
        >
          <GameBoard
            roomId={roomId}
            phase={gameState.phase}
            dayNumber={gameState.day_number}
            players={players}
            currentUserId={userId}
            onUpdatePosition={broadcastPosition}
            onRoleAction={(action, targetId) => {
              performRoleAction(action, targetId);
              const targetPlayer = players.find((p) => p.id === targetId);
              setCustomAlert(
                `Action deployed: ${action.toUpperCase()} targeted at ${targetPlayer?.username || 'player'}`
              );
            }}
          />

          {/* Voting Modal Overlay during Voting Phase */}
          <AnimatePresence>
            {gameState.phase === 'Voting' && isAlive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto"
              >
                <div className="w-full max-w-md max-h-[85%] overflow-y-auto bg-zinc-950 border border-red-600/80 rounded-2xl p-4 shadow-2xl">
                  <h3 className="text-center font-bold text-red-500 mb-2 font-mono uppercase text-sm">
                    ⚠️ CAST YOUR VOTE BEFORE CURFEW ⚠️
                  </h3>
                  <VotingPanel
                    players={players}
                    currentUserId={userId}
                    onVote={(targetId) => {
                      castVote(targetId);
                      setCustomAlert('Your vote has been locked in.');
                    }}
                    hasVoted={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM HALF: WhatsApp-Style Live Chat & Voice Notes */}
        <div
          style={{
            display: viewMode === 'gameOnly' ? 'none' : 'block',
            height: viewMode === 'chatOnly' ? '100%' : '50%',
          }}
          className="w-full relative transition-all duration-300 overflow-hidden"
        >
          <ChatTab
            messages={messages}
            currentUserId={userId}
            onSendMessage={sendMessage}
            onSendVoiceMessage={sendVoiceMessage}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            disabled={!canChat}
          />
        </div>
      </main>

      {/* Bot Hiring Modal */}
      <BotHireModal
        isOpen={showBotModal}
        onClose={() => setShowBotModal(false)}
        onHireBots={hireBots}
        onRemoveBot={removeBot}
        currentBots={players.filter((p) => p.is_bot)}
        maxSlots={12}
      />

      {/* TTS Endpoint Configuration Modal */}
      {showTtsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-red-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-2">Custom TTS Narration Endpoint</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Paste your custom Text-To-Speech endpoint URL below. All in-game narration and announcements will stream through your endpoint. Leave empty to use default Web Speech.
            </p>

            <form onSubmit={handleSaveTtsEndpoint} className="space-y-4">
              <input
                type="url"
                value={ttsInput}
                onChange={(e) => setTtsInput(e.target.value)}
                placeholder="https://your-tts-api.com/synthesize"
                className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTtsModal(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold shadow-lg"
                >
                  Save Endpoint
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
