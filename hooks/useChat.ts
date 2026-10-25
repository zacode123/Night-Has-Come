'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  personality?: string;
  message?: string;
  message_type?: 'text' | 'voice' | 'image' | 'gif' | 'system' | 'game_event';
  audio_url?: string;
  audio_duration?: number;
  media_url?: string;
  created_at: string;
  is_edited?: boolean;
  read_by?: string[];
  is_delivered?: boolean;
}

export interface ActivityUser {
  id: string;
  name: string;
}

export function useChat(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<ActivityUser[]>([]);
  const [recordingUsers, setRecordingUsers] = useState<ActivityUser[]>([]);

  const typingTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const recordingTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const channelRef = useRef<any>(null);

  // Helper to fetch current player identity
  const getSenderDetails = useCallback(async () => {
    try {
      const { data: player } = await supabase
        .from('players')
        .select('username, avatar_base64, personality')
        .eq('id', currentUserId)
        .maybeSingle();

      return {
        username: player?.username || 'Student',
        avatar: player?.avatar_base64 || null,
        personality: player?.personality || 'Leader',
      };
    } catch {
      return { username: 'Student', avatar: null, personality: 'Leader' };
    }
  }, [currentUserId]);

  // Mark all unread messages as seen by current user
  const markMessagesAsSeen = useCallback(
    (messageList: Message[]) => {
      if (!currentUserId || !channelRef.current) return;
      const unreadIds = messageList
        .filter((m) => m.sender_id !== currentUserId && (!m.read_by || !m.read_by.includes(currentUserId)))
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'read_receipt',
          payload: { readerId: currentUserId, messageIds: unreadIds },
        });

        // Optimistically mark seen locally
        setMessages((prev) =>
          prev.map((m) =>
            unreadIds.includes(m.id)
              ? { ...m, read_by: Array.from(new Set([...(m.read_by || []), currentUserId])) }
              : m
          )
        );
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(300);

        if (data && data.length > 0) {
          const loaded = data.map((d: any) => ({
            ...d,
            read_by: Array.isArray(d.read_by) ? d.read_by : [d.sender_id],
            is_delivered: true,
          }));
          setMessages(loaded as Message[]);
          markMessagesAsSeen(loaded);
        }
      } catch (err) {
        console.warn('Initial chat fetch failed:', err);
      }
    };

    fetchMessages();

    // Subscribe to chat channel updates
    const channel = supabase.channel(`chat:${roomId}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev.map((m) => (m.id === newMsg.id ? { ...newMsg, is_delivered: true } : m));
            }
            return [...prev, { ...newMsg, is_delivered: true }];
          });
          if (newMsg.sender_id !== currentUserId) {
            markMessagesAsSeen([newMsg]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .on('broadcast', { event: 'client_message' }, ({ payload }) => {
        const msg = payload as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, is_delivered: true }];
        });
        if (msg.sender_id !== currentUserId) {
          markMessagesAsSeen([msg]);
        }
      })
      .on('broadcast', { event: 'client_message_edit' }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.id ? { ...m, message: payload.message, is_edited: true } : m))
        );
      })
      .on('broadcast', { event: 'client_message_purge' }, ({ payload }) => {
        const ids = payload.messageIds as string[];
        if (Array.isArray(ids)) {
          setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
        }
      })
      .on('broadcast', { event: 'client_date_purge' }, ({ payload }) => {
        const targetDate = payload.date as string;
        if (targetDate) {
          setMessages((prev) => prev.filter((m) => !m.created_at.startsWith(targetDate)));
        }
      })
      .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
        const { id, name, isTyping } = payload;
        if (id === currentUserId) return;

        if (typingTimers.current[id]) clearTimeout(typingTimers.current[id]);

        if (isTyping) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.id === id)) return prev;
            return [...prev, { id, name }];
          });

          // Auto clear after 4 seconds if no heartbeat
          typingTimers.current[id] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.id !== id));
          }, 4000);
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.id !== id));
        }
      })
      .on('broadcast', { event: 'recording_status' }, ({ payload }) => {
        const { id, name, isRecording } = payload;
        if (id === currentUserId) return;

        if (recordingTimers.current[id]) clearTimeout(recordingTimers.current[id]);

        if (isRecording) {
          setRecordingUsers((prev) => {
            if (prev.some((u) => u.id === id)) return prev;
            return [...prev, { id, name }];
          });

          recordingTimers.current[id] = setTimeout(() => {
            setRecordingUsers((prev) => prev.filter((u) => u.id !== id));
          }, 5000);
        } else {
          setRecordingUsers((prev) => prev.filter((u) => u.id !== id));
        }
      })
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        const { readerId, messageIds } = payload;
        if (!Array.isArray(messageIds)) return;

        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m.id)
              ? { ...m, is_delivered: true, read_by: Array.from(new Set([...(m.read_by || []), readerId])) }
              : m
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(typingTimers.current).forEach(clearTimeout);
      Object.values(recordingTimers.current).forEach(clearTimeout);
    };
  }, [roomId, currentUserId, markMessagesAsSeen]);

  // Broadcast typing presence
  const broadcastTyping = async (isTyping: boolean) => {
    if (!channelRef.current || !currentUserId) return;
    const sender = await getSenderDetails();
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: { id: currentUserId, name: sender.username, isTyping },
    });
  };

  // Broadcast voice recording presence
  const broadcastRecording = async (isRecording: boolean) => {
    if (!channelRef.current || !currentUserId) return;
    const sender = await getSenderDetails();
    channelRef.current.send({
      type: 'broadcast',
      event: 'recording_status',
      payload: { id: currentUserId, name: sender.username, isRecording },
    });
  };

  // Send regular text message
  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentUserId) return;

    broadcastTyping(false);
    const sender = await getSenderDetails();
    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId,
      sender_name: sender.username,
      sender_avatar: sender.avatar,
      personality: sender.personality,
      message: text.trim(),
      message_type: 'text',
      created_at: new Date().toISOString(),
      read_by: [currentUserId],
      is_delivered: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'client_message',
      payload: newMsg,
    });

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          senderId: currentUserId,
          senderName: sender.username,
          message: text.trim(),
          messageType: 'text',
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.id, is_delivered: true } : m))
        );
      }
    } catch (e) {
      console.warn('API send message non-fatal error:', e);
    }
  };

  // Send Voice note
  const sendVoiceMessage = async (audioBase64: string, durationSec: number) => {
    if (!audioBase64 || !currentUserId) return;

    broadcastRecording(false);
    const sender = await getSenderDetails();
    const tempId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId,
      sender_name: sender.username,
      sender_avatar: sender.avatar,
      personality: sender.personality,
      message: '🎤 Voice Note',
      message_type: 'voice',
      audio_url: audioBase64,
      audio_duration: durationSec,
      created_at: new Date().toISOString(),
      read_by: [currentUserId],
      is_delivered: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'client_message',
      payload: newMsg,
    });

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          senderId: currentUserId,
          senderName: sender.username,
          message: '🎤 Voice Note',
          messageType: 'voice',
          audioUrl: audioBase64,
          audioDuration: durationSec,
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.id, is_delivered: true } : m))
        );
      }
    } catch (e) {
      console.warn('API send voice non-fatal error:', e);
    }
  };

  // Send Image, Sticker, or Animated GIF
  const sendMediaMessage = async (mediaDataUrl: string, mediaType: 'image' | 'gif', caption?: string) => {
    if (!mediaDataUrl || !currentUserId) return;

    const sender = await getSenderDetails();
    const tempId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUserId,
      sender_name: sender.username,
      sender_avatar: sender.avatar,
      personality: sender.personality,
      message: caption || (mediaType === 'gif' ? 'GIF' : 'Image'),
      message_type: mediaType,
      media_url: mediaDataUrl,
      created_at: new Date().toISOString(),
      read_by: [currentUserId],
      is_delivered: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'client_message',
      payload: newMsg,
    });

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          senderId: currentUserId,
          senderName: sender.username,
          message: caption || (mediaType === 'gif' ? 'GIF' : 'Image'),
          messageType: mediaType,
          mediaUrl: mediaDataUrl,
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.id, is_delivered: true } : m))
        );
      }
    } catch (e) {
      console.warn('API send media non-fatal error:', e);
    }
  };

  // Edit Message
  const editMessage = async (messageId: string, newText: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, message: newText, is_edited: true } : m))
    );

    channelRef.current?.send({
      type: 'broadcast',
      event: 'client_message_edit',
      payload: { id: messageId, message: newText },
    });

    try {
      await supabase
        .from('messages')
        .update({ message: newText, is_edited: true })
        .eq('id', messageId);
    } catch (e) {
      console.warn('DB update message non-fatal error:', e);
    }
  };

  // Bulk Delete Messages (Silent purge - no placeholder!)
  const deleteMessages = async (messageIds: string[], deleteForEveryone: boolean = true, isAdminOrHost: boolean = false) => {
    if (!messageIds || messageIds.length === 0) return;

    // Locally purge immediately
    setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)));

    if (deleteForEveryone) {
      // Broadcast purge to room participants
      channelRef.current?.send({
        type: 'broadcast',
        event: 'client_message_purge',
        payload: { messageIds },
      });

      // Persist purge in database
      try {
        await fetch('/api/delete-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            messageIds,
            requesterId: currentUserId,
            isAdminOrHost,
          }),
        });
      } catch (e) {
        console.warn('API delete-messages non-fatal error:', e);
      }
    }
  };

  // Bulk Purge an Entire Calendar Date (Host / Admin only)
  const purgeDateMessages = async (dateStr: string, isAdminOrHost: boolean = true) => {
    if (!dateStr || !isAdminOrHost) return;

    // Locally purge all messages matching YYYY-MM-DD
    setMessages((prev) => prev.filter((m) => !m.created_at.startsWith(dateStr)));

    channelRef.current?.send({
      type: 'broadcast',
      event: 'client_date_purge',
      payload: { date: dateStr },
    });

    try {
      await fetch('/api/delete-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          date: dateStr,
          requesterId: currentUserId,
          isAdminOrHost: true,
        }),
      });
    } catch (e) {
      console.warn('API purgeDateMessages error:', e);
    }
  };

  return {
    messages,
    typingUsers,
    recordingUsers,
    broadcastTyping,
    broadcastRecording,
    sendMessage,
    sendVoiceMessage,
    sendMediaMessage,
    editMessage,
    deleteMessages,
    purgeDateMessages,
  };
}
