'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getPersonalityBorder } from '@/lib/personalityBorder';
import { motion } from 'motion/react';
import {
  loginAdmin,
  logoutAdmin,
  checkAdminStatus,
  approvePlayer,
  rejectPlayer,
  deletePlayer,
  startGame,
  stopGame
} from './actions';
import { gameConfig } from '@/config/gameConfig';
import PlayerCard from '@/components/PlayerCard';
import { AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const isLoginInvalid =
    username.length < 3 || username.length > 20 ||
    password.length < 6 || password.length > 10;

  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const [confirmModal, setConfirmModal] = useState<any>({
    show: false,
    title: '',
    message: '',
    action: async () => {},
    type: 'warning'
  });

  const [playerModal, setPlayerModal] = useState<any>({ show: false });

  // ---------------- AUTH ----------------
  useEffect(() => {
    (async () => {
      const status = await checkAdminStatus();
      setIsLoggedIn(status);
      setIsLoading(false);
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await loginAdmin(username, password);
    if (res.success) setIsLoggedIn(true);
    else setLoginError('Invalid username or password');
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsLoggedIn(false);
  };

  // ---------------- FETCH ----------------
  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;

    const { data: pData } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    const { data: rData } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });

    if (pData) setPlayers(pData);
    if (rData) setRooms(rData);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchData();
    const i = setInterval(fetchData, 5000);
    return () => clearInterval(i);
  }, [isLoggedIn, fetchData]);

  const formatDateTime = (d?: string) => d ? new Date(d).toLocaleString() : 'N/A';

  // ---------------- HANDLERS ----------------
  const handleApprovePlayer = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await approvePlayer(id);
      if (res.roomId) setCurrentRoomId(res.roomId);
      fetchData();
    } finally {
      setIsProcessing(false);
      setConfirmModal((p: any) => ({ ...p, show: false }));
    }
  };

  const handleRejectPlayer = async (id: string) => {
    setIsProcessing(true);
    try { await rejectPlayer(id); fetchData(); }
    finally { setIsProcessing(false); setConfirmModal((p: any) => ({ ...p, show: false })); }
  };

  const handleDeletePlayer = async (id: string) => {
    setIsProcessing(true);
    try { await deletePlayer(id); fetchData(); }
    finally { setIsProcessing(false); setConfirmModal((p: any) => ({ ...p, show: false })); }
  };

  const handleStartGame = async () => {
    const waitingRoom = rooms.find(r => r.status === 'waiting');
    if (!waitingRoom) return;

    setIsProcessing(true);
    await startGame(waitingRoom.id);
    await fetchData();
    setIsProcessing(false);

    router.push(`/game/${waitingRoom.id}`);
  };

  const handleStopGame = async () => {
    const activeRoom = rooms.find(r => r.status === 'playing');
    if (!activeRoom) return;

    setIsProcessing(true);
    await stopGame(activeRoom.id);
    await fetchData();
    setIsProcessing(false);
  };

  const openConfirm = (title: string, message: string, action: () => Promise<void>, type: any = 'warning') =>
    setConfirmModal({ show: true, title, message, action, type });

  const openPlayerModal = (player: any) => setPlayerModal({ show: true, player });

  const waitingRoom = rooms.find(r => r.status === 'waiting');
  const pendingPlayers = players.filter(p => p.status === 'pending');
  const approvedPlayers = players.filter(p => p.status === 'approved');
  const rejectedPlayers = players.filter(p => p.status === 'rejected');

  const hasPendingRequests = pendingPlayers.length > 0;

  const canStartGame =
    !hasPendingRequests &&
    waitingRoom &&
    players.filter(p => p.room_id === waitingRoom.id && p.status === 'approved').length >= gameConfig.minPlayers;

  // ---------------- LOADING ----------------
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ---------------- LOGIN ----------------
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">

        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
          Admin Panel
        </h1>

        {loginError && <div className="text-red-400 text-center mb-4">{loginError}</div>}

        <form onSubmit={handleLogin} className="space-y-6">

          <div className="relative">
            <input placeholder=" " value={username} onChange={e => setUsername(e.target.value)}
              className="peer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white" />
            <label className="absolute left-3 top-3 text-gray-400 transition-all
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-1 peer-focus:text-xs bg-gray-900 px-1">
              Username
            </label>
          </div>

          <div className="relative">
            <input type="password" placeholder=" " value={password} onChange={e => setPassword(e.target.value)}
              className="peer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white" />
            <label className="absolute left-3 top-3 text-gray-400 transition-all
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-1 peer-focus:text-xs bg-gray-900 px-1">
              Password
            </label>
          </div>

          <button disabled={isLoginInvalid}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 py-3 rounded-lg font-semibold hover:scale-[1.02] transition">
            Login
          </button>

        </form>
      </div>
    </div>
  );

  // ---------------- DASHBOARD ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 text-white p-8">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleStartGame} disabled={!canStartGame || isProcessing}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg shadow">
            {isProcessing ? 'Starting...' : 'Start Game'}
          </button>

          <button onClick={handleStopGame}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg shadow">
            Stop Game
          </button>

          <button onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
            Logout
          </button>
        </div>
      </div>

      {/* Pending */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl mb-4">Pending Players</h2>
        {pendingPlayers.length > 0 ? pendingPlayers.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onLongPress={openPlayerModal}
            onApprove={(p) => openConfirm('Approve', p.username, () => handleApprovePlayer(p.id), 'success')}
            onReject={(p) => openConfirm('Reject', p.username, () => handleRejectPlayer(p.id), 'danger')}
            actionType="pending"
            isProcessing={isProcessing}
          />
        )) : <p className="text-gray-400">No pending players</p>}
      </div>

      {/* Approved */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl mb-4">Approved Players</h2>
        {approvedPlayers.map(player => (
          <PlayerCard key={player.id} player={player} onLongPress={openPlayerModal}
            onReject={(p) => openConfirm('Remove', p.username, () => handleRejectPlayer(p.id), 'danger')}
            actionType="approved"
            isProcessing={isProcessing}
          />
        ))}
      </div>

      {/* Rejected */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl mb-4">Rejected Players</h2>
        {rejectedPlayers.map(player => (
          <PlayerCard key={player.id} player={player}
            onApprove={(p) => openConfirm('Approve', p.username, () => handleApprovePlayer(p.id), 'success')}
            onDelete={(p) => openConfirm('Delete', p.username, () => handleDeletePlayer(p.id), 'danger')}
            actionType="rejected"
            isProcessing={isProcessing}
          />
        ))}
      </div>

    </div>
  );
  }
