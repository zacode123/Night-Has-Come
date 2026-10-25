'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Moon,
  Radio,
  User,
  Users,
} from 'lucide-react';
import { CallParticipant, IncomingCallData } from '@/hooks/useLiveCall';
import { audioEngine } from '@/lib/audioEngine';

interface FloatingCallOverlayProps {
  callId: string | null;
  callStatus: 'idle' | 'outgoing' | 'incoming' | 'connected';
  incomingCall: IncomingCallData | null;
  participants: CallParticipant[];
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  isCurfewMuted: boolean;
  onAcceptCall: () => void;
  onDeclineCall: () => void;
  onLeaveCall: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onOpenInviteModal?: () => void;
}

export default function FloatingCallOverlay({
  callId,
  callStatus,
  incomingCall,
  participants,
  isMicMuted,
  isSpeakerMuted,
  isCurfewMuted,
  onAcceptCall,
  onDeclineCall,
  onLeaveCall,
  onToggleMic,
  onToggleSpeaker,
  onOpenInviteModal,
}: FloatingCallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call timer
  useEffect(() => {
    if (callStatus !== 'connected') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Audio ring chime for incoming call
  useEffect(() => {
    if (callStatus === 'incoming') {
      audioEngine.playRoleReveal();
    }
  }, [callStatus]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isAnyoneSpeaking = participants.some((p) => p.isSpeaking);

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. INCOMING CALL MODAL / TOAST                                */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {callStatus === 'incoming' && incomingCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm bg-zinc-950/95 border-2 border-red-600 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col items-center"
          >
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 border-2 border-red-500 flex items-center justify-center shadow-lg shadow-red-900/50">
                {incomingCall.callerAvatar ? (
                  <img src={incomingCall.callerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={30} className="text-zinc-400" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center animate-ping text-white">
                <PhoneCall size={12} />
              </span>
            </div>

            <h4 className="text-sm font-bold text-white tracking-wide">{incomingCall.callerName}</h4>
            <p className="text-xs text-red-400 mb-4 animate-pulse">Incoming Live Audio Call...</p>

            <div className="flex items-center gap-4 w-full">
              <button
                onClick={onDeclineCall}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneOff size={14} className="text-red-400" />
                <span>Decline</span>
              </button>
              <button
                onClick={onAcceptCall}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/50 transition-all"
              >
                <PhoneCall size={14} />
                <span>Join Call</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 2. ACTIVE FLOATING CALL CARD / PILL                           */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {callStatus === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-12 right-3 z-40 max-w-xs shadow-2xl select-none"
          >
            {isMinimized ? (
              /* Minimized Floating Pill */
              <div
                onClick={() => setIsMinimized(false)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full backdrop-blur-xl border cursor-pointer transition-all ${
                  isCurfewMuted
                    ? 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300'
                    : isAnyoneSpeaking
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-900/40'
                    : 'bg-zinc-950/90 border-white/20 text-zinc-200'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {isCurfewMuted ? (
                    <Moon size={11} className="text-indigo-400" />
                  ) : (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </>
                  )}
                </span>
                <span className="text-xs font-mono font-bold">{formatTimer(callDuration)}</span>
                <span className="text-[10px] text-zinc-400">({participants.length} in call)</span>
                <Maximize2 size={12} className="text-zinc-400 ml-1" />
              </div>
            ) : (
              /* Expanded Floating Card */
              <div className="w-72 bg-zinc-950/95 border border-red-600/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-full bg-red-600/20 text-red-500">
                      <Radio size={14} className="animate-pulse" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                        <span>Live Audio Call</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          ({formatTimer(callDuration)})
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1 text-zinc-400 hover:text-white rounded"
                    title="Minimize to Pill"
                  >
                    <Minimize2 size={14} />
                  </button>
                </div>

                {/* Night Curfew Warning */}
                {isCurfewMuted && (
                  <div className="mb-2 p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-600/50 flex items-center gap-2 text-[10px] text-indigo-200">
                    <Moon size={13} className="text-indigo-400 shrink-0" />
                    <span>Curfew active: Calls muted until morning.</span>
                  </div>
                )}

                {/* Participants Avatars */}
                <div className="grid grid-cols-3 gap-2 my-2.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col items-center p-1.5 rounded-xl bg-zinc-900/60 border border-white/5 relative"
                    >
                      <div
                        className={`w-9 h-9 rounded-full overflow-hidden bg-zinc-800 transition-all ${
                          p.isSpeaking && !isCurfewMuted
                            ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-105'
                            : ''
                        }`}
                      >
                        {p.avatar && !p.avatar.startsWith('bot_prompt:') ? (
                          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="flex items-center justify-center h-full text-zinc-400">
                            <User size={18} />
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-semibold text-zinc-200 truncate w-full text-center mt-1">
                        {p.name}
                      </span>

                      {/* Small muted icon if muted */}
                      {p.isMuted && (
                        <span className="absolute top-1 right-1 p-0.5 rounded-full bg-red-950 text-red-400 border border-red-700/60">
                          <MicOff size={9} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Controls Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-1.5">
                  {/* Mute Mic */}
                  <button
                    onClick={onToggleMic}
                    disabled={isCurfewMuted}
                    className={`p-2 rounded-xl border transition-all ${
                      isMicMuted
                        ? 'bg-red-600/30 border-red-500 text-red-400'
                        : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                    title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMicMuted ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>

                  {/* Speaker Deafen */}
                  <button
                    onClick={onToggleSpeaker}
                    disabled={isCurfewMuted}
                    className={`p-2 rounded-xl border transition-all ${
                      isSpeakerMuted
                        ? 'bg-red-600/30 border-red-500 text-red-400'
                        : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                    title={isSpeakerMuted ? 'Turn Speaker On' : 'Turn Speaker Off'}
                  >
                    {isSpeakerMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  {/* Add Player */}
                  {onOpenInviteModal && (
                    <button
                      onClick={onOpenInviteModal}
                      className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-colors"
                      title="Add Player to Call"
                    >
                      <Users size={15} />
                    </button>
                  )}

                  {/* End / Leave Call */}
                  <button
                    onClick={onLeaveCall}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/50 transition-colors"
                  >
                    <PhoneOff size={14} />
                    <span>Leave</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
