import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  const { roomId, senderId, senderName, message } = await request.json();

  if (!roomId || !senderId || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (message.length > 500) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
