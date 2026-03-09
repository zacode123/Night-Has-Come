'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loginAdmin, logoutAdmin, checkAdminStatus, approvePlayer, rejectPlayer, deletePlayer, startGame } from './actions';
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

  const handleApprovePlayer = async (playerId: string) => {
    setIsProcessing(true);
    try {
      await approvePlayer(playerId);
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

  const handleStartGame = async () => {
    const waitingRoom = rooms.find(r => r.status === 'waiting');
    if (!waitingRoom) return;
    await startGame(waitingRoom.id);
    fetchData();
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
      {/* Your existing dashboard UI untouched */}
      {/* Just replace approvePlayer/rejectPlayer/deletePlayer/startGame calls with the client handlers */}
    </div>
  );
}
