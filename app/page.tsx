'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('Leader');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const personalities = [
    { id: 'Leader', desc: 'Takes charge, makes decisions.' },
    { id: 'Quiet Observer', desc: 'Watches closely, speaks rarely.' },
    { id: 'Funny / Comic', desc: 'Defuses tension with humor.' },
    { id: 'Strategic Thinker', desc: 'Plans ahead, analyzes everything.' },
    { id: 'Mysterious', desc: 'Hard to read, unpredictable.' },
    { id: 'Aggressive', desc: 'Quick to accuse, loud.' },
    { id: 'Friendly', desc: 'Trusts easily, builds alliances.' }
  ];

  const handleEnter = () => {
    setHasEntered(true);
    audioEngine.startMainMenuAmbient();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length < 2 || name.length > 20) return;
    
    setIsSubmitting(true);
    
    try {
      // Create player
      const { data, error } = await supabase
        .from('players')
        .insert({
          username: name,
          personality: personality,
          status: 'pending',
          alive: true,
          connected: true
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        localStorage.setItem('playerId', data.id);
        
        // Send email notification to admin
        await fetch('/api/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, personality })
        });

        router.push('/lobby');
      }
    } catch (error) {
      console.error('Error joining:', error);
      setIsSubmitting(false);
    }
  };

  if (!hasEntered) {
    return (
      <div 
        className="min-h-screen bg-black flex items-center justify-center cursor-pointer"
        onClick={handleEnter}
      >
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-red-500 font-serif tracking-widest text-2xl"
        >
          CLICK ANYWHERE TO ENTER
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center justify-center perspective-[1000px]">
      {/* Cinematic Thriller Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,0,0,0.8)_0%,rgba(0,0,0,1)_100%)]" />
        <motion.div 
          animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center mix-blend-overlay"
        />
        {/* Neon Red Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/30 rounded-full blur-[120px]" />
      </div>

      {/* 3D Floating Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Floating Boxes */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`box-${i}`}
            animate={{ 
              y: [0, -30, 0],
              rotateX: [0, 15, 0],
              rotateY: [0, 30, 0]
            }}
            transition={{ 
              duration: 5 + i, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.5
            }}
            className="absolute w-32 h-32 border border-red-500/20 rounded-lg backdrop-blur-sm"
            style={{
              left: `${10 + i * 20}%`,
              top: `${15 + (i % 3) * 25}%`,
              transformStyle: 'preserve-3d',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.1)'
            }}
          />
        ))}
        
        {/* Floating Spheres */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`sphere-${i}`}
            animate={{ 
              y: [0, 40, 0],
              scale: [1, 1.2, 1],
              rotateZ: [0, 180, 360]
            }}
            transition={{ 
              duration: 6 + i, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.7
            }}
            className="absolute w-16 h-16 rounded-full border border-red-700/30 bg-red-900/10 backdrop-blur-md"
            style={{
              right: `${10 + i * 15}%`,
              bottom: `${20 + (i % 2) * 30}%`,
              transformStyle: 'preserve-3d',
              boxShadow: 'inset 0 0 15px rgba(220, 38, 38, 0.2)'
            }}
          />
        ))}

        {/* Floating Triangles (using borders) */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`tri-${i}`}
            animate={{ 
              y: [0, -50, 0],
              rotateX: [0, 360, 0],
              rotateZ: [0, -180, -360]
            }}
            transition={{ 
              duration: 7 + i, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 0.3
            }}
            className="absolute w-0 h-0 opacity-40"
            style={{
              left: `${25 + i * 20}%`,
              top: `${40 + (i % 2) * 20}%`,
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderBottom: '35px solid rgba(220, 38, 38, 0.3)',
              transformStyle: 'preserve-3d',
              filter: 'drop-shadow(0 0 10px rgba(220, 38, 38, 0.5))'
            }}
          />
        ))}

        {/* Floating Rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`ring-${i}`}
            animate={{ 
              rotateX: [0, 360],
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 10 + i * 2, 
              repeat: Infinity, 
              ease: "linear"
            }}
            className="absolute w-48 h-48 rounded-full border-2 border-red-800/40"
            style={{
              left: `${30 + i * 20}%`,
              top: `${20 + i * 20}%`,
              transformStyle: 'preserve-3d',
              boxShadow: '0 0 30px rgba(220, 38, 38, 0.1)'
            }}
          />
        ))}

        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            animate={{ 
              y: [0, -100, 0],
              x: [0, (i % 2 === 0 ? 50 : -50), 0],
              opacity: [0, 0.8, 0]
            }}
            transition={{ 
              duration: 3 + Math.random() * 5, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
            className="absolute w-1 h-1 bg-red-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 5px rgba(220, 38, 38, 0.8)'
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
        <motion.h1 
          initial={{ opacity: 0, z: -100 }}
          animate={{ opacity: 1, z: 0 }}
          transition={{ duration: 1.5, type: "spring" }}
          className="text-5xl md:text-7xl lg:text-8xl font-['var(--font-nosifer)'] tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,1)] py-4"
        >
          NIGHT HAS COME
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-xl md:text-2xl text-red-200 tracking-widest font-light mb-12 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]"
        >
          Trust no one. Survive the night.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(220, 38, 38, 0.8)' }}
          whileTap={{ scale: 0.95 }}
          onHoverStart={() => audioEngine.playHover()}
          onClick={() => {
            audioEngine.playClick();
            setShowModal(true);
          }}
          className="w-32 h-32 rounded-full border-2 border-red-600 bg-red-900/30 backdrop-blur-sm flex items-center justify-center text-xl tracking-widest hover:bg-red-800/50 transition-all text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
        >
          ▶ PLAY
        </motion.button>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-12 text-red-400 text-sm tracking-widest uppercase font-bold drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
          style={{ textShadow: '0 0 10px rgba(220,38,38,0.8), 0 0 20px rgba(220,38,38,0.6)' }}
        >
          Created by Zahid Arman
        </motion.p>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, rotateX: 10 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: 20, rotateX: -10 }}
              className="bg-black/80 border border-red-600/50 p-8 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <h2 className="text-3xl font-serif text-red-500 mb-6 text-center drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">Enter the Game</h2>
              
              <form onSubmit={handleJoin} className="space-y-6">
                <div>
                  <label className="block text-sm text-red-400 mb-2 uppercase tracking-wider">Player Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-red-950/20 border border-red-900/50 rounded-lg px-4 py-3 text-red-100 focus:outline-none focus:border-red-500 transition-colors placeholder-gray-400"
                    required
                    minLength={2}
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm text-red-400 mb-2 uppercase tracking-wider">Choose Your Personality</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {personalities.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          audioEngine.playHover();
                          setPersonality(p.id);
                        }}
                        className={`cursor-pointer p-3 rounded-lg border transition-all ${
                          personality === p.id 
                            ? 'bg-red-900/40 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                            : 'bg-black/50 border-red-900/30 hover:border-red-700/50'
                        }`}
                      >
                        <div className="text-red-200 font-medium mb-1">{p.id}</div>
                        <div className="text-red-500/70 text-xs">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button 
                    type="button"
                    onMouseEnter={() => audioEngine.playHover()}
                    onClick={() => {
                      audioEngine.playClick();
                      setShowModal(false);
                    }}
                    className="flex-1 py-3 border border-red-900/50 text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    onMouseEnter={() => audioEngine.playHover()}
                    onClick={() => audioEngine.playClick()}
                    disabled={isSubmitting || name.length < 2}
                    className="flex-1 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                  >
                    {isSubmitting ? 'Joining...' : 'Join Game'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
