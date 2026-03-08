'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import { Message } from '@/hooks/useChat';

export default function ChatTab({ 
  messages, 
  currentUserId, 
  onSendMessage, 
  disabled 
}: { 
  messages: Message[], 
  currentUserId: string, 
  onSendMessage: (msg: string) => void,
  disabled: boolean
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-xl backdrop-blur-md overflow-hidden">
      <div className="p-3 border-b border-white/10 bg-white/5">
        <h3 className="text-sm uppercase tracking-widest text-gray-400 font-semibold">Discussion</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const isSystem = msg.message_type === 'system';
          
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                  {msg.message}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-xs text-gray-500 mb-1 ml-1">{msg.sender_name}</span>}
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-gray-800 text-gray-200 rounded-tl-sm'
              }`}>
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/10 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Chat is disabled right now" : "Type a message..."}
          className="flex-1 bg-black/50 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-500 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
