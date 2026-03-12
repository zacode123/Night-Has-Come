import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { hostId } = await request.json();

    if (!hostId) {
      return NextResponse.json(
        { error: 'Host ID is required' },
        { status: 400 }
      );
    }

    const room = await createRoom(hostId);

    return NextResponse.json({
      roomId: room.id,
      roomCode: room.room_code
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
