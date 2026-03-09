'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  loginAdmin,
  logoutAdmin,
  checkAdminStatus,
  approvePlayer,
  rejectPlayer,
  deletePlayer,
  startGame
} from './actions';

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

  const [isProcessing, setIsProcessing] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    action: async () => {},
    type: 'warning' as 'danger' | 'warning' | 'success'
  });

  /* ---------------- AUTH ---------------- */

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

  /* ---------------- FETCH DATA ---------------- */

  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;

    const { data: pData } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });

    if (pData) setPlayers(pData);

    const { data: rData } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (rData) setRooms(rData);

  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);

  }, [isLoggedIn, fetchData]);

  /* ---------------- PLAYER ACTIONS ---------------- */

  const handleApprove = async (playerId: string) => {
    setIsProcessing(true);
    await approvePlayer(playerId);
    await fetchData();
    setIsProcessing(false);
    setConfirmModal(prev => ({ ...prev, show: false }));
  };

  const handleReject = async (playerId: string) => {
    setIsProcessing(true);
    await rejectPlayer(playerId);
    await fetchData();
    setIsProcessing(false);
    setConfirmModal(prev => ({ ...prev, show: false }));
  };

  const handleDelete = async (playerId: string) => {
    setIsProcessing(true);
    await deletePlayer(playerId);
    await fetchData();
    setIsProcessing(false);
    setConfirmModal(prev => ({ ...prev, show: false }));
  };

  const handleStartGame = async () => {
    const waitingRoom = rooms.find(r => r.status === 'waiting');

    if (!waitingRoom) return;

    await startGame(waitingRoom.id);

    fetchData();
  };

  /* ---------------- MODAL ---------------- */

  const openConfirm = (
    title: string,
    message: string,
    action: () => Promise<void>,
    type: 'danger' | 'warning' | 'success' = 'warning'
  ) => {
    setConfirmModal({
      show: true,
      title,
      message,
      action,
      type
    });
  };

  /* ---------------- UI STATES ---------------- */

  const hasPendingRequests = players.some(p => p.status === 'pending');

  const waitingRoom = rooms.find(r => r.status === 'waiting');

  const approvedPlayersCount = players.filter(p => p.status === 'approved').length;

  const canGoToGame = !hasPendingRequests && approvedPlayersCount > 2;

  const canStartGame =
    !hasPendingRequests &&
    waitingRoom &&
    players.filter(
      p => p.room_id === waitingRoom.id && p.status === 'approved'
    ).length >= gameConfig.minPlayers;

  /* ---------------- LOADING ---------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  /* ---------------- LOGIN PAGE ---------------- */

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">

        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl w-96 space-y-4">

          <h1 className="text-2xl font-bold text-center">Admin Login</h1>

          {loginError && (
            <p className="text-red-400 text-sm">{loginError}</p>
          )}

          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 bg-black border border-gray-700 rounded"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 bg-black border border-gray-700 rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button className="w-full bg-blue-600 py-3 rounded">
            Login
          </button>

        </form>

      </div>
    );
  }

  /* ---------------- DASHBOARD ---------------- */

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">

      <div className="flex justify-between mb-8">

        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <div className="space-x-4">

          {waitingRoom && (
            <button
              disabled={!canGoToGame}
              onClick={() => window.location.href = `/game/${waitingRoom.id}`}
              className="px-4 py-2 bg-green-600 rounded"
            >
              Go To Game
            </button>
          )}

          <button
            disabled={!canStartGame}
            onClick={handleStartGame}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Start Game
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Logout
          </button>

        </div>

      </div>

      {/* Pending Players */}

      <div className="bg-gray-800 p-6 rounded-xl mb-8">

        <h2 className="text-xl font-semibold mb-4">Pending Players</h2>

        {players.filter(p => p.status === 'pending').map(player => (

          <div key={player.id} className="flex justify-between bg-gray-700 p-4 rounded mb-2">

            <div>

              <p>{player.username}</p>

              <p className="text-sm text-gray-400">{player.personality}</p>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() =>
                  openConfirm(
                    'Approve Player',
                    `Approve ${player.username}?`,
                    () => handleApprove(player.id),
                    'success'
                  )
                }
                className="bg-green-600 p-2 rounded"
              >
                <Check size={18} />
              </button>

              <button
                onClick={() =>
                  openConfirm(
                    'Reject Player',
                    `Reject ${player.username}?`,
                    () => handleReject(player.id),
                    'danger'
                  )
                }
                className="bg-red-600 p-2 rounded"
              >
                <X size={18} />
              </button>

            </div>

          </div>

        ))}

      </div>

      {/* Confirm Modal */}

      {confirmModal.show && (

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">

          <div className="bg-gray-900 p-6 rounded-xl w-96">

            <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>

            <p className="mb-4">{confirmModal.message}</p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setConfirmModal(prev => ({ ...prev, show: false }))
                }
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmModal.action}
                className="px-4 py-2 bg-blue-600 rounded"
              >
                Confirm
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
