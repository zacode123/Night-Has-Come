'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import DrippingText from "@/components/DrippingText";
import GlobalTouchGlow from '@/components/GlobalTouchGlow';
import Background3D from '@/components/Background3D';

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('15');
  const [personality, setPersonality] = useState('Leader');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    const checkStatus = async () => {
      // First check if game has started
      const { data: room } = await supabase
        .from('rooms')
        .select('status')
        .eq('room_code', 'MAFIA')
        .single();

      const gameStarted = room?.status === 'started';
      const storedId = Cookies.get('playerId') || localStorage.getItem('playerId');

      if (gameStarted) {
        if (storedId) {
          // If player exists, redirect to game
          router.push('/game/MAFIA');
        } else {
          // If no player, redirect to "Game Started" page
          router.push('/started');
        }
        return;
      }

      if (storedId) {
        const { data, error } = await supabase
          .from('players')
          .select('status, username')
          .eq('id', storedId)
          .single();
        
        if (data) {
          Cookies.set('playerStatus', data.status, { expires: 7 });
          
          if (data.status === 'approved') {
            router.push('/approved');
          } else if (data.status === 'rejected') {
            router.push('/rejected');
          } else if (data.status === 'pending') {
            router.push('/lobby');
          }
        } else {
          localStorage.removeItem('playerId');
          Cookies.remove('playerId');
          Cookies.remove('playerStatus');
        }
      }
    };
    
    checkStatus();
  }, [router]);

  const handleEnter = () => {
    setHasEntered(true);
    audioEngine.init();
    audioEngine.startMainMenuAmbient();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.length < 2 || name.length > 20) return;
    
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 20) {
      setError('Age must be between 10 and 20.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Check for duplicate name
      const { data: existingUser } = await supabase
        .from('players')
        .select('id')
        .eq('username', name)
        .maybeSingle();

      if (existingUser) {
        setError('This name is already taken. Please choose another.');
        setIsSubmitting(false);
        return;
      }

      // Create player
      const { data, error } = await supabase
        .from('players')
        .insert({
          username: name,
          age: parseInt(age),
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
        Cookies.set('playerId', data.id, { expires: 7 });
        Cookies.set('playerStatus', 'pending', { expires: 7 });
        router.push('/lobby');
      }
    } catch (error) {
      console.error('Error joining:', error);
      setError('Failed to join. Please try again.');
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
    <div className="min-h-screen bg-black text-zinc-200 relative overflow-hidden flex flex-col items-center justify-center perspective-[1000px]">
      {/* Admin Icon */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/admin">
          <motion.div
            whileHover={{ scale: 1.1, textShadow: '0 0 8px rgb(220, 38, 38)' }}
            whileTap={{ scale: 0.9 }}
            className="text-red-500/50 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Shield size={24} />
            <span className="text-sm tracking-widest uppercase font-bold hidden sm:inline-block">Admin</span>
          </motion.div>
        </Link>
      </div>

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
      <Background3D />

      {/* Main Content */}
      <div className="relative z-10 text-center flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
        <motion.div 
          initial={{ opacity: 0, z: -100 }}
          animate={{ 
            opacity: 1, 
            z: 0,
            y: [0, -15, 0] 
          }}
          transition={{ 
            opacity: { duration: 1.5 },
            z: { duration: 1.5 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="mb-0 py-0"
        >
          <DrippingText 
            text="NIGHT HAS COME" 
            className="text-15xl md:text-9xl lg:text-8xl font-['var(--font-nosifer)'] font-black tracking-[0.05em] text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.9)] drop-shadow-[0_0_30px_rgba(220,38,38,0.7)]"
          />
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            y: [0, -5, 0]
          }}
          transition={{ 
            opacity: { duration: 1, delay: 0.5 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
          }}
          className="text-2xl md:text-xl font-bold text-zinc-300 tracking-widest mb-8 px-6 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]"
        >
          Trust no one. Survive the night.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: '0 0 40px rgba(220, 38, 38, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)'
          }}
          whileTap={{ scale: 0.95 }}
          onHoverStart={() => audioEngine.playHover()}
          onClick={() => {
            audioEngine.playClick();
            setShowModal(true);
          }}
          className="px-12 py-6 rounded-[25px] border-2 border-red-600 bg-red-900/30 backdrop-blur-sm flex items-center justify-center text-xl tracking-widest hover:bg-red-800/50 transition-all text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
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
              <motion.h2 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-3xl font-serif text-red-500 mb-6 text-center drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]"
              >
                Enter the Game
              </motion.h2>
              
              <form onSubmit={handleJoin} className="space-y-6">
                {error && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-sm text-center">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label className="block text-sm text-red-400 mb-2 uppercase tracking-wider">Age (10-20)</label>
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min={10}
                      max={20}
                      className="w-full bg-red-950/20 border border-red-900/50 rounded-lg px-4 py-3 text-red-100 focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-red-400 mb-2 uppercase tracking-wider">Choose Your Personality</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {personalities.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          audioEngine.playSelect();
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
