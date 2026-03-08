'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const personalities = [
  'Leader',
  'Quiet Observer',
  'Funny / Comic',
  'Strategic Thinker',
  'Mysterious',
  'Aggressive',
  'Friendly',
];

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState(personalities[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.length < 2 || name.length > 20) {
      setError('Name must be between 2 and 20 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Save data to database
      const { data, error: dbError } = await supabase
        .from('players')
        .insert([
          {
            username: name,
            personality: personality,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Send notification email (via API route)
      await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, personality }),
      });

      // Store player id in local storage for session management
      if (data) {
        localStorage.setItem('playerId', data.id);
      }

      // 3. Show waiting screen
      router.push('/waiting-room');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to join the game.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md p-8 overflow-hidden rounded-2xl bg-slate-900/80 border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)] backdrop-blur-md"
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-blue-500/10 to-transparent" />
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-6 font-sans">
            Join the Game
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-1">
                Player Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="personality" className="block text-sm font-medium text-blue-200 mb-1">
                Personality
              </label>
              <select
                id="personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                disabled={isSubmitting}
              >
                {personalities.map((p) => (
                  <option key={p} value={p} className="bg-slate-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
