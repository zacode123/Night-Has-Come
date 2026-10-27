'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Radio, Shield, Skull, Heart, Search, HelpCircle, AlertCircle } from 'lucide-react';
import { narrationEngine } from '@/lib/narrationEngine';

interface AnnouncementBannerProps {
  phase: string;
  dayNumber: number;
  playerRole?: string | null;
  customAlert?: string | null;
  onClearCustomAlert?: () => void;
}

export default function AnnouncementBanner({
  phase,
  dayNumber,
  playerRole,
  customAlert,
  onClearCustomAlert,
}: AnnouncementBannerProps) {
  const [generalAnnouncement, setGeneralAnnouncement] = useState({
    title: `NIGHT ${dayNumber} HAS COME`,
    subtitle: 'Survive until morning. Trust no one.',
  });
  const [roleDirective, setRoleDirective] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Update general instruction and role instruction on phase or role change
  useEffect(() => {
    const generalData = narrationEngine.getGeneralInstruction(phase, dayNumber);
    const roleText = narrationEngine.getRoleInstruction(playerRole, phase);

    setGeneralAnnouncement({
      title: generalData.title,
      subtitle: generalData.subtitle,
    });
    setRoleDirective(roleText);

    if (!isMuted && !customAlert) {
      setIsSpeaking(true);
      // Voice announces the general phase instruction without spoiling any player names or roles
      narrationEngine.speak(generalData.voice);
      const timer = setTimeout(() => setIsSpeaking(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [phase, dayNumber, playerRole, isMuted, customAlert]);

  // Handle custom alerts (e.g. casualty report, execution announcement)
  useEffect(() => {
    if (customAlert) {
      setGeneralAnnouncement({
        title: 'EMERGENCY BROADCAST',
        subtitle: customAlert,
      });

      if (!isMuted) {
        setIsSpeaking(true);
        narrationEngine.speak(customAlert);
        const timer = setTimeout(() => {
          setIsSpeaking(false);
          if (onClearCustomAlert) onClearCustomAlert();
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [customAlert, isMuted, onClearCustomAlert]);

  // Subscribe to live broadcast announcements
  useEffect(() => {
    const unsubscribe = narrationEngine.subscribe(({ title, message, roleDirective: rDir }) => {
      setGeneralAnnouncement({ title, subtitle: message });
      if (rDir) setRoleDirective(rDir);
      if (!isMuted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 5000);
      }
    });
    return unsubscribe;
  }, [isMuted]);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      const generalData = narrationEngine.getGeneralInstruction(phase, dayNumber);
      narrationEngine.speak(generalData.voice);
    } else {
      setIsMuted(true);
      narrationEngine.stop();
      setIsSpeaking(false);
    }
  };

  const getRoleIcon = () => {
    switch (playerRole) {
      case 'Mafia':
        return <Skull size={13} className="text-red-400" />;
      case 'Doctor':
        return <Heart size={13} className="text-emerald-400" />;
      case 'Police':
      case 'Detective':
        return <Search size={13} className="text-blue-400" />;
      default:
        return <Shield size={13} className="text-amber-400" />;
    }
  };

  const getPhaseGradient = () => {
    switch (phase) {
      case 'Night':
        return 'from-blue-950/85 via-black to-red-950/85 border-blue-600/50';
      case 'Voting':
        return 'from-purple-950/85 via-black to-red-950/85 border-purple-500/50';
      case 'Execution':
        return 'from-red-950/95 via-black to-red-950/95 border-red-600/70';
      case 'Morning':
        return 'from-amber-950/85 via-black to-zinc-950/85 border-amber-600/50';
      case 'Warmup':
        return 'from-amber-950/80 via-black to-zinc-950/80 border-amber-500/40';
      default:
        return 'from-zinc-950/90 via-black to-red-950/80 border-red-500/40';
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 py-1.5 z-30 select-none">
      <motion.div
        initial={{ y: -15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`relative overflow-hidden rounded-2xl border ${getPhaseGradient()} backdrop-blur-md shadow-2xl p-2.5 sm:p-3 flex flex-col gap-2`}
      >
        {/* Top Line: General Instruction for EVERYONE */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Pulsing hazard strobe light */}
            <div className="relative flex-shrink-0">
              <span className="flex h-3 w-3 sm:h-3.5 sm:w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-red-600" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase font-mono px-2 py-0.5 rounded bg-black/60 border border-white/10 text-red-300">
                  {generalAnnouncement.title}
                </span>

                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 uppercase">
                  MANOR DIRECTIVE (EVERYONE)
                </span>

                {isSpeaking && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono animate-pulse">
                    <Radio size={12} />
                    <span>BROADCASTING...</span>
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-medium text-zinc-200 mt-0.5 truncate tracking-wide">
                {generalAnnouncement.subtitle}
              </p>
            </div>
          </div>

          {/* Voice Mute / Replay Control */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute AI Voice Narration' : 'Mute AI Voice Narration'}
            className="flex-shrink-0 p-2 rounded-xl bg-black/50 border border-white/10 hover:border-red-500/50 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            {isMuted ? (
              <VolumeX size={15} className="text-red-400" />
            ) : (
              <Volume2 size={15} className="text-emerald-400" />
            )}
          </button>
        </div>

        {/* Bottom Line: ROLE-SPECIFIC DIRECTIVE FOR CURRENT PLAYER */}
        {roleDirective && (
          <div className="pt-1.5 border-t border-white/10 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70 border border-white/15 text-[10px] font-mono font-bold shrink-0">
              {getRoleIcon()}
              <span className="text-zinc-300 uppercase">{playerRole || 'Citizen'}</span>
            </div>

            <p className="text-[11px] sm:text-xs text-amber-300/90 font-medium truncate flex-1">
              {roleDirective}
            </p>

            <span className="text-[9px] font-mono text-zinc-500 uppercase hidden sm:inline">
              Private Role Intel
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
