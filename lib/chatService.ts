import { supabase } from './supabaseClient';

export class ChatService {
  static async sendMessage(roomId: string, senderId: string, senderName: string, message: string, type: string = 'text') {
    if (message.length > 500) return { error: 'Message too long' };

    const { data, error } = await supabase
      .from('messages')
      .insert([
        { room_id: roomId, sender_id: senderId, sender_name: senderName, message, message_type: type }
      ]);
    return { data, error };
  }

  static subscribeToMessages(roomId: string, callback: (message: any) => void) {
    return supabase
      .channel(`room:${roomId}:messages`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => callback(payload.new as any)
      )
      .subscribe();
  }
}
