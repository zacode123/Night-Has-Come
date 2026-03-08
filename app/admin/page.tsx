'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const fetchData = async () => {
    const { data: pData } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (pData) setPlayers(pData);
    
    const { data: rData } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
    if (rData) setRooms(rData);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const approvePlayer = async (playerId: string) => {
    // Find an active room or create one
    let roomId = rooms.find(r => r.status === 'waiting')?.id;
    
    if (!roomId) {
      const { data: newRoom } = await supabase
        .from('rooms')
        .insert({ room_code: crypto.randomUUID().substring(0, 6).toUpperCase(), status: 'waiting', phase: 'Lobby', day_number: 0 })
        .select()
        .single();
      if (newRoom) roomId = newRoom.id;
    }

    if (roomId) {
      // If this is the first player in the room, make them host
      const isFirst = !players.some(p => p.room_id === roomId);
      if (isFirst) {
        await supabase.from('rooms').update({ host_id: playerId }).eq('id', roomId);
      }

      await supabase
        .from('players')
        .update({ status: 'approved', room_id: roomId })
        .eq('id', playerId);
      fetchData();
    }
  };

  const rejectPlayer = async (playerId: string) => {
    await supabase
      .from('players')
      .update({ status: 'rejected' })
      .eq('id', playerId);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
        <div className="space-y-4">
          {players.filter(p => p.status === 'pending').map(player => (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
              <div>
                <p className="font-medium text-lg">{player.username}</p>
                <p className="text-sm text-gray-400">Personality: {player.personality}</p>
              </div>
              <div className="space-x-2">
                <button onClick={() => approvePlayer(player.id)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-medium">Approve</button>
                <button onClick={() => rejectPlayer(player.id)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-medium">Reject</button>
              </div>
            </div>
          ))}
          {players.filter(p => p.status === 'pending').length === 0 && (
            <p className="text-gray-400">No pending players.</p>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Approved Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.filter(p => p.status === 'approved').map(player => (
            <div key={player.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-medium">{player.username}</p>
              <p className="text-sm text-gray-400">Room: {player.room_id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
