'use server';

import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabaseClient';

const supabaseAdmin = getServiceSupabase();

/* ---------------- HASH ---------------- */

async function hash(d: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(d);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------------- ADMIN AUTH ---------------- */

export async function loginAdmin(username: string, password: string) {
  const hashedUsername = process.env.ADMIN_USERNAME;
  const hashedPassword = process.env.ADMIN_PASSWORD;

  const usernameHash = await hash(username);
  const passwordHash = await hash(password);

  if (usernameHash === hashedUsername && passwordHash === hashedPassword) {
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

async function ensureAdmin() {
  const cookieStore = await cookies();
  if (!cookieStore.has('admin_session')) {
    throw new Error('Unauthorized');
  }
}

/* ---------------- PLAYER MANAGEMENT ---------------- */

export async function approvePlayer(playerId: string, roomId: string) {
  await ensureAdmin();

  const { error } = await supabaseAdmin
    .from('players')
    .update({
      status: 'approved',
      room_id: roomId
    })
    .eq('id', playerId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function rejectPlayer(playerId: string) {
  await ensureAdmin();

  const { error } = await supabaseAdmin
    .from('players')
    .update({
      status: 'rejected',
      room_id: null
    })
    .eq('id', playerId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePlayer(playerId: string) {
  await ensureAdmin();

  const { error } = await supabaseAdmin
    .from('players')
    .delete()
    .eq('id', playerId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ---------------- ROOM MANAGEMENT ---------------- */

export async function createRoom(name: string) {
  await ensureAdmin();
  const room_code = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .insert({
      name,
      room_code,
      status: 'waiting'
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, room: data };
}

export async function renameRoom(roomId: string, name: string) {
  await ensureAdmin();

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ name })
    .eq('id', roomId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function deleteRoom(roomId: string) {
  await ensureAdmin();

  // remove players first
  await supabaseAdmin
    .from('players')
    .update({ room_id: null })
    .eq('room_id', roomId);

  const { error } = await supabaseAdmin
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

/* ---------------- GAME ---------------- */

export async function startGame(roomId: string) {
  await ensureAdmin();

  // 1. Fetch the room's current status along with the approved players
  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('status')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    return { success: false, error: 'Room not found' };
  }

  // 2. Prevent starting a game that is already running
  if (room.status === 'in_game') {
    return { success: false, error: 'Cannot start a running game' };
  }

  const { data: players } = await supabaseAdmin
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'approved');

  if (!players || players.length < 3) {
    return { success: false, error: 'Not enough players' };
  }

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({
      status: 'in_game',
      phase: 'DAY',
      day_number: 1
    })
    .eq('id', roomId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function stopGame(roomId: string) {
  await ensureAdmin();

  try {
    // 1. Fetch the room's current status
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return { success: false, error: 'Room not found' };
    }

    // 2. Prevent stopping a game that is already waiting
    if (room.status === 'waiting') {
      return { success: false, error: 'Cannot stop a waiting game' };
    }

    // 3. Reset the room back to waiting
    await supabaseAdmin
      .from('rooms')
      .update({
        status: 'waiting',
        phase: null,
        day_number: null
      })
      .eq('id', roomId);

    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
