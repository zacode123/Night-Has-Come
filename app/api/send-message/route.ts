import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const supabase = getServiceSupabase();
    const {
      roomId,
      senderId,
      senderName,
      message,
      messageType = 'text',
      audioUrl,
      audioDuration,
      mediaUrl,
    } = await request.json();

    if (!roomId || !senderId || (!message && !audioUrl && !mediaUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload: any = {
      room_id: roomId,
      sender_id: senderId,
      sender_name: senderName || 'Student',
      message: message || '',
      message_type: messageType,
      read_by: [senderId],
    };

    if (audioUrl) {
      payload.audio_url = audioUrl;
      payload.audio_duration = audioDuration || 3;
    }

    if (mediaUrl) {
      payload.media_url = mediaUrl;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      // Fallback in case table has basic columns
      const fallbackPayload: any = {
        room_id: roomId,
        sender_id: senderId,
        sender_name: senderName || 'Student',
        message: message || (mediaUrl ? '[Image/GIF]' : '🎤 Voice Note'),
        message_type: messageType,
      };
      if (audioUrl) fallbackPayload.audio_url = audioUrl;

      const { data: fallbackData } = await supabase
        .from('messages')
        .insert(fallbackPayload)
        .select()
        .maybeSingle();

      return NextResponse.json(fallbackData || payload);
    }

    return NextResponse.json(data || payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
