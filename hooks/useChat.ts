import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'system' | 'game_event';
  created_at: string;
}

export function useChat(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase.channel(`chat:${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentUserId) return;

    const { data: player } = await supabase
      .from('players')
      .select('username')
      .eq('id', currentUserId)
      .single();

    if (!player) return;

    await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: currentUserId,
        sender_name: player.username,
        message: text.trim(),
        message_type: 'text'
      });
  };

  return { messages, sendMessage };
}
