'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { audioEngine } from '@/lib/audioEngine';

export default function GlobalTouchGlow() {
  const [glows, setGlows] = useState<{ id: number; x: number; y: number }[]>([]);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const lastSpawn = useRef(0);

  useEffect(() => {
    audioEngine.init();
  }, []);

  useEffect(() => {
    const handleTouch = (e: MouseEvent | TouchEvent) => {
      // Resume audio context
      audioEngine.init();

      const now = Date.now();
      if (now - lastSpawn.current < 80) return; // throttle glow spawn
      lastSpawn.current = now;

      const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const y = 'clientY' in e ? e.clientY : e.touches[0].clientY;

      const id = Date.now();

      setGlows(prev => {
        const next = [...prev, { id, x, y }];
        return next.slice(-6); // keep only last 6 glows
      });

      setTimeout(() => {
        setGlows(prev => prev.filter(g => g.id !== id));
      }, 2000);
    };

    window.addEventListener('mousedown', handleTouch);
    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('mousedown', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {glows.map(g => (
        <motion.div
          key={g.id}
          initial={{ opacity: 0.5, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 2 }}
          className={`absolute rounded-full blur-xl ${
            isAdmin ? 'bg-blue-500/30' : 'bg-red-500/30'
          }`}
          style={{
            left: g.x - 100,
            top: g.y - 100,
            width: 200,
            height: 200,
          }}
        />
      ))}
    </div>
  );
}
