'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { audioEngine } from '@/lib/audioEngine';

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('Leader');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Load background ambient sound
    audioEngine.loadSound('ambient', 'https://actions.google.com/sounds/v1/weather/wind_howl.ogg');
    audioEngine.loadSound('click', 'https://actions.google.com/sounds/v1/ui/button_click.ogg');
    
    const handleInteraction = () => {
      audioEngine.playSound('ambient', true, 0.2);
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  const handlePlayClick = () => {
    audioEngine.playSound('click', false, 0.5);
    setShowModal(true);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length < 2) return;
    
    setIsJoining(true);
    audioEngine.playSound('click', false, 0.5);
    
    // In a real app, this would call an API to create the player and send email
    // For now, we'll just simulate the delay and redirect to lobby
    setTimeout(() => {
      // Store user info in localStorage for simplicity
      localStorage.setItem('playerName', name);
      localStorage.setItem('playerPersonality', personality);
      router.push('/lobby');
    }, 1500);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
        <motion.div 
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            Night Has Come
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-blue-200/80 font-light tracking-wide">
            Trust no one. <br className="md:hidden" /> Survive the night.
          </p>
        </motion.div>

        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayClick}
          className="group relative flex items-center justify-center w-32 h-32 rounded-full bg-blue-600/20 border border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] hover:bg-blue-600/30 transition-all duration-300"
        >
          <span className="font-display font-bold text-2xl tracking-widest text-white group-hover:text-blue-200 ml-2">
            PLAY
          </span>
        </motion.button>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-slate-500 tracking-widest uppercase"
        >
          Created by Zahid Arman
        </motion.p>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-8 rounded-2xl bg-slate-900/80 border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)] backdrop-blur-md"
          >
            <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">Join the Game</h2>
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-2 uppercase tracking-wider">Player Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-lg bg-slate-950/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder-slate-600 transition-all"
                  required
                  minLength={2}
                  maxLength={20}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-2 uppercase tracking-wider">Personality</label>
                <select 
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-950/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white transition-all appearance-none"
                >
                  <option value="Leader">Leader</option>
                  <option value="Quiet Observer">Quiet Observer</option>
                  <option value="Funny / Comic">Funny / Comic</option>
                  <option value="Strategic Thinker">Strategic Thinker</option>
                  <option value="Mysterious">Mysterious</option>
                  <option value="Aggressive">Aggressive</option>
                  <option value="Friendly">Friendly</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isJoining}
                className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Connecting...' : 'Join Game'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
