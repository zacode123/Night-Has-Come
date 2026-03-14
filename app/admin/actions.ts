'use server';  

import { cookies } from 'next/headers';  
import { getServiceSupabase } from '@/lib/supabaseClient';  
  
const supabaseAdmin = getServiceSupabase();  
  
/* ---------------- ADMIN AUTH ---------------- */  
  
export async function loginAdmin(username: string, password: string) {  
  const hashedUsername = process.env.ADMIN_USERNAME;  
  const hashedPassword = process.env.ADMIN_PASSWORD;
  
  if (hash(username) === hashedUsername && hash(password) === hashedPassword) {  
    const cookieStore = await cookies();  
    cookieStore.set('admin_session', 'true', {  
      httpOnly: true,  
      secure: process.env.NODE_ENV === 'production',  
    });  
  
    return { success: true };  
  }  
  
  return { success: false };  
}  

async function hash(d: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(d);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export async function logoutAdmin() {  
  const cookieStore = await cookies();  
  cookieStore.delete('admin_session');  
}  
  
export async function checkAdminStatus() {  
  const cookieStore = await cookies();  
  return cookieStore.has('admin_session');  
}  
  
/* ---------------- PLAYER MANAGEMENT ---------------- */  
  
async function ensureAdmin() {  
  const cookieStore = await cookies();  
  if (!cookieStore.has('admin_session')) {  
    throw new Error('Unauthorized');  
  }  
}  
  
export async function approvePlayer(playerId: string) {
  await ensureAdmin();
  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('status', 'waiting');

  if (roomsError) {
    console.error('Error fetching rooms:', roomsError);
    return { success: false, error: roomsError.message };
  }

  let roomId = rooms?.[0]?.id;

  if (!roomId) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostId: playerId
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Error creating room:', result.error);
      return { success: false, error: result.error };
    }
    roomId = result.roomId;
  }

  if (!roomId) {
    console.error('Room ID not available after creation');
    return { success: false, error: 'Room creation failed' };
  }
  
  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('*')
    .eq('room_id', roomId);

  if (playersError) {
    console.error('Error fetching players in room:', playersError);
    return { success: false, error: playersError.message };
  }

  const isFirst = !players || players.length === 0;

  if (isFirst) {
    const { error: hostError } = await supabaseAdmin
      .from('rooms')
      .update({ host_id: playerId })
      .eq('id', roomId);

    if (hostError) {
      console.error('Error setting host:', hostError);
      return { success: false, error: hostError.message };
    }
  }
  const { error: playerError } = await supabaseAdmin
    .from('players')
    .update({ status: 'approved', room_id: roomId })
    .eq('id', playerId);

  if (playerError) {
    console.error('Error approving player:', playerError);
    return { success: false, error: playerError.message };
  }

  return { success: true, roomId };
}

  
export async function rejectPlayer(playerId: string) {  
  await ensureAdmin();  
  
  await supabaseAdmin  
    .from('players')  
    .update({  
      status: 'rejected',  
      room_id: null  
    })  
    .eq('id', playerId);  
  
  return { success: true };  
}  
  
export async function deletePlayer(playerId: string) {  
  await ensureAdmin();  
  
  await supabaseAdmin  
    .from('players')  
    .delete()  
    .eq('id', playerId);  
  
  return { success: true };  
}  

/* ---------------- GAME ---------------- */  
  
export async function startGame(roomId: string) {  
  await ensureAdmin();  
  
  const { data: players } = await supabaseAdmin  
    .from('players')  
    .select('*')  
    .eq('room_id', roomId)  
    .eq('status', 'approved');  
  
  if (!players || players.length < 3) {  
    return { success: false };  
  }  
  
  await supabaseAdmin  
    .from('rooms')  
    .update({  
      status: 'in_game',  
      phase: 'Night',  
      day_number: 1  
    })  
    .eq('id', roomId);  
  
  return { success: true };  
}  
