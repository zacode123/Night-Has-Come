'use client';

import { useEffect, useState, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  SplitSquareVertical,
  LogOut,
  Clock,
  Shield,
} from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import { narrationEngine } from '@/lib/narrationEngine';
import { GameEngine } from '@/lib/gameEngine';
import { checkAdminStatus } from '@/app/admin/actions';
import GameBoard from '@/components/GameBoard';
import ChatTab from '@/components/ChatTab';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import VotingPanel from '@/components/VotingPanel';
import Timer from '@/components/Timer';
import DrippingText from '@/components/DrippingText';
import { useRealtime } from '@/components/RealtimeProvider';
import { useLiveCall } from '@/hooks/useLiveCall';
import FloatingCallOverlay from '@/components/FloatingCallOverlay';
import LiveCallModal from '@/components/LiveCallModal';
import RulesBanner from '@/components/RulesBanner';
import GameOverModal from '@/components/GameOverModal';

type ViewportMode = 'split' | 'gameOnly' | 'chatOnly';

export default function GameRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();
  const { setRoom } = useRealtime();

  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewportMode>('split');
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isRulesIntroActive, setIsRulesIntroActive] = useState(false);
  const [activeRuleStep, setActiveRuleStep] = useState<number>(-1);
  const [hasVotedThisRound, setHasVotedThisRound] = useState(false);
  const [rulesAutoCloseSeconds, setRulesAutoCloseSeconds] = useState<number | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [winnerData, setWinnerData] = useState<{
    winner: 'Citizens' | 'Mafia';
    winningPlayers: any[];
    losingPlayers: any[];
  } | null>(null);

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
    typingUsers,
    recordingUsers,
    broadcastTyping,
    broadcastRecording,
    sendMessage,
    sendVoiceMessage,
    sendMediaMessage,
    editMessage,
    deleteMessages,
    purgeDateMessages,
  } = useChat(roomId, userId || '');

  const {
    callId,
    callStatus,
    incomingCall,
    participants: callParticipants,
    isMicMuted,
    isSpeakerMuted,
    isCurfewMuted,
    startCall,
    acceptCall,
    declineCall,
    leaveCall,
    toggleMic,
    toggleSpeaker,
  } = useLiveCall(roomId, userId || '', gameState?.phase);

  const [isAdmin, setIsAdmin] = useState(false);

  // Secure Authentication & Admin Verification via signed httpOnly cookie
  useEffect(() => {
    const checkUser = async () => {
      // 1. Strictly verify admin privileges via signed server-side session cookie (No client spoofing!)
      let userIsAdmin = false;
      try {
        userIsAdmin = await checkAdminStatus();
        setIsAdmin(Boolean(userIsAdmin));
      } catch (_) {
        setIsAdmin(false);
      }

      // 2. Fetch authenticated Supabase session or locally assigned player ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const localId = localStorage.getItem('playerId');
        if (localId) {
          setUserId(localId);
        } else if (userIsAdmin) {
          setUserId('admin-master');
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
    if (loading) return;

    if (!gameState) {
      setRoomNotFound(true);
      return;
    }

    // STRICT GAME STATUS & LATE JOIN GUARD:
    // If room status is in_game and phase is NOT Warmup, late entry is strictly locked!
    // Players who are not already in the game's player list must be sent to /started
    const playerIsInGame = players.some((p) => String(p.id) === String(userId));
    if (gameState.status === 'in_game' && gameState.phase !== 'Warmup' && !playerIsInGame && userId) {
      router.replace('/started');
      return;
    }

    // STRICT GAME STATUS GUARD: If admin has not started the game, block access and redirect to approved waiting room
    if (gameState.status !== 'in_game') {
      setRoom(gameState);
      router.replace('/approved');
      return;
    }
  }, [loading, gameState, players, userId, router, setRoom]);

  // Handle ambient sound by game phase
  useEffect(() => {
    if (!gameState || gameState.status !== 'in_game') return;

    switch (gameState.phase) {
      case 'Warmup':
        audioEngine.startDiscussionMusic();
        break;
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
        audioEngine.playVictory();
        break;
    }
  }, [gameState]);

  // Announce Warmup start once 3+ required players have joined
  const hasAnnouncedWarmupRef = useRef(false);
  useEffect(() => {
    if (gameState?.phase === 'Warmup') {
      if (players.length >= 3 && !hasAnnouncedWarmupRef.current) {
        hasAnnouncedWarmupRef.current = true;
        narrationEngine.speak(
          'All required players have joined! The game will start in 60 seconds. No new players can join once the game begins.'
        );
      }
    } else {
      hasAnnouncedWarmupRef.current = false;
    }
  }, [gameState?.phase, players.length]);

  // Watch for game end trigger
  useEffect(() => {
    if (gameState?.phase === 'GameEnd' && !showGameOver) {
      GameEngine.checkWinCondition(roomId).then((win) => {
        if (win) {
          setWinnerData(win);
          setShowGameOver(true);
          narrationEngine.narrateGameEnd(win.winner, win.winningPlayers, win.losingPlayers);
        }
      });
    }
  }, [gameState?.phase, roomId, showGameOver]);

  useEffect(() => {
    if (gameState?.phase !== 'Voting') {
      setHasVotedThisRound(false);
    }
  }, [gameState?.phase]);

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === userId),
    [players, userId]
  );
  const isAlive = currentPlayer?.alive ?? true;
  const canChat = isAlive && (gameState?.phase === 'Warmup' || gameState?.phase === 'Discussion' || gameState?.phase === 'Lobby');

  // Automated phase duration configuration (in seconds)
  const getPhaseDuration = (phase?: string) => {
    switch (phase) {
      case 'Warmup':
        return 60;
      case 'Night':
        return 30;
      case 'Morning':
        return 8;
      case 'Discussion':
        return 60;
      case 'Voting':
        return 30;
      case 'Execution':
        return 8;
      default:
        return 30;
    }
  };

  // Dismiss rules walkthrough and advance to night
  const handleDismissRulesAndStart = () => {
    narrationEngine.stop();
    setRulesAutoCloseSeconds(null);
    setShowRulesModal(false);
    setIsRulesIntroActive(false);
    setActiveRuleStep(-1);
    advancePhase('Night');
  };

  // App intelligence automatically advances phase and day
  const handleAutoAdvance = async () => {
    if (!gameState) return;

    // When 60s Warmup completes: announce game start, give warning, announce all rules, and auto-close!
    if (gameState.phase === 'Warmup') {
      if (players.length < 3) {
        // Strict guard: Do not advance without at least 3 players
        return;
      }
      audioEngine.stopAmbient();
      audioEngine.playRoleReveal();
      setIsRulesIntroActive(true);
      setShowRulesModal(true);
      setRulesAutoCloseSeconds(null);

      const sequence = narrationEngine.getGameStartRulesSequence();
      narrationEngine.speakSequence(
        sequence,
        (stepIndex) => {
          setActiveRuleStep(stepIndex);
        },
        () => {
          // Rule narration finished: close modal automatically and advance to Night!
          setTimeout(() => {
            setShowRulesModal(false);
            setIsRulesIntroActive(false);
            setActiveRuleStep(-1);
            advancePhase('Night');
          }, 800);
        }
      );

      // Failsafe timer: in case audio is blocked or ends early, auto-advance after 30 seconds
      setTimeout(() => {
        setShowRulesModal((prev) => {
          if (prev) {
            setIsRulesIntroActive(false);
            setActiveRuleStep(-1);
            advancePhase('Night');
            return false;
          }
          return false;
        });
      }, 30000);
      return;
    }

    // Resolving Voting -> Execution
    if (gameState.phase === 'Voting') {
      const voteResult = await GameEngine.resolveDayVotes(roomId, gameState.day_number);
      if (voteResult.message) {
        setCustomAlert(voteResult.message);
      }

      const winCheck = await GameEngine.checkWinCondition(roomId);
      if (winCheck) {
        setWinnerData(winCheck);
        setShowGameOver(true);
        audioEngine.stopAmbient();
        audioEngine.playVictory();
        narrationEngine.narrateGameEnd(winCheck.winner, winCheck.winningPlayers, winCheck.losingPlayers);
        advancePhase('GameEnd');
        return;
      }

      advancePhase('Execution');
      return;
    }

    // Resolving Night -> Morning
    if (gameState.phase === 'Night') {
      const nightResult = await GameEngine.resolveNightAbilities(roomId, gameState.day_number);
      if (nightResult.message) {
        setCustomAlert(nightResult.message);
      }

      const winCheck = await GameEngine.checkWinCondition(roomId);
      if (winCheck) {
        setWinnerData(winCheck);
        setShowGameOver(true);
        audioEngine.stopAmbient();
        audioEngine.playVictory();
        narrationEngine.narrateGameEnd(winCheck.winner, winCheck.winningPlayers, winCheck.losingPlayers);
        advancePhase('GameEnd');
        return;
      }

      advancePhase('Morning');
      return;
    }

    // Check win condition before any standard phase transition
    const winCheck = await GameEngine.checkWinCondition(roomId);
    if (winCheck) {
      setWinnerData(winCheck);
      setShowGameOver(true);
      audioEngine.stopAmbient();
      audioEngine.playVictory();
      narrationEngine.narrateGameEnd(winCheck.winner, winCheck.winningPlayers, winCheck.losingPlayers);
      advancePhase('GameEnd');
      return;
    }

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
          className="px-6 py-2.5 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-sm shadow-lg shadow-red-900/50 cursor-pointer"
        >
          RETURN TO MAIN MENU
        </button>
      </div>
    );
  }

  // Strict guard: Do NOT render anything in the room until the game is officially in_game
  if (!gameState || !userId || gameState.status !== 'in_game') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-red-500 font-mono tracking-widest uppercase">
          {gameState && gameState.status !== 'in_game'
            ? 'Access Denied: Game has not started. Redirecting...'
            : 'Entering Night...'}
        </span>
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

        {/* Automated Phase Progress & Exit in Header (Top rules button removed as requested) */}
        <div className="flex items-center gap-2">
          {/* Automated Phase Countdown Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/30 text-xs font-mono shadow">
            <Clock size={13} className="text-red-400 animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-zinc-300">
              {gameState.phase === 'Warmup'
                ? players.length < 3
                  ? `WAITING (${players.length}/3)`
                  : 'WARMUP'
                : gameState.phase}:
            </span>
            {gameState.phase === 'Warmup' && players.length < 3 ? (
              <span className="text-amber-400 text-xs font-mono font-bold animate-pulse">
                NEED 3 PLAYERS
              </span>
            ) : (
              <Timer
                duration={getPhaseDuration(gameState.phase)}
                onExpire={handleAutoAdvance}
                isActive={
                  !isRulesIntroActive &&
                  gameState.phase !== 'GameEnd' &&
                  (gameState.phase === 'Warmup' ? players.length >= 3 : true)
                }
              />
            )}
          </div>

          {/* Exit Button */}
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/15 hover:border-zinc-500 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Exit Room"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Cinematic Top Announcement Banner with General Instruction & Private Role Directive */}
      <AnnouncementBanner
        phase={gameState.phase}
        dayNumber={gameState.day_number}
        playerRole={currentPlayer?.role}
        playerCount={players.length}
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
            isAdmin={isAdmin}
            onUpdatePosition={broadcastPosition}
            onRoleAction={async (action, targetId) => {
              const res = await performRoleAction(action, targetId);
              const targetPlayer = players.find((p) => p.id === targetId);
              if (action === 'investigate' && (res as any)?.targetInfo) {
                setCustomAlert(
                  `CONFIDENTIAL POLICE REPORT: ${targetPlayer?.username || 'Suspect'} is secretly a ${(res as any).targetInfo.role || 'Citizen'}!`
                );
              } else {
                setCustomAlert(
                  `Action deployed: ${action.toUpperCase()} targeted at ${targetPlayer?.username || 'player'}`
                );
              }
            }}
          />

          {/* Voting Modal Overlay during Voting Phase */}
          <AnimatePresence>
            {gameState.phase === 'Voting' && isAlive && !hasVotedThisRound && (
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
                      audioEngine.playClick();
                      castVote(targetId);
                      const targetPlayer = players.find((p) => String(p.id) === String(targetId));
                      const targetName = targetPlayer?.username || 'Player';
                      setCustomAlert(`You casted your vote for ${targetName}.`);
                      narrationEngine.speak(`You casted vote ${targetName}`);
                      setHasVotedThisRound(true);
                    }}
                    hasVoted={hasVotedThisRound}
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
            height: viewMode === 'gameOnly' ? '0%' : viewMode === 'chatOnly' ? '100%' : '50%',
          }}
          className="w-full relative transition-all duration-300 overflow-hidden"
        >
          <ChatTab
            messages={messages}
            currentUserId={userId}
            isHostOrAdmin={Boolean(isAdmin || gameState?.host_id === userId || currentPlayer?.role === 'Host')}
            typingUsers={typingUsers}
            recordingUsers={recordingUsers}
            onSendMessage={sendMessage}
            onSendVoiceMessage={sendVoiceMessage}
            onSendMediaMessage={sendMediaMessage}
            onEditMessage={editMessage}
            onDeleteMessages={deleteMessages}
            onPurgeDateMessages={purgeDateMessages}
            onBroadcastTyping={broadcastTyping}
            onBroadcastRecording={broadcastRecording}
            onOpenCallModal={() => setShowCallModal(true)}
            disabled={!canChat}
          />
        </div>
      </main>

      {/* Floating Independent Live Group Audio Call Overlay */}
      <FloatingCallOverlay
        callId={callId}
        callStatus={callStatus}
        incomingCall={incomingCall}
        participants={callParticipants}
        isMicMuted={isMicMuted}
        isSpeakerMuted={isSpeakerMuted}
        isCurfewMuted={isCurfewMuted}
        onAcceptCall={acceptCall}
        onDeclineCall={declineCall}
        onLeaveCall={leaveCall}
        onToggleMic={toggleMic}
        onToggleSpeaker={toggleSpeaker}
        onOpenInviteModal={() => setShowCallModal(true)}
      />

      {/* Live Call Player Selection Modal */}
      <LiveCallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        players={players}
        currentUserId={userId}
        onStartCall={(selectedIds, selectedData) => {
          startCall(selectedIds, selectedData);
        }}
      />

      {/* Mandatory Game Start Rules & Warning Modal (Triggered when 60s warmup ends, auto-closes after 3s) */}
      <RulesBanner
        isOpen={showRulesModal}
        onClose={handleDismissRulesAndStart}
        onReplayAudio={() => {
          const sequence = narrationEngine.getGameStartRulesSequence();
          narrationEngine.speakSequence(sequence, (stepIndex) => setActiveRuleStep(stepIndex));
        }}
        activeStepIndex={activeRuleStep}
        autoCloseSeconds={rulesAutoCloseSeconds}
      />

      {/* Game Over & Winner Congratulations Modal (Non-dismissable, STOP GAME button for Admin) */}
      <GameOverModal
        isOpen={showGameOver || gameState?.phase === 'GameEnd'}
        winnerTeam={winnerData?.winner || null}
        players={players}
        isAdmin={isAdmin}
        onStopGame={async () => {
          await supabase.from('rooms').update({ status: 'ended', phase: 'Lobby' }).eq('id', roomId);
          router.push('/admin');
        }}
      />
    </div>
  );
}
