'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  duration: number; // in seconds
  onComplete?: () => void;
  phase: string;
}

export function Timer({ duration, onComplete, phase }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Determine color based on time left
  const isUrgent = timeLeft <= 10;
  const colorClass = isUrgent ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]';

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-medium">Time Remaining</p>
      <motion.div
        key={timeLeft}
        initial={{ scale: isUrgent ? 1.2 : 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`text-3xl font-mono font-bold ${colorClass}`}
      >
        {formattedTime}
      </motion.div>
    </div>
  );
}
