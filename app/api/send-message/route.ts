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
    } = await request.json();

    if (!roomId || !senderId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload: any = {
      room_id: roomId,
      sender_id: senderId,
      sender_name: senderName || 'Student',
      message: message,
      message_type: messageType,
    };

    if (audioUrl) {
      payload.audio_url = audioUrl;
      payload.audio_duration = audioDuration || 3;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      // If table lacks audio_url column, retry with basic fields
      const { data: fallbackData } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          sender_name: senderName || 'Student',
          message: message,
          message_type: 'text',
        })
        .select()
        .maybeSingle();

      return NextResponse.json(fallbackData || payload);
    }

    return NextResponse.json(data || payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
