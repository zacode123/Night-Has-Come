'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, getServiceSupabase } from '@/lib/supabaseClient';
import { loginAdmin, logoutAdmin, checkAdminStatus } from './actions';
import { gameConfig } from '@/config/gameConfig';
import { Trash2, Check, X, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    type: 'danger' | 'warning' | 'success';
  }>({
    show: false,
    title: '',
    message: '',
    action: async () => {},
    type: 'warning'
  });

  const [isProcessing, setIsProcessing] = useState(false);

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

  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;
    const { data: pData } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (pData) setPlayers(pData);
    
    const { data: rData } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
    if (rData) setRooms(rData);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchData]);

  const approvePlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      const adminSupabase = getServiceSupabase();
      // Find an active room or create one
      let roomId = rooms.find(r => r.status === 'waiting')?.id;
      
      if (!roomId) {
        const { data: newRoom, error: roomError } = await adminSupabase
          .from('rooms')
          .insert({ room_code: crypto.randomUUID().substring(0, 6).toUpperCase(), status: 'waiting', phase: 'Lobby', day_number: 0 })
          .select()
          .single();
        if (newRoom) roomId = newRoom.id;
        if (roomError) console.error('Error creating room:', roomError);
      }

      if (roomId) {
        // If this is the first player in the room, make them host
        const isFirst = !players.some(p => p.room_id === roomId);
        if (isFirst) {
          await adminSupabase.from('rooms').update({ host_id: playerId }).eq('id', roomId);
        }

        const { error: playerError } = await adminSupabase
          .from('players')
          .update({ status: 'approved', room_id: roomId })
          .eq('id', playerId);
        
        if (playerError) console.error('Error approving player:', playerError);
        
        fetchData();
      } else {
        console.error('No room available and failed to create one');
      }
    } finally {
      setIsProcessing(false);
      setConfirmModal(prev => ({ ...prev, show: false }));
    }
  };

  const rejectPlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      const adminSupabase = getServiceSupabase();
      await adminSupabase
        .from('players')
        .update({ status: 'rejected', room_id: null })
        .eq('id', playerId);
      fetchData();
    } finally {
      setIsProcessing(false);
      setConfirmModal(prev => ({ ...prev, show: false }));
    }
  };

  const deletePlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      const adminSupabase = getServiceSupabase();
      await adminSupabase
        .from('players')
        .delete()
        .eq('id', playerId);
      fetchData();
    } finally {
      setIsProcessing(false);
      setConfirmModal(prev => ({ ...prev, show: false }));
    }
  };

  const openConfirm = (title: string, message: string, action: () => Promise<void>, type: 'danger' | 'warning' | 'success' = 'warning') => {
    setConfirmModal({ show: true, title, message, action, type });
  };

  const startGame = async () => {
    const waitingRoom = rooms.find(r => r.status === 'waiting');
    if (!waitingRoom) return;

    try {
      const response = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: waitingRoom.id })
      });
      
      if (response.ok) {
        // Optionally show success message
        fetchData();
      } else {
        console.error('Failed to start game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const hasPendingRequests = players.some(p => p.status === 'pending');
  const waitingRoom = rooms.find(r => r.status === 'waiting');
  const approvedPlayersCount = players.filter(p => p.status === 'approved').length;
  const canGoToGame = !hasPendingRequests && approvedPlayersCount > 2;
  const canStartGame = !hasPendingRequests && waitingRoom && players.filter(p => p.room_id === waitingRoom.id && p.status === 'approved').length >= gameConfig.minPlayers;

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
        <div className="space-x-4">
          {waitingRoom && (
            <button 
              onClick={() => window.location.href = `/game/${waitingRoom.id}`}
              disabled={!canGoToGame}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded font-medium transition-colors"
            >
              Go to Game
            </button>
          )}
          <button 
            onClick={startGame}
            disabled={!canStartGame}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded font-medium transition-colors"
          >
            Start Game
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
        <div className="space-y-4">
          {players.filter(p => p.status === 'pending').map(player => (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
              <div>
                <p className="font-medium text-lg">{player.username} <span className="text-sm text-gray-400">({player.age || 'N/A'} yrs)</span></p>
                <p className="text-sm text-gray-400">Personality: {player.personality}</p>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => openConfirm(
                    'Approve Player',
                    `Are you sure you want to approve ${player.username}?`,
                    () => approvePlayer(player.id),
                    'success'
                  )} 
                  className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                  title="Approve"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => openConfirm(
                    'Reject Player',
                    `Are you sure you want to reject ${player.username}?`,
                    () => rejectPlayer(player.id),
                    'danger'
                  )} 
                  className="p-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                  title="Reject"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
          {players.filter(p => p.status === 'pending').length === 0 && (
            <p className="text-gray-400">No pending players.</p>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Approved Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.filter(p => p.status === 'approved').map(player => (
            <div key={player.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium">{player.username}</p>
                <p className="text-sm text-gray-400">Room: {player.room_id?.substring(0, 8)}...</p>
              </div>
              <button 
                onClick={() => openConfirm(
                  'Reject Approved Player',
                  `Are you sure you want to reject ${player.username}? They will be removed from their current room.`,
                  () => rejectPlayer(player.id),
                  'danger'
                )}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                title="Reject Player"
              >
                <X size={20} />
              </button>
            </div>
          ))}
          {players.filter(p => p.status === 'approved').length === 0 && (
            <p className="text-gray-400 col-span-full">No approved players.</p>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Rejected Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.filter(p => p.status === 'rejected').map(player => (
            <div key={player.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium">{player.username}</p>
                <p className="text-sm text-gray-400">Status: Rejected</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => openConfirm(
                    'Approve Rejected Player',
                    `Do you want to approve ${player.username} and add them to a room?`,
                    () => approvePlayer(player.id),
                    'success'
                  )}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  title="Approve Now"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={() => openConfirm(
                    'Delete Player Permanently',
                    `Are you sure you want to delete ${player.username}? This action cannot be undone.`,
                    () => deletePlayer(player.id),
                    'danger'
                  )}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete Player"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {players.filter(p => p.status === 'rejected').length === 0 && (
            <p className="text-gray-400 col-span-full">No rejected players.</p>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${
                confirmModal.type === 'danger' ? 'bg-red-900/50 text-red-400' : 
                confirmModal.type === 'success' ? 'bg-green-900/50 text-green-400' : 
                'bg-yellow-900/50 text-yellow-400'
              }`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.action}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500' : 
                  confirmModal.type === 'success' ? 'bg-green-600 hover:bg-green-500' : 
                  'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
