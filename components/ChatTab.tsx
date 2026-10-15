'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Mic,
  Square,
  Play,
  Pause,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Radio,
  User,
  Bot
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { getPersonalityBorder } from '@/lib/personalityBorder';

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  personality?: string;
  message?: string;
  message_type?: 'text' | 'voice' | 'system' | 'game_event';
  audio_url?: string;
  audio_duration?: number;
  created_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
}

interface ChatTabProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (msg: string) => void;
  onSendVoiceMessage?: (audioBase64: string, durationSec: number) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  disabled: boolean;
}

// -------------------------------------------------------------
// AUDIO MESSAGE WAVEFORM COMPONENT
// -------------------------------------------------------------
function AudioMessagePlayer({
  audioUrl,
  duration,
  isMe,
}: {
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[180px] sm:min-w-[220px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow ${
          isMe
            ? 'bg-red-700 text-white hover:bg-red-600'
            : 'bg-zinc-700 text-white hover:bg-zinc-600'
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Simulated Waveform Bars */}
      <div className="flex-1 flex items-center gap-[2.5px] h-6 overflow-hidden">
        {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 75, 50, 85, 65, 40].map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`w-[3px] rounded-full transition-all ${
              isPlaying
                ? isMe ? 'bg-red-400 animate-pulse' : 'bg-zinc-300 animate-pulse'
                : isMe ? 'bg-red-300/60' : 'bg-zinc-500/60'
            }`}
          />
        ))}
      </div>

      <span className="text-[10px] font-mono text-zinc-400">
        {isPlaying ? formatSec(currentTime) : formatSec(duration || 3)}
      </span>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN CHAT TAB COMPONENT
// -------------------------------------------------------------
export default function ChatTab({
  messages,
  currentUserId,
  onSendMessage,
  onSendVoiceMessage,
  onEditMessage,
  onDeleteMessage,
  disabled,
}: ChatTabProps) {
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // WhatsApp Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRecording]);

  // Handle Text Message Submit
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      audioEngine.playClick();
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // -------------------------------------------------------------
  // WHATSAPP VOICE RECORDING ENGINE
  // -------------------------------------------------------------
  const startVoiceRecording = async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (onSendVoiceMessage && base64Audio) {
            onSendVoiceMessage(base64Audio, recordingSeconds);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      audioEngine.playHover();

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone permissions to send voice messages.');
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      audioEngine.playSelect();
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      audioChunksRef.current = [];
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      audioEngine.playClick();
    }
  };

  // -------------------------------------------------------------
  // EDIT & DELETE HANDLERS
  // -------------------------------------------------------------
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message || '');
    setActiveMenuId(null);
  };

  const handleSaveEdit = (msgId: string) => {
    if (editText.trim() && onEditMessage) {
      onEditMessage(msgId, editText.trim());
      setEditingMessageId(null);
      setEditText('');
    }
  };

  const handleDelete = (msgId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(msgId);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border border-white/10 rounded-xl backdrop-blur-xl overflow-hidden select-none">
      {/* Header */}
      <div className="p-2.5 sm:p-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <h3 className="text-xs uppercase tracking-widest font-black text-red-500 font-mono">
            Live Deliberation Room
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          {disabled ? 'Chat Disabled During Curfew' : 'Voice & Text Active'}
        </span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const isSystem = msg.message_type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-[11px] font-mono text-red-300 bg-red-950/40 border border-red-900/40 px-3 py-1 rounded-full text-center">
                  {msg.message}
                </span>
              </div>
            );
          }

          if (msg.is_deleted) {
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 opacity-50`}
              >
                <div className="text-xs italic text-zinc-500 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
                  This message was deleted
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
            >
              {/* Sender Name & Avatar */}
              {!isMe && (
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                  <div
                    className={`w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border ${getPersonalityBorder(
                      msg.personality || 'Leader'
                    )}`}
                  >
                    {msg.sender_avatar && !msg.sender_avatar.startsWith('bot_prompt:') ? (
                      <img src={msg.sender_avatar} className="w-full h-full object-cover" />
                    ) : msg.sender_name?.toLowerCase().includes('bot') || msg.sender_name?.startsWith('[BOT]') ? (
                      <span className="flex items-center justify-center h-full text-cyan-400">
                        <Bot size={11} />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center h-full text-zinc-400">
                        <User size={11} />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">
                    {msg.sender_name}
                  </span>
                  <span className="text-[9px] text-zinc-500">({msg.personality})</span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2 rounded-2xl shadow-lg ${
                  isMe
                    ? 'bg-gradient-to-r from-red-800 to-red-950 text-white rounded-tr-xs border border-red-700/50'
                    : 'bg-zinc-900/90 text-zinc-200 rounded-tl-xs border border-white/10'
                }`}
              >
                {/* Voice Message vs Text Message */}
                {msg.message_type === 'voice' && msg.audio_url ? (
                  <AudioMessagePlayer
                    audioUrl={msg.audio_url}
                    duration={msg.audio_duration}
                    isMe={isMe}
                  />
                ) : editingMessageId === msg.id ? (
                  /* Inline Edit Mode */
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-red-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(msg.id)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingMessageId(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm leading-relaxed break-words">{msg.message}</p>
                    {msg.is_edited && (
                      <span className="text-[9px] text-zinc-400 italic block text-right mt-0.5">
                        (edited)
                      </span>
                    )}
                  </div>
                )}

                {/* Edit / Delete Options (For My Messages) */}
                {isMe && !msg.is_deleted && msg.message_type !== 'voice' && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === msg.id ? null : msg.id)
                      }
                      className="p-0.5 rounded text-zinc-300 hover:text-white"
                    >
                      <MoreVertical size={13} />
                    </button>

                    {activeMenuId === msg.id && (
                      <div className="absolute right-0 top-5 z-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1 w-24 text-xs">
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="flex items-center gap-1.5 w-full px-2 py-1 text-zinc-200 hover:bg-zinc-800 rounded text-left"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="flex items-center gap-1.5 w-full px-2 py-1 text-red-400 hover:bg-red-950/40 rounded text-left"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar or Voice Recording Bar */}
      <div className="p-2 sm:p-2.5 bg-black/50 border-t border-white/10">
        <AnimatePresence mode="wait">
          {isRecording ? (
            /* WhatsApp-Style Active Recording Bar */
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-between gap-3 bg-red-950/60 border border-red-600 rounded-full px-4 py-2"
            >
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold">
                  RECORDING {Math.floor(recordingSeconds / 60)}:
                  {recordingSeconds % 60 < 10 ? '0' : ''}
                  {recordingSeconds % 60}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                  title="Cancel Recording"
                >
                  <X size={18} />
                </button>
                <button
                  type="button"
                  onClick={stopAndSendVoiceRecording}
                  className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg"
                >
                  <Send size={13} />
                  <span>Send Voice</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Standard Text & Voice Input Form */
            <motion.form
              key="input"
              onSubmit={handleSend}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={disabled}
                placeholder={disabled ? 'Curfew active. Shh...' : 'Type message or send voice note...'}
                className="flex-1 bg-black/60 border border-white/15 rounded-full px-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-40"
                maxLength={400}
              />

              {/* Instant WhatsApp Voice Button */}
              <button
                type="button"
                onClick={startVoiceRecording}
                disabled={disabled}
                title="Hold or tap to record instant voice note"
                className="p-2.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors shadow"
              >
                <Mic size={18} />
              </button>

              {/* Text Send Button */}
              <button
                type="submit"
                disabled={disabled || !input.trim()}
                className="p-2.5 rounded-full bg-red-700 text-white hover:bg-red-600 disabled:opacity-40 shadow-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
