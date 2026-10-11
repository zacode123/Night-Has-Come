'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, AlertTriangle, Radio } from 'lucide-react';
import { narrationEngine } from '@/lib/narrationEngine';

interface AnnouncementBannerProps {
  phase: string;
  dayNumber: number;
  customAlert?: string | null;
  onClearCustomAlert?: () => void;
}

export default function AnnouncementBanner({
  phase,
  dayNumber,
  customAlert,
  onClearCustomAlert,
}: AnnouncementBannerProps) {
  const [announcement, setAnnouncement] = useState({
    title: `NIGHT ${dayNumber} HAS COME`,
    subtitle: 'Survive until morning. Trust no one.',
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Update narration whenever phase or dayNumber changes
  useEffect(() => {
    const data = narrationEngine.getPhaseNarration(phase, dayNumber);
    setAnnouncement(data);

    if (!isMuted) {
      setIsSpeaking(true);
      narrationEngine.speak(data.subtitle);
      const timer = setTimeout(() => setIsSpeaking(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [phase, dayNumber, isMuted]);

  // Handle custom alerts (e.g. execution, voting results)
  useEffect(() => {
    if (customAlert) {
      setAnnouncement({
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
    const unsubscribe = narrationEngine.subscribe(({ title, message }) => {
      setAnnouncement({ title, subtitle: message });
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
      narrationEngine.speak(announcement.subtitle);
    } else {
      setIsMuted(true);
      narrationEngine.stop();
      setIsSpeaking(false);
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'Night':
        return 'from-blue-950/80 via-black to-red-950/80 border-red-600/60 text-red-400';
      case 'Voting':
        return 'from-purple-950/80 via-black to-red-950/80 border-purple-500/60 text-purple-300';
      case 'Execution':
        return 'from-red-950/90 via-black to-red-950/90 border-red-600 text-red-500';
      case 'Morning':
        return 'from-amber-950/80 via-black to-zinc-950/80 border-amber-600/60 text-amber-300';
      default:
        return 'from-zinc-950/80 via-black to-red-950/80 border-red-500/40 text-red-400';
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 py-1.5 z-30 select-none">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`relative overflow-hidden rounded-xl border bg-gradient-to-r ${getPhaseColor()} backdrop-blur-md shadow-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3`}
      >
        {/* Pulsing red hazard strobe light */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <span className="flex h-3 w-3 sm:h-3.5 sm:w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-red-600" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase font-mono px-2 py-0.5 rounded bg-red-950/80 border border-red-500/50 text-red-300">
                {announcement.title}
              </span>
              {isSpeaking && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono animate-pulse">
                  <Radio size={12} />
                  <span>TRANSMITTING...</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-zinc-200 mt-0.5 truncate tracking-wide">
              {announcement.subtitle}
            </p>
          </div>
        </div>

        {/* Audio Mute / Replay Control */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute AI Voice Narration' : 'Mute AI Voice Narration'}
          className="flex-shrink-0 p-2 rounded-lg bg-black/40 border border-white/10 hover:border-red-500/50 text-zinc-300 hover:text-white transition-all active:scale-95"
        >
          {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
        </button>
      </motion.div>
    </div>
  );
}
