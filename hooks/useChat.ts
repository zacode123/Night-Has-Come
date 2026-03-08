import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
      setMessages(data || []);
    };

    fetchMessages();

    const sub = supabase
      .channel(`room:${roomId}:messages`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, payload => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [roomId]);

  return { messages };
}
