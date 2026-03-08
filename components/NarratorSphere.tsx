'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface NarratorSphereProps {
  isSpeaking: boolean;
  themeGlow: string;
}

export function NarratorSphere({ isSpeaking, themeGlow }: NarratorSphereProps) {
  const [ripples, setRipples] = useState<number[]>([]);

  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setRipples((prev) => [...prev, Date.now()].slice(-5)); // Keep last 5 ripples
      }, 500);
      return () => clearInterval(interval);
    } else {
      setTimeout(() => setRipples([]), 0);
    }
  }, [isSpeaking]);

  return (
    <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
      {/* Base Sphere */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.05, 1] : 1,
          boxShadow: isSpeaking 
            ? ['0 0 20px rgba(59,130,246,0.5)', '0 0 40px rgba(59,130,246,0.8)', '0 0 20px rgba(59,130,246,0.5)']
            : '0 0 15px rgba(59,130,246,0.3)',
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/80 to-blue-900/90 backdrop-blur-md border border-blue-300/50 ${themeGlow}`}
      >
        {/* Inner core */}
        <div className="absolute inset-2 rounded-full bg-blue-200/20 blur-sm mix-blend-overlay" />
        <div className="absolute inset-4 rounded-full bg-white/10 blur-xs" />
      </motion.div>

      {/* Ripples */}
      {ripples.map((id) => (
        <motion.div
          key={id}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute w-20 h-20 rounded-full border border-blue-400/40 pointer-events-none"
        />
      ))}
    </div>
  );
}
