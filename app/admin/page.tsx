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
  stopGame,
  createRoom,
  renameRoom,
  deleteRoom
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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    if (isLoginInvalid) return;
    setIsProcessing(true);
    setLoginError('');
    const res = await loginAdmin(username, password);
    if (res.success) {
      setIsLoggedIn(true);
    } else {
      setLoginError('Invalid username or password');
    }
    setIsProcessing(false);
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
    if (!selectedRoomId) {
      console.log('Select a room first');
      return;
    }

    setIsProcessing(true);
    try {
      await approvePlayer(id, selectedRoomId);
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

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    await createRoom(newRoomName);
    setNewRoomName('');
    fetchData();
  };

  const handleDeleteRoom = async (roomId: string) => {
    await deleteRoom(roomId);
    fetchData();
  };
  
  const handleStartGame = async (roomId: string) => {
    setIsProcessing(true);
    const res = await startGame(roomId);
    await fetchData();
    setIsProcessing(false);

    if (res.success) {
      router.push(`/game/${roomId}`);
    } else {
      console.error(res.error);
    }
  };

  const handleStopGame = async () => {
    const activeRoom = rooms.find(r => r.status === 'in_game');
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
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M264-216h96v-240h240v240h96v-348L480-726 264-564v348Zm-72 72v-456l288-216 288 216v456H528v-240h-96v240H192Zm288-327Z"/></svg>
      </button>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">

        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
          Admin Panel
        </h1>

        {loginError && <div className="text-red-400 text-center mb-4">{loginError}</div>}

        <form onSubmit={handleLogin} className="space-y-6">

          <div className="relative">
            <input placeholder=" " value={username} onChange={e => setUsername(e.target.value)}
              className="peer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <label className="absolute left-3 top-3 text-gray-400 transition-all
              peer-placeholder-shown:top-1/2 
              peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-1 
              peer-focus:text-xs 
              peer-not-placeholder-shown:top-1 
              peer-not-placeholder-shown:text-xs 
              bg-gray-900 px-1">
              Username
            </label>
          </div>

          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder=" " value={password} onChange={e => setPassword(e.target.value)}
              className="peer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <label className="absolute left-3 top-3 text-gray-400 transition-all
              peer-placeholder-shown:top-1/2 
              peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-1 
              peer-focus:text-xs 
              peer-not-placeholder-shown:top-1 
              peer-not-placeholder-shown:text-xs 
              bg-gray-900 px-1">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z"/></svg>
              )}
            </button>
          </div>

          <button
            onMouseEnter={() => {
              if (!isLoginInvalid) audioEngine.playHover();
            }}
            onClick={() => {
              if (!isLoginInvalid) audioEngine.playClick();
            }}
            className={`w-full bg-gradient-to-r from-blue-600 to-cyan-500 py-3 rounded-lg font-semibold transition duration-200 ${isLoginInvalid ? 'opacity-50' : 'hover:scale-[1.02] hover:shadow-xl hover:brightness-110 hover:-translate-y-[1px]'}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
            ) : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );

  // ---------------- DASHBOARD ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 text-white p-8">
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M264-216h96v-240h240v240h96v-348L480-726 264-564v348Zm-72 72v-456l288-216 288 216v456H528v-240h-96v240H192Zm288-327Z"/></svg>
      </button>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <div className="flex gap-3 flex-wrap">
          <button
            onMouseEnter={() => audioEngine.playHover()}
            onClick={() => {
              audioEngine.playClick();
              setShowRoomModal(true);
            }} 
            disabled={!canStartGame || isProcessing}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg shadow">
            {isProcessing ? 'Starting...' : 'Start Game'}
          </button>

          <button
             onMouseEnter={() => audioEngine.playHover()}
             onClick={() => {
               audioEngine.playClick();
               handleStopGame();
            }}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg shadow">
            Stop Game
          </button>

          <button
            onMouseEnter={() => audioEngine.playHover()}
             onClick={() => {
               audioEngine.playClick();
               handleLogout();
            }}
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
          <PlayerCard 
            key={player.id} 
            player={player} 
            onLongPress={openPlayerModal}
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
          <PlayerCard 
            key={player.id} 
            player={player}
            onLongPress={openPlayerModal}
            onApprove={(p) => openConfirm('Approve', p.username, () => handleApprovePlayer(p.id), 'success')}
            onDelete={(p) => openConfirm('Delete', p.username, () => handleDeletePlayer(p.id), 'danger')}
            actionType="rejected"
            isProcessing={isProcessing}
          />
        ))}
      </div>

      {/* Rooms */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl mb-4">Rooms</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="bg-white/10 px-3 py-2 rounded-lg text-white"
         />
         <button onClick={handleCreateRoom} className="bg-blue-600 px-4 rounded-lg">
           Create
         </button>
       </div>

       <div className="space-y-2">
         {rooms.map(room => (
           <div key={room.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">

             <div>
               <p className="font-semibold">{room.name}</p>
               <p className="text-xs text-gray-400">{room.status}</p>
             </div>

             <div className="flex gap-2">
               <button
                 onClick={() => setSelectedRoomId(room.id)}
                 className={`px-3 py-1 rounded ${selectedRoomId === room.id ? 'bg-green-500' : 'bg-gray-700'}`}
               >
                 Select
               </button>

               <button
                 onClick={() => handleDeleteRoom(room.id)}
                 className="px-3 py-1 bg-red-600 rounded"
               >
                 Delete
               </button>
            </div>
          </div>
        ))}
      </div>
     </div>

      {/* ShowRoomModal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-lg">Select Room</h2>
            <div className="space-y-2">
              {rooms.filter(r => r.status === 'waiting').map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    handleStartGame(room.id);
                    setShowRoomModal(false);
                  }}
                  className="w-full bg-green-600 py-2 rounded"
                >
                  {room.name}
                </button>
             ))}
           </div>

           <button
             onClick={() => setShowRoomModal(false)}
             className="mt-4 w-full bg-gray-700 py-2 rounded"
           >
             Cancel
           </button>
         </div>
       </div>
     )}
    </div>
  );
}
