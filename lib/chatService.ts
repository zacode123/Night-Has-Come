import { supabase } from './supabaseClient';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'system' | 'game_event';
  created_at: string;
}

export const ChatService = {
  async sendMessage(roomId: string, senderId: string, senderName: string, message: string) {
    if (message.length > 500) {
      throw new Error('Message too long');
    }

    // Rate limiting logic could be implemented here or in the API route
    // For now, we'll assume basic validation

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        sender_name: senderName,
        message: message,
        message_type: 'text'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMessages(roomId: string, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.reverse(); // Return in chronological order
  },

  async sendSystemMessage(roomId: string, message: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: 'system', // Special ID for system
        sender_name: 'System',
        message: message,
        message_type: 'system'
      });

    if (error) throw error;
    return data;
  }
};
