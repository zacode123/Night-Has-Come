'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { narrationEngine } from '@/lib/narrationEngine';

export default function NarrationPanel({ text, isSpeaking }: { text: string, isSpeaking: boolean }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (isSpeaking && text) {
      narrationEngine.speak(text);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayedText(text);
    } else {
      narrationEngine.stop();
    }
  }, [text, isSpeaking]);

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[150px]">
      <AnimatePresence mode="wait">
        {isSpeaking && (
          <motion.div
            key="sphere"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: 1,
              boxShadow: ['0 0 20px rgba(59, 130, 246, 0.5)', '0 0 40px rgba(59, 130, 246, 0.8)', '0 0 20px rgba(59, 130, 246, 0.5)']
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-400 backdrop-blur-md mb-6"
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        {text && (
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xl md:text-2xl text-center font-serif text-blue-100 tracking-wide leading-relaxed max-w-2xl"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
