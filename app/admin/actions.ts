'use server';  
  
import { cookies } from 'next/headers';  
import { getServiceSupabase } from '@/lib/supabaseClient';  
  
const supabaseAdmin = getServiceSupabase();  
  
/* ---------------- ADMIN AUTH ---------------- */  
  
export async function loginAdmin(username: string, password: string) {  
  const validUsername = process.env.ADMIN_USERNAME || 'admin';  
  const validPassword = process.env.ADMIN_PASSWORD || 'password123';  
  
  if (username === validUsername && password === validPassword) {  
    const cookieStore = await cookies();  
    cookieStore.set('admin_session', 'true', {  
      httpOnly: true,  
      secure: process.env.NODE_ENV === 'production',  
    });  
  
    return { success: true };  
  }  
  
  return { success: false };  
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

  // 1️⃣ Check for a waiting room
  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('status', 'waiting');

  if (roomsError) {
    console.error('Error fetching rooms:', roomsError);
    return { success: false, error: roomsError.message };
  }

  let roomId = rooms?.[0]?.id;

  // 2️⃣ Create a room if none exists
  if (!roomId) {
    const { data: newRoom, error: roomError } = await supabaseAdmin
      .from('rooms')
      .insert({
        room_code: crypto.randomUUID().substring(0, 6).toUpperCase(),
        status: 'waiting',
        phase: 'Lobby',
        day_number: 0,
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return { success: false, error: roomError.message };
    }

    roomId = newRoom?.id;
  }

  if (!roomId) {
    console.error('Room ID not available after creation');
    return { success: false, error: 'Room creation failed' };
  }

  // 3️⃣ Check if this is the first player in the room
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

  // 4️⃣ Approve the player
  const { error: playerError } = await supabaseAdmin
    .from('players')
    .update({ status: 'approved', room_id: roomId })
    .eq('id', playerId);

  if (playerError) {
    console.error('Error approving player:', playerError);
    return { success: false, error: playerError.message };
  }

  return { success: true, roomId };

  
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
