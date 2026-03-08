'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { audioEngine } from '@/lib/audioEngine';

export default function Timer({ duration, onExpire, isActive }: { duration: number, onExpire: () => void, isActive: boolean }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [prevDuration, setPrevDuration] = useState(duration);
  const [prevIsActive, setPrevIsActive] = useState(isActive);

  if (duration !== prevDuration || isActive !== prevIsActive) {
    setTimeLeft(duration);
    setPrevDuration(duration);
    setPrevIsActive(isActive);
  }

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (timeLeft === 0 && isActive) {
        onExpire();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 10 && prev > 0) {
          audioEngine.playVoteTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onExpire]);

  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center space-x-2 text-xl font-mono">
      <motion.span
        animate={{ opacity: timeLeft <= 10 ? [1, 0.5, 1] : 1 }}
        transition={{ duration: 1, repeat: timeLeft <= 10 ? Infinity : 0 }}
        className={timeLeft <= 10 ? 'text-red-400' : 'text-blue-300'}
      >
        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:
        {(timeLeft % 60).toString().padStart(2, '0')}
      </motion.span>
    </div>
  );
}
