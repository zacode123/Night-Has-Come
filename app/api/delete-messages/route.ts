import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const supabase = getServiceSupabase();
    const {
      roomId,
      messageIds,
      date, // 'YYYY-MM-DD'
      requesterId,
      isAdminOrHost = false,
    } = await request.json();

    if (!roomId || !requesterId) {
      return NextResponse.json({ error: 'Missing roomId or requesterId' }, { status: 400 });
    }

    // Case 1: Bulk delete specific message IDs
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      let query = supabase
        .from('messages')
        .delete()
        .eq('room_id', roomId)
        .in('id', messageIds);

      // If not host/admin, only allow deleting messages sent by requester
      if (!isAdminOrHost) {
        query = query.eq('sender_id', requesterId);
      }

      const { data, error } = await query.select('id');
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        deletedIds: data ? data.map((d: any) => d.id) : messageIds,
      });
    }

    // Case 2: Purge all messages from a specific calendar date (Admin or Host only)
    if (date) {
      if (!isAdminOrHost) {
        return NextResponse.json(
          { error: 'Unauthorized: Only room host or admin can delete date history' },
          { status: 403 }
        );
      }

      // Calculate start and end UTC timestamps for the target date
      const startOfDay = new Date(`${date}T00:00:00.000Z`).toISOString();
      const endOfDay = new Date(`${date}T23:59:59.999Z`).toISOString();

      const { data, error } = await supabase
        .from('messages')
        .delete()
        .eq('room_id', roomId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .select('id');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        purgedDate: date,
        deletedIds: data ? data.map((d: any) => d.id) : [],
      });
    }

    return NextResponse.json({ error: 'No messageIds or date provided' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
