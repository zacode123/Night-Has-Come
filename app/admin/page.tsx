'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loginAdmin, logoutAdmin, checkAdminStatus, approvePlayer, rejectPlayer, deletePlayer, useLongPress, startGame } from './actions';
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
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
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

  // ------------------- Auth -------------------
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

  // ------------------- Data Fetch -------------------
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

  // ------------------- Handlers -------------------
  const handleApprovePlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      const res = await approvePlayer(playerId);
      if (res.roomId) {
        setCurrentRoomId(res.roomId);
      }
      fetchData();
    } finally {
      setIsProcessing(false);
      setConfirmModal(prev => ({ ...prev, show: false }));
    }
  };

  const handleRejectPlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      await rejectPlayer(playerId);
      fetchData();
    } finally {
      setIsProcessing(false);
      setConfirmModal(prev => ({ ...prev, show: false }));
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      await deletePlayer(playerId);
      fetchData();
    } finally {
      setIsProcessing(false);
      setConfirmModal(prev => ({ ...prev, show: false }));
    }
  };

  const openConfirm = (title: string, message: string, action: () => Promise<void>, type: 'danger' | 'warning' | 'success' = 'warning') => {
    setConfirmModal({ show: true, title, message, action, type });
  };

  const [playerModal, setPlayerModal] = useState<{
    show: boolean;
    player?: any;
  }>({ show: false });

  const openPlayerModal = (player: any) => {
    setPlayerModal({ show: true, player });
  };

  const handleStartGame = async () => {
    if (!waitingRoom) return;
    setIsProcessing(true);
    try {
      await startGame(waitingRoom.id);
      fetchData();
      window.location.href = `/game/${waitingRoom.id}`;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // ------------------- Player Groups -------------------
  const pendingPlayers = players.filter(p => p.status === 'pending');
  const approvedPlayers = players.filter(p => p.status === 'approved');
  const rejectedPlayers = players.filter(p => p.status === 'rejected');

  const hasPendingRequests = pendingPlayers.length > 0;
  const waitingRoom = rooms.find(r => r.status === 'waiting');

  const canStartGame =
    !hasPendingRequests &&
    waitingRoom &&
    players.filter(p => p.room_id === waitingRoom.id && p.status === 'approved').length >= gameConfig.minPlayers;

  // ------------------- Loading / Login -------------------
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
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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

  // ------------------- Admin Dashboard -------------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <button
            onClick={handleStartGame}
            disabled={!canStartGame || isProcessing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded font-medium transition-colors"
          >
            {isProcessing ? 'Starting...' : 'Start Game'}
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ------------------- Pending Players ------------------- */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
        <div className="space-y-4">
          {pendingPlayers.length > 0 ? (
            pendingPlayers.map(player => (
              <div key={player.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg" {...useLongPress(() => openPlayerModal(player), 700)}>
                <div>
                  <p className="font-medium text-lg">
                    {player.username} <span className="text-sm text-gray-400">({player.age || 'N/A'} yrs)</span>
                  </p>
                  <p className="text-sm text-gray-400">Personality: {player.personality}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openConfirm(
                      'Approve Player',
                      `Are you sure you want to approve ${player.username}?`,
                      () => handleApprovePlayer(player.id),
                      'success'
                    )}
                    disabled={isProcessing}
                    className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                    title="Approve"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => openConfirm(
                      'Reject Player',
                      `Are you sure you want to reject ${player.username}?`,
                      () => handleRejectPlayer(player.id),
                      'danger'
                    )}
                    disabled={isProcessing}
                    className="p-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                    title="Reject"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No pending players.</p>
          )}
        </div>
      </div>

      {/* ------------------- Approved Players ------------------- */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Approved Players {currentRoomId ? `- [${currentRoomId}]` : ''}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvedPlayers.length > 0 ? (
            approvedPlayers.map(player => (
              <div key={player.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center" {...useLongPress(() => openPlayerModal(player), 700)}>
                <div>
                  <p className="font-medium">{player.username}</p>
                  <p className="text-sm text-gray-400">Room: {player.room_id?.substring(0, 8)}...</p>
                </div>
                <button
                  onClick={() => openConfirm(
                    'Reject Approved Player',
                    `Are you sure you want to reject ${player.username}? They will be removed from their current room.`,
                    () => handleRejectPlayer(player.id),
                    'danger'
                  )}
                  disabled={isProcessing}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Reject Player"
                >
                  <X size={20} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400 col-span-full">No approved players.</p>
          )}
        </div>
      </div>

      {/* ------------------- Rejected Players ------------------- */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Rejected Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rejectedPlayers.length > 0 ? (
            rejectedPlayers.map(player => (
              <div key={player.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center" {...useLongPress(() => openPlayerModal(player), 700)}>
                <div>
                  <p className="font-medium">{player.username}</p>
                  <p className="text-sm text-gray-400">Status: Rejected</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openConfirm(
                      'Approve Rejected Player',
                      `Do you want to approve ${player.username} and add them to a room?`,
                      () => handleApprovePlayer(player.id),
                      'success'
                    )}
                    disabled={isProcessing}
                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                    title="Approve Now"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => openConfirm(
                      'Delete Player Permanently',
                      `Are you sure you want to delete ${player.username}? This action cannot be undone.`,
                      () => handleDeletePlayer(player.id),
                      'danger'
                    )}
                    disabled={isProcessing}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete Player"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 col-span-full">No rejected players.</p>
          )}
        </div>
      </div>
      
      {/* ------------------- Player Modal ------------------- */}
      {playerModal.show && playerModal.player && (
       <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
         <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
           <div className="flex flex-col items-center gap-4">
             <img
               src={playerModal.player.profile_url || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23FFFFFF'><path d='M222-255q63-44 125-67.5T480-346q71 0 133.5 23.5T739-255q44-54 62.5-109T820-480q0-145-97.5-242.5T480-820q-145 0-242.5 97.5T140-480q0 61 19 116t63 109Zm160.5-234.5Q343-529 343-587t39.5-97.5Q422-724 480-724t97.5 39.5Q617-645 617-587t-39.5 97.5Q538-450 480-450t-97.5-39.5ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm107.5-76Q640-172 691-212q-51-36-104-55t-107-19q-54 0-107 19t-104 55q51 40 103.5 56T480-140q55 0 107.5-16Zm-52-375.5Q557-553 557-587t-21.5-55.5Q514-664 480-664t-55.5 21.5Q403-621 403-587t21.5 55.5Q446-510 480-510t55.5-21.5ZM480-587Zm0 374Z'/></svg>`}
               alt={playerModal.player.username}
               className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
             />
             <h3 className="text-2xl font-bold">{playerModal.player.username}</h3>
             <p className="text-gray-400">Age: {playerModal.player.age || 'N/A'}</p>
             <p className="text-gray-400">Personality: {playerModal.player.personality}</p>
             <p className="text-gray-400">Room: {playerModal.player.room_id?.substring(0, 8)}...</p>
             <button
               onClick={() => setPlayerModal({ show: false })}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg mt-4"
             >
               Close
             </button>
           </div>
         </div>
       </div>
     )}
      
      {/* ------------------- Confirmation Modal ------------------- */}
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
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    await confirmModal.action();
                    fetchData();
                  } finally {
                    setIsProcessing(false);
                    setConfirmModal(prev => ({ ...prev, show: false }));
                  }
                }}
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
