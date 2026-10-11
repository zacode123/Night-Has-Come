'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  personality?: string;
  message?: string;
  message_type?: 'text' | 'voice' | 'system' | 'game_event';
  audio_url?: string;
  audio_duration?: number;
  created_at: string;
  is_edited?: boolean;
  is_deleted?: boolean;
}

export function useChat(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (data && data.length > 0) {
          setMessages(data as Message[]);
        }
      } catch (err) {
        console.warn('Initial chat fetch failed, using local room state:', err);
      }
    };

    fetchMessages();

    // Subscribe to chat channel updates
    const channel = supabase.channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .on(
        'broadcast',
        { event: 'client_message' },
        ({ payload }) => {
          const msg = payload as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .on(
        'broadcast',
        { event: 'client_message_edit' },
        ({ payload }) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.id ? { ...m, message: payload.message, is_edited: true } : m))
          );
        }
      )
      .on(
        'broadcast',
        { event: 'client_message_delete' },
        ({ payload }) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.id ? { ...m, is_deleted: true } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentUserId) return;

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
    };

    // Optimistic local update
    setMessages((prev) => [...prev, newMsg]);

    // Broadcast via Realtime channel
    const channel = supabase.channel(`chat:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'client_message',
      payload: newMsg,
    });

    // Persist via API
    try {
      await fetch('/api/send-message', {
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
    } catch (e) {
      console.warn('API send message non-fatal error:', e);
    }
  };

  const sendVoiceMessage = async (audioBase64: string, durationSec: number) => {
    if (!audioBase64 || !currentUserId) return;

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
    };

    setMessages((prev) => [...prev, newMsg]);

    const channel = supabase.channel(`chat:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'client_message',
      payload: newMsg,
    });

    try {
      await fetch('/api/send-message', {
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
    } catch (e) {
      console.warn('API send voice non-fatal error:', e);
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, message: newText, is_edited: true } : m))
    );

    const channel = supabase.channel(`chat:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'client_message_edit',
      payload: { id: messageId, message: newText },
    });
  };

  const deleteMessage = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true } : m))
    );

    const channel = supabase.channel(`chat:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'client_message_delete',
      payload: { id: messageId },
    });
  };

  return {
    messages,
    sendMessage,
    sendVoiceMessage,
    editMessage,
    deleteMessage,
  };
}
