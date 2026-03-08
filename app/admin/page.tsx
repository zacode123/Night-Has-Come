'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loginAdmin, logoutAdmin, checkAdminStatus } from './actions';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const status = await checkAdminStatus();
      setIsLoggedIn(status);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const result = await loginAdmin(username, password);
    if (result.success) {
      setIsLoggedIn(true);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsLoggedIn(false);
  };

  const fetchData = async () => {
    if (!isLoggedIn) return;
    const { data: pData } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (pData) setPlayers(pData);
    
    const { data: rData } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
    if (rData) setRooms(rData);
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">Admin Login</h1>
          {loginError && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm text-center">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
        >
          Logout
        </button>
      </div>
      
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
