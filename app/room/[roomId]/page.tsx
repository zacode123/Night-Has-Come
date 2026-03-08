'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { audioEngine } from '@/lib/audioEngine';
import { narrationEngine } from '@/lib/narrationEngine';
import { useGameState } from '@/hooks/useGameState';
import { useChat } from '@/hooks/useChat';
import { ChatService } from '@/lib/chatService';
import { Send, Mic, Users, Clock, ShieldAlert } from 'lucide-react';

export default function GameRoom() {
  const { roomId } = useParams();
  const [phase, setPhase] = useState('Night');
  const [theme, setTheme] = useState('night');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState('Player');
  const [playerId, setPlayerId] = useState('temp-id');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerName(localStorage.getItem('playerName') || 'Player');
     
    setPlayerId(Math.random().toString(36).substring(7));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Simulate game phases
    const phases = ['Night', 'Morning', 'Discussion', 'Voting', 'Execution'];
    let currentPhaseIndex = 0;

    const interval = setInterval(() => {
      currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      const newPhase = phases[currentPhaseIndex];
      setPhase(newPhase);

      if (newPhase === 'Night') {
        setTheme('night');
        audioEngine.playSound('horror_drone', true, 0.3);
        narrationEngine.speak('Night has fallen. Somewhere in the darkness, a killer chooses their target.');
      } else if (newPhase === 'Morning') {
        setTheme('default');
        audioEngine.playSound('reveal', false, 0.6);
        narrationEngine.speak('Morning arrives. But someone will never wake up again.');
      } else if (newPhase === 'Discussion') {
        setTheme('default');
        audioEngine.playSound('ticking', true, 0.2);
        narrationEngine.speak('Discuss and find the killer.');
      } else if (newPhase === 'Voting') {
        setTheme('voting');
        audioEngine.playSound('drum', true, 0.4);
        narrationEngine.speak('It is time to vote.');
      } else if (newPhase === 'Execution') {
        setTheme('danger');
        audioEngine.playSound('drum_hit', false, 0.8);
        narrationEngine.speak('The votes are counted.');
      }
    }, 15000); // Change phase every 15 seconds for testing

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender_name: playerName,
      sender_id: playerId,
      message: chatMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);
    setChatMessage('');
    audioEngine.playSound('ping', false, 0.3);
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'night': return 'from-indigo-950 via-slate-950 to-slate-950 border-indigo-500/30 text-indigo-400';
      case 'danger': return 'from-red-950 via-slate-950 to-slate-950 border-red-500/30 text-red-400';
      case 'voting': return 'from-purple-950 via-slate-950 to-slate-950 border-purple-500/30 text-purple-400';
      default: return 'from-blue-950 via-slate-950 to-slate-950 border-blue-500/30 text-blue-400';
    }
  };

  return (
    <main className={`relative min-h-screen flex flex-col md:flex-row overflow-hidden bg-slate-950 transition-colors duration-1000`}>
      <div className={`absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${getThemeClasses()} opacity-50 transition-all duration-1000`} />

      {/* Left Panel - Chat */}
      <div className="relative z-10 w-full md:w-1/3 h-[50vh] md:h-screen flex flex-col border-r border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white tracking-widest uppercase">Discussion</h2>
          <Users className="w-5 h-5 text-slate-400" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.sender_id === playerId ? 'items-end' : 'items-start'}`}
              >
                <span className="text-xs text-slate-500 mb-1 px-1">{msg.sender_name}</span>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.sender_id === playerId 
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-sm' 
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-950/50 border border-slate-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              disabled={phase === 'Night'}
            />
            <button 
              type="submit"
              disabled={phase === 'Night' || !chatMessage.trim()}
              className="p-2 rounded-full bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/40 hover:text-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Center Panel - Game Area */}
      <div className="relative z-10 w-full md:w-2/3 h-[50vh] md:h-screen flex flex-col items-center justify-center p-8">
        
        {/* AI Voice Sphere */}
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            boxShadow: [
              '0 0 20px rgba(59,130,246,0.2)',
              '0 0 40px rgba(59,130,246,0.4)',
              '0 0 20px rgba(59,130,246,0.2)'
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`w-32 h-32 rounded-full border border-white/10 flex items-center justify-center mb-12 relative overflow-hidden ${
            theme === 'danger' ? 'bg-red-900/20 shadow-red-500/50' :
            theme === 'voting' ? 'bg-purple-900/20 shadow-purple-500/50' :
            theme === 'night' ? 'bg-indigo-900/20 shadow-indigo-500/50' :
            'bg-blue-900/20 shadow-blue-500/50'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent" />
          <Mic className={`w-8 h-8 ${
            theme === 'danger' ? 'text-red-400' :
            theme === 'voting' ? 'text-purple-400' :
            theme === 'night' ? 'text-indigo-400' :
            'text-blue-400'
          }`} />
        </motion.div>

        {/* Phase Indicator */}
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center space-y-6 max-w-lg"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-700/50">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-mono text-slate-300 uppercase tracking-widest">{phase} Phase</span>
          </div>
          
          <h1 className={`text-4xl md:text-5xl font-display font-bold tracking-tight ${
            theme === 'danger' ? 'text-red-100 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
            theme === 'voting' ? 'text-purple-100 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
            theme === 'night' ? 'text-indigo-100 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]' :
            'text-blue-100 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]'
          }`}>
            {phase === 'Night' && 'Night has fallen.'}
            {phase === 'Morning' && 'Morning arrives.'}
            {phase === 'Discussion' && 'Discuss and find the killer.'}
            {phase === 'Voting' && 'It is time to vote.'}
            {phase === 'Execution' && 'The votes are counted.'}
          </h1>

          <p className="text-lg text-slate-400 font-light">
            {phase === 'Night' && 'Somewhere in the darkness, a killer chooses their target.'}
            {phase === 'Morning' && 'But someone will never wake up again.'}
            {phase === 'Discussion' && 'You have 60 seconds to make your case.'}
            {phase === 'Voting' && 'Choose wisely. Your life depends on it.'}
            {phase === 'Execution' && 'Someone is about to be eliminated.'}
          </p>
        </motion.div>

        {/* Voting UI (Only visible during voting phase) */}
        <AnimatePresence>
          {phase === 'Voting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-12 w-full max-w-md grid grid-cols-2 gap-4"
            >
              {['Player 2', 'Player 3', 'Player 4', 'Player 5'].map((p, i) => (
                <button
                  key={i}
                  className="p-4 rounded-xl bg-slate-900/50 border border-purple-500/30 hover:bg-purple-900/30 hover:border-purple-500/60 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <span className="relative z-10 font-medium text-purple-200">{p}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
