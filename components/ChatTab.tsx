'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: string;
  created_at: string;
}

interface ChatTabProps {
  roomId: string;
  playerId: string;
  playerName: string;
  isAlive: boolean;
  phase: string;
}

export function ChatTab({ roomId, playerId, playerName, isAlive, phase }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canChat = isAlive && (phase === 'discussion' || phase === 'lobby' || phase === 'voting');

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    audioRef.current = new Audio('/sounds/chat_ping.mp3');
    audioRef.current.volume = 0.4;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (data) setMessages(data);
      scrollToBottom();
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          
          if (msg.sender_id !== playerId && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !canChat) return;

    const msgText = newMessage.trim().substring(0, 500);
    setNewMessage('');

    await supabase.from('messages').insert([
      {
        room_id: roomId,
        sender_id: playerId,
        sender_name: playerName,
        message: msgText,
        message_type: 'text',
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border-r border-slate-800 backdrop-blur-md overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Room Chat
        </h2>
        {!canChat && (
          <p className="text-xs text-red-400 mt-1">Chat is disabled during this phase.</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === playerId;
            const isSystem = msg.message_type === 'system' || msg.message_type === 'game_event';

            if (isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center my-2"
                >
                  <span className="bg-slate-800/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700/50">
                    {msg.message}
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-xs text-slate-500 ml-1 mb-1">{msg.sender_name}</span>
                )}
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-[0_2px_10px_rgba(37,99,235,0.2)]'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
                <span className="text-[10px] text-slate-600 mt-1 mx-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-950/80 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="flex gap-2 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={canChat ? "Type a message..." : "Chat disabled"}
            disabled={!canChat}
            maxLength={500}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canChat || !newMessage.trim()}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
