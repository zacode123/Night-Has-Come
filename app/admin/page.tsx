'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import { getPersonalityBorder } from '@/lib/personalityBorder';
import FloatingInput from "@/components/FloatingInput";
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
  changeRoom,
  deleteRoom
} from './actions';
import { gameConfig } from '@/config/gameConfig';
import PlayerCard from '@/components/PlayerCard';
import { AlertTriangle, CheckCircle, Info, XCircle, X, Trash2 } from 'lucide-react';

// --- TYPES FOR NOTIFICATIONS ---
type NotificationType = 'success' | 'error' | 'warning' | 'info';
interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

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

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isLoginInvalid =
    username.length < 3 || username.length > 20 ||
    password.length < 6 || password.length > 20;

  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [confirmModal, setConfirmModal] = useState<any>({
    show: false, title: '', message: '', action: async () => {}, type: 'warning'
  });

  const [playerModal, setPlayerModal] = useState<any>({ show: false, player: null });
  const [previewImage, setPreviewImage] = useState<string | null>(null); // State for enlarged image

  // ---------------- NOTIFICATION SYSTEM ----------------
  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
    if (username.length < 3) { setLoginError('Minimum username length is 3!'); setIsProcessing(false); return; }
    if (username.length > 20) { setLoginError('Maximum username length is 20!'); setIsProcessing(false); return; }
    if (password.length < 6) { setLoginError('Minimum password length is 6!'); setIsProcessing(false); return; }
    if (password.length > 10) { setLoginError('Maximum password length is 10!'); setIsProcessing(false); return; }
    
    const res = await loginAdmin(username, password);
    if (res.success) {
      setIsLoggedIn(true);
      notify('Logged in successfully', 'success');
    } else {
      setLoginError('Invalid username or password');
    }
    setIsProcessing(false);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsLoggedIn(false);
    notify('Logged out', 'info');
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
      const res = await approvePlayer(id, selectedRoomId);
      if (res.success) {
        notify('Player approved successfully', 'success');
        fetchData();
      } else {
        notify(res.error || 'Failed to approve player', 'error');
      }
    } finally {
      setIsProcessing(false);
      setConfirmModal((p: any) => ({ ...p, show: false }));
    }
  };

  const handleRejectPlayer = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await rejectPlayer(id);
      if (res.success) {
        notify('Player rejected', 'info');
        fetchData();
      } else {
        notify(res.error || 'Failed to reject player', 'error');
      }
    } finally {
      setIsProcessing(false);
      setConfirmModal((p: any) => ({ ...p, show: false }));
    }
  };

  const handleDeletePlayer = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await deletePlayer(id);
      if (res.success) {
        notify('Player completely deleted', 'success');
        fetchData();
      } else {
        notify(res.error || 'Failed to delete player', 'error');
      }
    } finally {
      setIsProcessing(false);
      setConfirmModal((p: any) => ({ ...p, show: false }));
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      notify('Room name cannot be empty', 'warning');
      return;
    }
    setIsProcessing(true);
    const res = await createRoom(newRoomName);
    if (res.success) {
      notify(`Room "${newRoomName}" created!`, 'success');
      setNewRoomName('');
      fetchData();
    } else {
      notify(res.error || 'Failed to create room', 'error');
    }
    setIsProcessing(false);
  };

  const handleChangeRoom = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await changeRoom(id, selectedRoomId);
      if (res.success) {
        notify('Room of the player has been changed successfully', 'success');
        fetchData();
      } else {
        notify(res.error || 'Failed to change the room of the player', 'error');
      }
    } finally {
      setIsProcessing(false);
      setConfirmModal((p: any) => ({ ...p, show: false }));
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    setIsProcessing(true);
    const res = await deleteRoom(roomId);
    if (res.success) {
      notify('Room deleted', 'success');
      if (selectedRoomId === roomId) setSelectedRoomId(null);
      fetchData();
    } else {
      notify(res.error || 'Failed to delete room', 'error');
    }
    setIsProcessing(false);
  };
  
  const handleStartGame = async (roomId: string) => {
    setIsProcessing(true);
    const res = await startGame(roomId);
    await fetchData();
    setIsProcessing(false);
    if (res.success) {
      notify('Game started successfully!', 'success');
      router.push(`/game/${roomId}`);
    } else {
      notify(res.error || 'Failed to start game', 'error');
    }
  };

  const handleStopGame = async () => {
    const activeRoom = rooms.find(r => r.status === 'in_game');
    if (!activeRoom) return;

    setIsProcessing(true);
    const res = await stopGame(activeRoom.id);
    await fetchData();
    setIsProcessing(false);
    
    if (res.success) notify('Game stopped', 'info');
    else notify(res.error || 'Failed to stop game', 'error');
  };

  const openConfirm = (title: string, message: string, action: () => Promise<void>, type: any = 'warning') =>
    setConfirmModal({ show: true, title, message, action, type });

  const openPlayerModal = (player: any) => setPlayerModal({ show: true, player });

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const approvedPlayers = players.filter(p => p.status === 'approved');
  const rejectedPlayers = players.filter(p => p.status === 'rejected');
  
  const canStartGame = rooms.some(room => 
    room.status === 'waiting' && 
    players.filter(p => p.room_id === room.id && p.status === 'approved').length >= gameConfig.minPlayers
  );
  
  const canStopGame = rooms.some(r => r.status === 'in_game');

  const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23FFFFFF'><path d='M222-255q63-44 125-67.5T480-346q71 0 133.5 23.5T739-255q44-54 62.5-109T820-480q0-145-97.5-242.5T480-820q-145 0-242.5 97.5T140-480q0 61 19 116t63 109Zm160.5-234.5Q343-529 343-587t39.5-97.5Q422-724 480-724t97.5 39.5Q617-645 617-587t-39.5 97.5Q538-450 480-450t-97.5-39.5ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Zm107.5-76Q640-172 691-212q-51-36-104-55t-107-19q-54 0-107 19t-104 55q51 40 103.5 56T480-140q55 0 107.5-16Zm-52-375.5Q557-553 557-587t-21.5-55.5Q514-664 480-664t-55.5 21.5Q403-621 403-587t21.5 55.5Q446-510 480-510t55.5-21.5ZM480-587Zm0 374Z'/></svg>`;

  // ---------------- LOADING ----------------
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ---------------- LOGIN ----------------
  if (!isLoggedIn) return (  
   <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 flex items-center justify-center p-4">  
     {/* NOTIFICATIONS CONTAINER */}
     <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 w-full max-w-md px-4">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-center justify-between p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
            n.type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-700' :
            n.type === 'warning' ? 'bg-yellow-900/90 text-yellow-100 border border-yellow-700' :
            n.type === 'success' ? 'bg-green-900/90 text-green-100 border border-green-700' :
            'bg-blue-900/90 text-blue-100 border border-blue-700'
          }`}>
            <div className="flex items-center gap-3">
              {n.type === 'error' && <XCircle size={20} />}
              {n.type === 'warning' && <AlertTriangle size={20} />}
              {n.type === 'success' && <CheckCircle size={20} />}
              {n.type === 'info' && <Info size={20} />}
              <span className="font-medium">{n.message}</span>
            </div>
          </div>
        ))}
     </div>

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
           <FloatingInput label="Username" type="text" value={username} color="blue" onChange={e => setUsername(e.target.value)} />
         </div>  
         <div className="relative">  
           <FloatingInput label="Password" type={showPassword ? 'text' : 'password'} value={password} color="blue" onChange={e => setPassword(e.target.value)} />
           <button type="button" onClick={() => setShowPassword(prev => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors">  
             {showPassword ? (  
               <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>  
             ) : (  
               <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5Z"/></svg>  
             )}  
           </button>  
         </div>  
         <button  
           onMouseEnter={() => { if (!isLoginInvalid) audioEngine.playHover(); }}  
           onClick={() => { if (!isLoginInvalid) audioEngine.playClick(); }}  
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 text-white p-8 relative">
      {/* NOTIFICATIONS CONTAINER */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 w-full max-w-md px-4">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-center justify-between p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
            n.type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-700' :
            n.type === 'warning' ? 'bg-yellow-900/90 text-yellow-100 border border-yellow-700' :
            n.type === 'success' ? 'bg-green-900/90 text-green-100 border border-green-700' :
            'bg-blue-900/90 text-blue-100 border border-blue-700'
          }`}>
            <div className="flex items-center gap-3">
              {n.type === 'error' && <XCircle size={20} />}
              {n.type === 'warning' && <AlertTriangle size={20} />}
              {n.type === 'success' && <CheckCircle size={20} />}
              {n.type === 'info' && <Info size={20} />}
              <span className="font-medium">{n.message}</span>
            </div>
            <button onClick={() => removeNotification(n.id)} className="opacity-70 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M264-216h96v-240h240v240h96v-348L480-726 264-564v348Zm-72 72v-456l288-216 288 216v456H528v-240h-96v240H192Zm288-327Z"/></svg>
      </button>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 mt-12 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <div className="flex gap-3 flex-wrap">
          { canStartGame && (
            <button
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                audioEngine.playClick();
                setShowRoomModal(true);
              }} 
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg shadow font-medium">
              {isProcessing ? 'Starting...' : 'Start Game'}
            </button>
          )}

          { canStopGame && (
            <button
               onMouseEnter={() => audioEngine.playHover()}
               onClick={() => {
                 audioEngine.playClick();
                 handleStopGame();
              }}
              disabled={isProcessing}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg shadow font-medium">
              {isProcessing ? 'Stopping...' : 'Stop Game'}
            </button>
          )}

          <button
            onMouseEnter={() => audioEngine.playHover()}
             onClick={() => {
               audioEngine.playClick();
               handleLogout();
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium">
            Logout
          </button>
        </div>
      </div>

      {/* Rooms */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl mb-4 font-semibold text-blue-200">Room Management</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter') {
                audioEngine.playClick();
                handleCreateRoom(); 
              }
            }}
            placeholder="New Room Name..."
            className="bg-white/10 px-4 py-2 rounded-lg text-white w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
         />
         <button onMouseEnter={() => audioEngine.playHover()} onClick={() => { audioEngine.playClick(); handleCreateRoom(); }} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 px-6 font-medium rounded-lg transition-colors">
           Create Room
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {rooms.map(room => (
           <div key={room.id} className={`flex justify-between items-center bg-white/5 p-4 rounded-xl border ${selectedRoomId === room.id ? 'border-green-500 bg-green-900/20' : 'border-white/5'}`}>
             <div>
               <p className="font-bold text-lg">{room.name}</p>
               <p className="text-xs text-gray-400 capitalize bg-gray-800 inline-block px-2 py-0.5 rounded-full mt-1">Status: {room.status}</p>
             </div>
             <div className="flex gap-2">
               <button
                 onMouseEnter={() => audioEngine.playHover()}
                 onClick={() => {
                   audioEngine.playClick();
                   setSelectedRoomId(room.id);
                   notify(`Selected Room: ${room.name}`, 'info');
                 }}
                 className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${selectedRoomId === room.id ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
               >
                 {selectedRoomId === room.id ? 'Selected' : 'Select'}
               </button>
               <button onMouseEnter={() => audioEngine.playHover()} onClick={() => { audioEngine.playClick(); handleDeleteRoom(room.id); }} disabled={isProcessing} className="p-1.5 bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors">
                 <Trash2 size={18} />
               </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && <p className="text-gray-500 italic py-2">No rooms created yet.</p>}
      </div>
     </div>

      {/* Pending */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl mb-4 font-semibold text-yellow-200">Pending Players</h2>
        <div className="space-y-3 sm:space-y-4">
          {pendingPlayers.length > 0 ? pendingPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onLongPress={openPlayerModal}
              onApprove={(p) => {
                if (selectedRoomId) {
                  openConfirm('Approve', `Approve ${p.username} into the selected room?`, handleApprovePlayer(p.id), 'success');
                } else {
                  notify("Please select a room first before changing a player's room!", 'warning');
                }
              }}
              onReject={(p) => openConfirm('Reject', `Are you sure you want to reject ${p.username}?`, () => handleRejectPlayer(p.id), 'danger')}
              actionType="pending"
              isProcessing={isProcessing}
            />
          )) : <p className="text-gray-500 italic">No pending players</p>}
        </div>
      </div>

      {/* Approved */}
      {approvedPlayers.length > 0 && (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-xl mb-6 font-semibold text-green-200">Approved Players</h2>
          
          {/* Group players by their Room */}
          {rooms.map(room => {
            const roomPlayers = approvedPlayers.filter(p => p.room_id === room.id);
            
            // If no approved players are in this room, don't show the room header here
            if (roomPlayers.length === 0) return null;

            return (
              <div key={room.id} className="mb-8 last:mb-0 bg-black/20 rounded-xl p-4 border border-white/5">
                <div className="flex items-center flex-wrap gap-3 mb-4 border-b border-white/10 pb-3">
                  <h3 className="text-lg font-bold text-white">
                    {room.name}
                  </h3>
                  <span className="text-xs font-mono text-gray-400 bg-black/50 px-2 py-1 rounded-md border border-white/10">
                    Code: {room.room_code}
                  </span>
                  <span className="text-xs text-green-400 bg-green-900/30 border border-green-900 px-2 py-1 rounded-full">
                    {roomPlayers.length} / {gameConfig.minPlayers} Min Players
                  </span>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {roomPlayers.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onLongPress={openPlayerModal}
                      onChangeRoom={(p) => {
                        if (selectedRoomId) {
                          openConfirm('Change Room', `Change the room of ${p.username} to the selected room?`, handleChangeRoom(p.id), 'danger');
                        } else {
                          notify("Please select a room first before changing a player's room!", 'warning');
                        }
                      }}
                      onReject={(p) => openConfirm('Reject', `Are you sure you want to reject ${p.username}?`, () => handleRejectPlayer(p.id), 'danger')}
                      actionType="approved"
                      isProcessing={isProcessing}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Fallback for approved players without a valid room (e.g. if a room was deleted improperly) */}
          {(() => {
            const orphanedPlayers = approvedPlayers.filter(p => !rooms.some(r => r.id === p.room_id));
            if (orphanedPlayers.length === 0) return null;
            
            return (
              <div className="mb-8 last:mb-0 bg-red-900/10 rounded-xl p-4 border border-red-900/30">
                <div className="flex items-center gap-2 mb-4 border-b border-red-900/30 pb-3">
                  <h3 className="text-lg font-bold text-red-400">
                    Unassigned / Unknown Room
                  </h3>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {orphanedPlayers.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onLongPress={openPlayerModal}
                      onChangeRoom={(p) => {
                        if (selectedRoomId) {
                          openConfirm('Change Room', `Change the room of ${p.username} to the selected room?`, handleChangeRoom(p.id), 'danger');
                        } else {
                          notify("Please select a room first before changing a player's room!", 'warning');
                        }
                      }}
                      onReject={(p) => openConfirm('Reject', `Are you sure you want to reject ${p.username}?`, () => handleRejectPlayer(p.id), 'danger')}
                      actionType="approved"
                      isProcessing={isProcessing}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Rejected */}
      {rejectedPlayers.length > 0 && (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-xl mb-4 font-semibold text-red-200">Rejected Players</h2>
          <div className="space-y-3 sm:space-y-4">
            {rejectedPlayers.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                onLongPress={openPlayerModal}
                onApprove={(p) => {
                  if (selectedRoomId) {
                    openConfirm('Approve', `Approve ${p.username} into the selected room?`, handleApprovePlayer(p.id), 'success');
                  } else {
                    notify("Please select a room first before changing a player's room!", 'warning');
                  }
                }}
                onDelete={(p) => openConfirm('Delete', `Permanently delete ${p.username}? This cannot be undone.`, () => handleDeletePlayer(p.id), 'danger')}
                actionType="rejected"
                isProcessing={isProcessing}
              />
            ))}
          </div>
        </div>
      )}

      {/* ShowRoomModal (for starting game) */}
      {showRoomModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="mb-6 text-xl font-bold">Select Room to Start</h2>
            <div className="space-y-3">
              {rooms.filter(r => r.status === 'waiting').map(room => (
                <button
                  key={room.id}
                  onMouseEnter={() => audioEngine.playHover()}
                  onClick={() => {
                    audioEngine.playClick();
                    handleStartGame(room.id);
                    setShowRoomModal(false);
                  }}
                  className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-medium transition-colors"
                >
                  {room.name}
                </button>
             ))}
             {rooms.filter(r => r.status === 'waiting').length === 0 && (
               <p className="text-gray-400 text-center py-4">No waiting rooms available.</p>
             )}
           </div>
           <button
             onMouseEnter={() => audioEngine.playHover()}
             onClick={() => { audioEngine.playClick(); setShowRoomModal(false); }}
             className="mt-4 w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-medium transition-colors"
           >
             Cancel
           </button>
         </div>
       </div>
     )}

      {/* Player Modal */}
      {playerModal.show && playerModal.player && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src={playerModal.player.avatar_base64 || defaultAvatar}
                alt={playerModal.player.username}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); setPreviewImage(playerModal.player.avatar_base64 || defaultAvatar); }} // Sets image preview
                className={`w-28 h-28 rounded-full object-cover border-4 cursor-pointer hover:scale-105 transition-transform ${getPersonalityBorder(playerModal.player.personality)}`}
                title="Click to enlarge"
              />
              <div className="space-y-1">
                <h3 className="text-3xl font-bold">{playerModal.player.username}</h3>
                <p className="text-blue-400 font-medium">Age: {playerModal.player.age || 'N/A'}</p>
                <p className="text-purple-400 font-medium">Personality: {playerModal.player.personality || 'N/A'}</p>
              </div>
              
              <div className="bg-black/30 rounded-xl p-4 w-full text-left mt-2 space-y-2">
                <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Submitted:</span><br/> {formatDateTime(playerModal.player.created_at)}</p>
                <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Room ID:</span><br/> {playerModal.player.room_id || 'None'}</p>
                <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Status:</span><br/> <span className="capitalize">{playerModal.player.status}</span></p>
              </div>

              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); setPlayerModal({ show: false, player: null }); }}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg mt-2 font-medium transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Preview Overlay */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Enlarged Preview"
            className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover border-4 border-gray-600 shadow-2xl animate-in zoom-in-75 duration-300"
          />
          <div className="absolute bottom-10 text-gray-400 text-sm tracking-widest uppercase">Click anywhere to close</div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
            <p className="text-gray-300 mb-8">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => { audioEngine.playClick(); setConfirmModal((prev: any) => ({ ...prev, show: false })); }}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onMouseEnter={() => audioEngine.playHover()}
                onClick={async () => {
                  audioEngine.playClick();
                  setIsProcessing(true);
                  try {
                    await confirmModal.action();
                    fetchData();
                  } finally {
                    setIsProcessing(false);
                    setConfirmModal((prev: any) => ({ ...prev, show: false }));
                  }
                }}
                disabled={isProcessing}
                className={`px-5 py-2.5 rounded-lg font-bold transition-colors shadow-lg ${
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
