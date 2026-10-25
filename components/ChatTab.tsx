'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Mic,
  Play,
  Pause,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  X,
  User,
  Bot,
  Calendar,
  PhoneCall,
  Copy,
  CheckSquare,
  Square,
  Image as ImageIcon,
  ChevronDown,
  Paperclip,
  Radio,
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { getPersonalityBorder } from '@/lib/personalityBorder';
import { Message, ActivityUser } from '@/hooks/useChat';

interface ChatTabProps {
  messages: Message[];
  currentUserId: string;
  isHostOrAdmin?: boolean;
  typingUsers?: ActivityUser[];
  recordingUsers?: ActivityUser[];
  onSendMessage: (msg: string) => void;
  onSendVoiceMessage?: (audioBase64: string, durationSec: number) => void;
  onSendMediaMessage?: (mediaDataUrl: string, mediaType: 'image' | 'gif', caption?: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessages?: (messageIds: string[], deleteForEveryone: boolean, isAdminOrHost: boolean) => void;
  onPurgeDateMessages?: (dateStr: string, isAdminOrHost: boolean) => void;
  onBroadcastTyping?: (isTyping: boolean) => void;
  onBroadcastRecording?: (isRecording: boolean) => void;
  onOpenCallModal?: () => void;
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

// Helper: Format message timestamp (e.g. 10:45 AM)
function formatMessageTime(dateIso?: string) {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: Get Date Label (Today, Yesterday, Tomorrow, or formatted)
function getRelativeDateLabel(dateKey: string) {
  const today = new Date();
  const target = new Date(`${dateKey}T00:00:00`);

  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateKey === todayStr) return 'Today';
  if (dateKey === yesterdayStr) return 'Yesterday';
  if (dateKey === tomorrowStr) return 'Tomorrow';

  return target.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// -------------------------------------------------------------
// MAIN CHAT TAB COMPONENT
// -------------------------------------------------------------
export default function ChatTab({
  messages,
  currentUserId,
  isHostOrAdmin = false,
  typingUsers = [],
  recordingUsers = [],
  onSendMessage,
  onSendVoiceMessage,
  onSendMediaMessage,
  onEditMessage,
  onDeleteMessages,
  onPurgeDateMessages,
  onBroadcastTyping,
  onBroadcastRecording,
  onOpenCallModal,
  disabled,
}: ChatTabProps) {
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Multi-Select Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  // Date Jump Dropdown State
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  // WhatsApp Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Typing debounce timer
  const typingDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group messages chronologically by calendar date
  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    messages.forEach((msg) => {
      const dateKey = (msg.created_at || new Date().toISOString()).split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  }, [messages]);

  const distinctDates = useMemo(() => Object.keys(groupedMessages).sort(), [groupedMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isSelectMode) {
      scrollToBottom();
    }
  }, [messages.length, isRecording, isSelectMode]);

  // Jump to specific date divider
  const scrollToDate = (dateKey: string) => {
    setShowDateDropdown(false);
    const targetElement = document.getElementById(`date-marker-${dateKey}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle typing status broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!onBroadcastTyping) return;

    onBroadcastTyping(true);
    if (typingDebounceTimer.current) clearTimeout(typingDebounceTimer.current);
    typingDebounceTimer.current = setTimeout(() => {
      onBroadcastTyping(false);
    }, 2500);
  };

  // Handle Text Message Submit
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      audioEngine.playClick();
      onSendMessage(input.trim());
      setInput('');
      if (typingDebounceTimer.current) clearTimeout(typingDebounceTimer.current);
      onBroadcastTyping?.(false);
    }
  };

  // -------------------------------------------------------------
  // KEYBOARD CLIPBOARD PASTE (GIFs / IMAGES / STICKERS)
  // -------------------------------------------------------------
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const isGif = file.type.includes('gif');
            if (onSendMediaMessage && dataUrl) {
              onSendMediaMessage(dataUrl, isGif ? 'gif' : 'image', input.trim() || undefined);
              setInput('');
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Handle file picker selection (images/stickers/gifs)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const isGif = file.type.includes('gif');
      if (onSendMediaMessage && dataUrl) {
        onSendMediaMessage(dataUrl, isGif ? 'gif' : 'image');
      }
    };
    reader.readAsDataURL(file);
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
      onBroadcastRecording?.(true);
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
      onBroadcastRecording?.(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      audioEngine.playSelect();
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      onBroadcastRecording?.(false);
      audioChunksRef.current = [];
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      audioEngine.playClick();
    }
  };

  // -------------------------------------------------------------
  // EDIT & DELETE HANDLERS
  // -------------------------------------------------------------
  const handleStartEdit = (msg: Message) => {
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

  const handleSingleDelete = (msg: Message) => {
    if (onDeleteMessages) {
      const isMyMessage = msg.sender_id === currentUserId;
      onDeleteMessages([msg.id], isMyMessage || isHostOrAdmin, isHostOrAdmin);
      setActiveMenuId(null);
    }
  };

  // Multi-Select Toggle
  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedMessageIds(messages.map((m) => m.id));
  };

  const handleDeleteSelected = () => {
    if (selectedMessageIds.length === 0 || !onDeleteMessages) return;
    onDeleteMessages(selectedMessageIds, true, isHostOrAdmin);
    setIsSelectMode(false);
    setSelectedMessageIds([]);
  };

  const handleCopySelected = () => {
    const selectedText = messages
      .filter((m) => selectedMessageIds.includes(m.id) && m.message)
      .map((m) => `${m.sender_name}: ${m.message}`)
      .join('\n');

    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      setIsSelectMode(false);
      setSelectedMessageIds([]);
    }
  };

  // Confirm and execute date purge
  const confirmDatePurge = (dateStr: string) => {
    if (onPurgeDateMessages) {
      onPurgeDateMessages(dateStr, isHostOrAdmin);
    }
    setDateToDelete(null);
    setShowDateDropdown(false);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 border border-white/10 rounded-xl backdrop-blur-xl overflow-hidden select-none relative">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER: NORMAL BAR OR MULTI-SELECT ACTION BAR              */}
      {/* ------------------------------------------------------------- */}
      {isSelectMode ? (
        /* Multi-Select Action Bar */
        <div className="p-2.5 sm:p-3 bg-red-950/80 border-b border-red-600/40 flex items-center justify-between text-white animate-fade-in">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedMessageIds([]);
              }}
              className="p-1 rounded text-zinc-300 hover:text-white"
            >
              <X size={18} />
            </button>
            <span className="text-xs font-bold font-mono">
              {selectedMessageIds.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-2 py-1 rounded bg-black/40 hover:bg-black/60 text-[11px] font-semibold border border-white/10"
            >
              Select All
            </button>
            <button
              onClick={handleCopySelected}
              disabled={selectedMessageIds.length === 0}
              className="p-1.5 rounded bg-black/40 hover:bg-black/60 disabled:opacity-40"
              title="Copy Selected"
            >
              <Copy size={15} />
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedMessageIds.length === 0}
              className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-40 text-xs font-bold flex items-center gap-1 shadow-md shadow-red-950"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard WhatsApp-Style Header */
        <div className="p-2 sm:p-2.5 border-b border-white/10 bg-black/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <h3 className="text-xs uppercase tracking-widest font-black text-red-500 font-mono">
              Live Deliberation
            </h3>
          </div>

          {/* Center / Right Controls: Date Jump Dropdown & Live Audio Call */}
          <div className="flex items-center gap-1.5">
            {/* Date Jump Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDateDropdown((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-zinc-500 text-[11px] font-mono text-zinc-300 transition-colors shadow"
                title="Jump to date in chat"
              >
                <Calendar size={12} className="text-red-400" />
                <span>Dates</span>
                <ChevronDown size={11} className="text-zinc-400" />
              </button>

              {/* Date Dropdown Popover */}
              <AnimatePresence>
                {showDateDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-0 top-8 z-50 w-56 bg-zinc-950 border border-red-600/40 rounded-xl shadow-2xl p-2 backdrop-blur-xl"
                  >
                    <div className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>Jump to Timeline</span>
                      {isHostOrAdmin && (
                        <span className="text-[9px] text-red-400">Hold to delete</span>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                      {distinctDates.length === 0 ? (
                        <div className="text-xs text-zinc-500 text-center py-2">
                          No message dates yet.
                        </div>
                      ) : (
                        distinctDates.map((dateKey) => (
                          <div
                            key={dateKey}
                            onClick={() => scrollToDate(dateKey)}
                            onContextMenu={(e) => {
                              if (isHostOrAdmin) {
                                e.preventDefault();
                                setDateToDelete(dateKey);
                              }
                            }}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-red-950/50 hover:text-white cursor-pointer transition-colors group"
                          >
                            <span className="font-medium">
                              {getRelativeDateLabel(dateKey)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ({groupedMessages[dateKey]?.length || 0})
                              </span>
                              {isHostOrAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDateToDelete(dateKey);
                                  }}
                                  className="p-1 rounded text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete entire date history"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Request Live Audio Call Button */}
            {onOpenCallModal && (
              <button
                type="button"
                onClick={onOpenCallModal}
                disabled={disabled}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-[11px] font-bold shadow-md shadow-red-900/40 transition-all"
                title="Start a live group audio call"
              >
                <PhoneCall size={12} />
                <span className="hidden sm:inline">Live Call</span>
              </button>
            )}

            {/* Multi-Select Trigger */}
            <button
              type="button"
              onClick={() => setIsSelectMode(true)}
              className="p-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              title="Select Messages"
            >
              <CheckSquare size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Date Purge Confirmation Modal */}
      <AnimatePresence>
        {dateToDelete && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-red-600 rounded-2xl p-4 max-w-xs w-full text-center shadow-2xl">
              <h4 className="text-sm font-bold text-red-500 mb-2">Delete Date History?</h4>
              <p className="text-xs text-zinc-300 mb-4">
                Are you sure you want to permanently delete all messages from{' '}
                <strong>{getRelativeDateLabel(dateToDelete)}</strong>? This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDateToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDatePurge(dateToDelete)}
                  className="flex-1 py-2 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-600 shadow"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 2. LIVE TYPING & RECORDING STATUS SUBHEADER                   */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {(typingUsers.length > 0 || recordingUsers.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-1 bg-red-950/30 border-b border-red-600/20 text-[10px] font-mono flex items-center gap-2 text-zinc-300 overflow-hidden"
          >
            {recordingUsers.length > 0 ? (
              <div className="flex items-center gap-1.5 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>
                  {recordingUsers.map((u) => u.name).join(', ')}{' '}
                  {recordingUsers.length === 1 ? 'is' : 'are'} recording audio...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce" />
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce delay-100" />
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce delay-200" />
                </span>
                <span>
                  {typingUsers.map((u) => u.name).join(', ')}{' '}
                  {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 3. MESSAGE STREAM WITH DYNAMIC DATE DIVIDERS                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {distinctDates.map((dateKey) => (
          <div key={dateKey} className="space-y-3">
            {/* Sticky Date Divider */}
            <div
              id={`date-marker-${dateKey}`}
              className="flex justify-center sticky top-0 z-10 py-1"
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-300 bg-black/70 border border-white/10 px-3 py-0.5 rounded-full shadow-md backdrop-blur-md">
                {getRelativeDateLabel(dateKey)}
              </span>
            </div>

            {/* Messages for this date */}
            {groupedMessages[dateKey]?.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              const isSystem = msg.message_type === 'system';
              const isSelected = selectedMessageIds.includes(msg.id);

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-1.5">
                    <span className="text-[11px] font-mono text-red-300 bg-red-950/40 border border-red-900/40 px-3 py-1 rounded-full text-center">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              // Read ticks logic:
              // is_delivered === true -> double check
              // read_by has other players -> double blue check
              const isReadByOthers =
                isMe &&
                Array.isArray(msg.read_by) &&
                msg.read_by.some((uid) => uid !== currentUserId);
              const isDelivered = msg.is_delivered ?? true;

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    if (isSelectMode) toggleSelectMessage(msg.id);
                  }}
                  className={`flex items-start gap-2 group transition-all ${
                    isSelectMode ? 'cursor-pointer' : ''
                  } ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Select Checkbox in Multi-Select Mode */}
                  {isSelectMode && (
                    <div className="pt-2">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-red-500" />
                      ) : (
                        <Square size={16} className="text-zinc-600" />
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                    {/* Sender Name & Avatar */}
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        <div
                          className={`w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border ${getPersonalityBorder(
                            msg.personality || 'Leader'
                          )}`}
                        >
                          {msg.sender_avatar && !msg.sender_avatar.startsWith('bot_prompt:') ? (
                            <img src={msg.sender_avatar} alt="" className="w-full h-full object-cover" />
                          ) : msg.sender_name?.toLowerCase().includes('bot') ||
                            msg.sender_name?.startsWith('[BOT]') ? (
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
                      className={`relative px-3.5 py-2 rounded-2xl shadow-lg transition-all ${
                        isSelected ? 'ring-2 ring-red-500' : ''
                      } ${
                        isMe
                          ? 'bg-gradient-to-r from-red-800 to-red-950 text-white rounded-tr-xs border border-red-700/50'
                          : 'bg-zinc-900/90 text-zinc-200 rounded-tl-xs border border-white/10'
                      }`}
                    >
                      {/* Media (GIF / Image / Sticker) */}
                      {(msg.message_type === 'image' || msg.message_type === 'gif') && msg.media_url && (
                        <div className="mb-2 rounded-xl overflow-hidden max-w-xs border border-white/10">
                          <img
                            src={msg.media_url}
                            alt=""
                            className="w-full max-h-64 object-cover cursor-pointer"
                            onClick={() => window.open(msg.media_url, '_blank')}
                          />
                        </div>
                      )}

                      {/* Voice Note */}
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
                        /* Full Markdown Message Typography */
                        <div className="text-xs sm:text-sm leading-relaxed break-words markdown-body">
                          <ReactMarkdown>{msg.message || ''}</ReactMarkdown>
                        </div>
                      )}

                      {/* Bubble Footer: Timestamp & Read Status Ticks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-zinc-400">
                        {msg.is_edited && <span className="italic mr-1">(edited)</span>}
                        <span>{formatMessageTime(msg.created_at)}</span>

                        {/* WhatsApp-Style Read Ticks (For My Messages) */}
                        {isMe && (
                          <span className="ml-1 inline-flex items-center">
                            {isReadByOthers ? (
                              <CheckCheck size={13} className="text-sky-400" title="Read by participants" />
                            ) : isDelivered ? (
                              <CheckCheck size={13} className="text-zinc-400" title="Delivered to room" />
                            ) : (
                              <Check size={12} className="text-zinc-400" title="Sent" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Context Menu Trigger for My Messages */}
                      {!isSelectMode && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === msg.id ? null : msg.id)
                            }
                            className="p-0.5 rounded text-zinc-300 hover:text-white"
                          >
                            <MoreVertical size={13} />
                          </button>

                          {activeMenuId === msg.id && (
                            <div className="absolute right-0 top-5 z-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1 w-28 text-xs">
                              {isMe && msg.message_type === 'text' && (
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="flex items-center gap-1.5 w-full px-2 py-1 text-zinc-200 hover:bg-zinc-800 rounded text-left"
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (msg.message) navigator.clipboard.writeText(msg.message);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-1.5 w-full px-2 py-1 text-zinc-200 hover:bg-zinc-800 rounded text-left"
                              >
                                <Copy size={11} /> Copy
                              </button>
                              <button
                                onClick={() => {
                                  setIsSelectMode(true);
                                  setSelectedMessageIds([msg.id]);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-1.5 w-full px-2 py-1 text-zinc-200 hover:bg-zinc-800 rounded text-left"
                              >
                                <CheckSquare size={11} /> Select
                              </button>
                              {(isMe || isHostOrAdmin) && (
                                <button
                                  onClick={() => handleSingleDelete(msg)}
                                  className="flex items-center gap-1.5 w-full px-2 py-1 text-red-400 hover:bg-red-950/40 rounded text-left"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. INPUT BAR: VOICE RECORDING OR MULTIMODAL TEXT INPUT        */}
      {/* ------------------------------------------------------------- */}
      <div className="p-2 sm:p-2.5 bg-black/60 border-t border-white/10">
        <AnimatePresence mode="wait">
          {isRecording ? (
            /* WhatsApp-Style Active Recording Bar */
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-between gap-3 bg-red-950/70 border border-red-600 rounded-full px-4 py-2"
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
            /* Standard Text, Media & Voice Input Form */
            <motion.form
              key="input"
              onSubmit={handleSend}
              className="flex items-center gap-2"
            >
              {/* Media File Attachment Trigger */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                title="Send Photo, Sticker or GIF"
              >
                <Paperclip size={18} />
              </button>

              {/* Main Input supporting Markdown, Emojis, and Clipboard Pastes */}
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onPaste={handlePaste}
                disabled={disabled}
                placeholder={
                  disabled
                    ? 'Curfew active. Shh...'
                    : 'Type a message (Markdown supported) or paste GIF...'
                }
                className="flex-1 bg-black/60 border border-white/15 rounded-full px-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-40"
                maxLength={600}
              />

              {/* Instant WhatsApp Voice Note Button */}
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
