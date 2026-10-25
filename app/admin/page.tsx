'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import { getPersonalityBorder } from '@/lib/personalityBorder';
import FloatingInput from "@/components/FloatingInput";
import { gameConfig } from '@/config/gameConfig';
import PlayerCard from '@/components/PlayerCard';
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
  deleteRoom,
  hireBotAdmin,
  dismissBotAdmin,
} from './actions';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  X, 
  Trash2, 
  Pencil, 
  Check, 
  Plus, 
  Play, 
  Square, 
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Bot,
  UserPlus,
  Dices,
  Sparkles,
  Sliders,
  Cpu,
} from 'lucide-react';

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
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isLoginInvalid =
    username.length < 3 || username.length > 20 ||
    password.length < 6 || password.length > 20;

  const [players, setPlayers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const [confirmModal, setConfirmModal] = useState<any>({
    show: false, title: '', message: '', action: async () => {}, type: 'warning'
  });

  const [playerModal, setPlayerModal] = useState<any>({ show: false, player: null });
  const [previewImage, setPreviewImage] = useState<string | null>(null); // State for enlarged image

  // ---------------- BOT WORKSHOP STATE ----------------
  const [botName, setBotName] = useState('Kim Jun-hee');
  const [botAge, setBotAge] = useState('18');
  const [botPersonality, setBotPersonality] = useState('Strategic Thinker');
  const [botSystemInstructions, setBotSystemInstructions] = useState('');
  const [botTargetRoomId, setBotTargetRoomId] = useState<string>('');
  const [isHiringBot, setIsHiringBot] = useState(false);

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
      const res = await approvePlayer(id, selectedRoomId!);
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
    setIsCreating(true);
    const res = await createRoom(newRoomName);
    if (res.success) {
      notify(`Room "${newRoomName}" created!`, 'success');
      setNewRoomName('');
      fetchData();
    } else {
      notify(res.error || 'Failed to create room', 'error');
    }
    setIsCreating(false);
  };

  const handleRenameRoom = async (roomId: string) => {
    if (!editRoomName.trim()) {
      notify('Room name cannot be empty', 'warning');
      return;
    }
    setIsProcessing(true);
    const res = await renameRoom(roomId, editRoomName.trim());
    if (res.success) {
      notify('Room renamed successfully', 'success');
      setEditingRoomId(null);
      fetchData();
    } else {
      notify(res.error || 'Failed to rename room', 'error');
    }
    setIsProcessing(false);
  };
  
  const handleChangeRoom = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await approvePlayer(id, selectedRoomId!);
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
  
  // ---------------- BOT WORKSHOP HANDLERS ----------------
  const handleRandomizeBotName = () => {
    audioEngine.playSelect();
    const names = [
      'Kim Jun-hee',
      'Lee Yoon-seo',
      'Shin So-mi',
      'Ko Kyung-jun',
      'Oh Jung-won',
      'Jin Da-bum',
      'Park Woo-ram',
      'Kim Dong-hyun',
      'Choi Mi-na',
      'Yoo Tae-sik',
      'Kang Min-jae',
      'Han Se-eun',
      'Bae Do-young',
      'Song Ji-hoo',
    ];
    const picked = names[Math.floor(Math.random() * names.length)];
    setBotName(picked);
  };

  const handleDeployBot = async () => {
    const targetRoom = botTargetRoomId || selectedRoomId || rooms[0]?.id;
    if (!targetRoom) {
      notify('Please select or create a room before deploying a bot!', 'warning');
      return;
    }
    if (!botName.trim()) {
      notify('Please provide a name for the bot.', 'warning');
      return;
    }

    setIsHiringBot(true);
    audioEngine.playClick();
    try {
      const res = await hireBotAdmin({
        roomId: targetRoom,
        username: botName.trim(),
        age: parseInt(botAge) || 18,
        personality: botPersonality,
        systemInstructions: botSystemInstructions.trim(),
      });

      if (res.success) {
        notify(`Bot "${botName.trim()}" carved & deployed!`, 'success');
        fetchData();
        handleRandomizeBotName();
      } else {
        notify(res.error || 'Failed to deploy bot.', 'error');
      }
    } catch (e: any) {
      notify(e.message || 'Failed to deploy bot.', 'error');
    } finally {
      setIsHiringBot(false);
    }
  };

  const handleDismissBot = async (botId: string, botUsername: string) => {
    openConfirm(
      'Dismiss Bot',
      `Permanently dismiss AI Bot "${botUsername}"?`,
      async () => {
        const res = await dismissBotAdmin(botId);
        if (res.success) {
          notify(`Bot "${botUsername}" dismissed`, 'info');
          fetchData();
        } else {
          notify(res.error || 'Failed to dismiss bot', 'error');
        }
      },
      'danger'
    );
  };

  const handleStartGame = async () => {
    if (!selectedRoomId) {
      notify("Please select a waiting room to start the game", 'warning');
      return;
    }
    setIsStarting(true);
    const res = await startGame(selectedRoomId);
    await fetchData();
    setIsStarting(false);
    if (res.success) {
      notify('Game started successfully!', 'success');
      try {
        sessionStorage.setItem('isAdmin', 'true');
        localStorage.setItem('isAdmin', 'true');
      } catch (_) {}
      router.push(`/game/${selectedRoomId}?admin=true`);
    } else {
      notify(res.error || 'Failed to start game', 'error');
    }
  };

  const handleStopGame = async () => {
    if (!selectedRoomId) {
      notify("Please select an in-game room to stop the game", 'warning');
      return;
    }
    setIsStopping(true);
    const res = await stopGame(selectedRoomId);
    await fetchData();
    setIsStopping(false);
    if (res.success) {
      notify('Game stopped successfully!', 'info');
    } else {
      notify(res.error || 'Failed to stop game', 'error');
    }
  };

  const openConfirm = (title: string, message: string, action: () => Promise<void>, type: any = 'warning') =>
    setConfirmModal({ show: true, title, message, action, type });

  const openPlayerModal = (player: any) => setPlayerModal({ show: true, player });

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const approvedPlayers = players.filter(p => p.status === 'approved');
  const rejectedPlayers = players.filter(p => p.status === 'rejected');
  
  const canStartGame = rooms.some(room => {
    const approvedPlayerCount = players.filter(p => p.room_id === room.id && p.status === 'approved').length;
  
    return room.status === 'waiting' && 
      approvedPlayerCount >= gameConfig.minPlayers &&
      approvedPlayerCount <= gameConfig.maxPlayers;
  });

  
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
                <EyeOff size={22} />  
              ) : (  
                <Eye size={22} />  
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
                handleStartGame();
              }} 
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg shadow font-medium"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isStarting ? 'Starting...' : 'Start Game'}</span>
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
              className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg shadow font-medium"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4 fill-current" />
              )}
              <span>{isStopping ? 'Stopping...' : 'Stop Game'}</span>
            </button>
          )}

          <button
            onMouseEnter={() => audioEngine.playHover()}
            onClick={() => {
              audioEngine.playClick();
              handleLogout();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
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
            placeholder="Room Name..."
            className="bg-white/10 px-4 py-2 rounded-lg text-white w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
         />
          <button
            onMouseEnter={() => audioEngine.playHover()}
            onClick={() => {
              audioEngine.playClick();
              handleCreateRoom();
            }}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 font-medium rounded-lg transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isCreating ? 'Creating...' : 'Create Room'}</span>
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {rooms.map(room => (
           <div 
             key={room.id} 
             onClick={() => {
               audioEngine.playClick();
               setSelectedRoomId(room.id);
               notify(`Selected Room: ${room.name}`, 'info');
             }}
             className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all ${
               selectedRoomId === room.id 
                 ? 'border-green-500 bg-green-900/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
                 : 'border-white/5 bg-white/5 hover:bg-white/10'
             }`}
           >
             <div className="flex-1 mr-4">
               {editingRoomId === room.id ? (
                 <input
                   autoFocus
                   value={editRoomName}
                   onChange={(e) => setEditRoomName(e.target.value)}
                   onClick={(e) => e.stopPropagation()} // Prevent selecting the room when clicking the input
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.stopPropagation();
                       handleRenameRoom(room.id);
                     } else if (e.key === 'Escape') {
                       e.stopPropagation();
                       setEditingRoomId(null);
                     }
                   }}
                   className="bg-black/50 px-3 py-1.5 rounded-lg text-white w-full border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                 />
               ) : (
                 <p className="font-bold text-lg truncate">{room.name}</p>
               )}
               {room.status === "in_game" ? (
                  <span className="text-xs font-bold text-red-400 bg-red-950/80 border border-red-600/50 inline-block px-2.5 py-0.5 rounded-full mt-1 animate-pulse">
                    Status: Running
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 capitalize bg-gray-800 inline-block px-2 py-0.5 rounded-full mt-1">
                    Status: {room.status}
                  </span>
                )}
             </div>
             
             <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
               {editingRoomId === room.id ? (
                 <>
                   <button 
                     onMouseEnter={() => audioEngine.playHover()}
                     onClick={() => handleRenameRoom(room.id)}
                     disabled={isProcessing}
                     className="p-1.5 bg-green-900/50 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                     title="Save Name"
                   >
                     <Check size={18} />
                   </button>
                   <button 
                     onMouseEnter={() => audioEngine.playHover()}
                     onClick={() => setEditingRoomId(null)}
                     className="p-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors"
                     title="Cancel"
                   >
                     <X size={18} />
                   </button>
                 </>
               ) : (
                 <>
                   <button 
                     onMouseEnter={() => audioEngine.playHover()}
                     onClick={() => {
                       audioEngine.playClick();
                       setEditingRoomId(room.id);
                       setEditRoomName(room.name);
                     }}
                     disabled={isProcessing}
                     className="p-1.5 bg-blue-900/50 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                     title="Rename Room"
                   >
                     <Pencil size={18} />
                   </button>
                   <button 
                     onMouseEnter={() => audioEngine.playHover()} 
                     onClick={() => {
                        audioEngine.playClick();
                        openConfirm(
                          "Delete Room",
                          `Are you sure you want to permanently delete room "${room.name}"? All assigned players will be unassigned.`,
                          () => handleDeleteRoom(room.id),
                          "danger"
                        );
                      }} 
                     disabled={isProcessing} 
                     className="p-1.5 bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                     title="Delete Room"
                   >
                     <Trash2 size={18} />
                   </button>
                 </>
               )}
            </div>
          </div>
        ))}
        {rooms.length === 0 && <p className="text-gray-500 italic py-2">No rooms created yet.</p>}
      </div>
     </div>

      {/* AI BOT WORKSHOP & HIRING STUDIO */}
      <div className="bg-gradient-to-br from-zinc-950 via-gray-900 to-black border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)] rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Bot size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">AI Bot Workshop</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  STUDIO
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Carve and deploy autonomous AI bots with custom names, ages, personalities, and behavioral system instructions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">
              Active Hired Bots:
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold font-mono text-sm">
              {players.filter((p) => p.is_bot).length}
            </span>
          </div>
        </div>

        {/* Bot Sculpting Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Column 1: Identity & Parameters */}
          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <h3 className="text-sm uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-2">
              <Cpu size={16} /> 1. Bot Identity & Room Assignment
            </h3>

            {/* Target Room */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Assigned Game Room
              </label>
              <select
                value={botTargetRoomId || selectedRoomId || (rooms[0]?.id || '')}
                onChange={(e) => setBotTargetRoomId(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.status})
                  </option>
                ))}
                {rooms.length === 0 && <option value="">No rooms available</option>}
              </select>
            </div>

            {/* Bot Name & Randomizer */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Bot Name / Alias
                </label>
                <button
                  type="button"
                  onClick={handleRandomizeBotName}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Dices size={14} /> Randomize
                </button>
              </div>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. Kim Jun-hee"
                className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Bot Age */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Student Age (10 - 20)
                </label>
                <span className="text-cyan-400 font-bold text-sm font-mono">{botAge} yrs</span>
              </div>
              <input
                type="range"
                min="10"
                max="20"
                value={botAge}
                onChange={(e) => setBotAge(e.target.value)}
                className="w-full accent-cyan-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* Personality Archetype */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Personality Archetype
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {[
                  { id: 'Leader', desc: 'Takes charge, directs votes.' },
                  { id: 'Quiet Observer', desc: 'Watches closely, speaks rarely.' },
                  { id: 'Funny / Comic', desc: 'Defuses tension with humor.' },
                  { id: 'Strategic Thinker', desc: 'Plans ahead, analyzes patterns.' },
                  { id: 'Mysterious', desc: 'Unpredictable, hard to read.' },
                  { id: 'Aggressive', desc: 'Quick to accuse, loud.' },
                  { id: 'Friendly', desc: 'Trusts easily, builds alliances.' },
                  { id: 'Cautious', desc: 'Avoids risks, calculates steps.' },
                  { id: 'Empathetic', desc: 'Reads emotion, detects panic.' },
                  { id: 'Rebellious', desc: 'Challenges authority, questions votes.' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playSelect();
                      setBotPersonality(p.id);
                    }}
                    className={`p-2 rounded-lg text-left text-xs border transition-all ${
                      botPersonality === p.id
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="font-semibold text-zinc-200">{p.id}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: System Instructions & Deployment */}
          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-sm uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-2 mb-3">
                <Sparkles size={16} /> 2. System Instructions & Behavior Directives
              </h3>

              {/* Behavior Prompt Presets */}
              <div className="mb-2">
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Quick Behavior Presets:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: 'Analytical Detective',
                      text: 'You are an analytical student who carefully monitors vote shifts, asks piercing questions during discussions, and votes with high logical conviction.'
                    },
                    {
                      label: 'Suspicious Accuser',
                      text: 'You are highly suspicious of quiet players. You challenge people who hesitate to vote and push hard to execute potential Mafia suspects.'
                    },
                    {
                      label: 'Deceptive Chameleon',
                      text: 'You act innocent, agree with popular opinions to avoid suspicion, and subtly steer blame away from allies during execution debates.'
                    },
                    {
                      label: 'Protective Guardian',
                      text: 'You prioritize building trust and defending innocent-looking classmates. You try to prevent reckless executions and urge calm.'
                    }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        audioEngine.playSelect();
                        setBotSystemInstructions(preset.text);
                      }}
                      className="px-2 py-1 rounded bg-black/40 hover:bg-cyan-950 text-[11px] text-cyan-300 border border-white/10 hover:border-cyan-500 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Instructions Textarea */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Custom AI Behavior Directives / Prompt
                </label>
                <textarea
                  rows={5}
                  value={botSystemInstructions}
                  onChange={(e) => setBotSystemInstructions(e.target.value)}
                  placeholder="Enter custom behavioral guidelines for this bot (e.g. Always defend your neighbor, speak in short nervous sentences, cast decisive votes against quiet suspects)..."
                  className="w-full bg-black/60 border border-white/20 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 custom-scrollbar resize-none font-mono"
                />
              </div>
            </div>

            {/* Deploy Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDeployBot}
                disabled={isHiringBot || rooms.length === 0}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isHiringBot ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Carving & Deploying Bot...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Deploy Bot to Room</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Active Bots Management Roster */}
        <div>
          <h3 className="text-sm uppercase tracking-wider font-bold text-zinc-300 mb-3 flex items-center gap-2">
            <Bot size={16} className="text-cyan-400" /> Active Hired Bots Roster ({players.filter((p) => p.is_bot).length})
          </h3>

          {players.filter((p) => p.is_bot).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {players
                .filter((p) => p.is_bot)
                .map((bot) => {
                  const assignedRoom = rooms.find((r) => r.id === bot.room_id);
                  const hasCustomInstructions = bot.avatar_base64 && bot.avatar_base64.startsWith('bot_prompt:');
                  const instructionsText = hasCustomInstructions
                    ? bot.avatar_base64.replace('bot_prompt:', '')
                    : null;

                  return (
                    <div
                      key={bot.id}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
                              <Bot size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-sm">{bot.username}</span>
                                <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-[10px] text-cyan-300 font-mono">
                                  BOT
                                </span>
                              </div>
                              <span className="text-xs text-zinc-400">
                                {bot.age} yrs • {bot.personality}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDismissBot(bot.id, bot.username)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Dismiss Bot"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mb-2">
                          <span className="font-semibold text-zinc-300">Room:</span>
                          <span className="font-mono text-cyan-300">
                            {assignedRoom ? assignedRoom.name : bot.room_id ? bot.room_id.substring(0, 8) : 'None'}
                          </span>
                        </div>

                        {instructionsText && (
                          <div className="p-2 rounded bg-black/40 border border-white/5 text-[11px] text-zinc-300 font-mono line-clamp-2" title={instructionsText}>
                            &quot;{instructionsText}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-zinc-500 italic text-xs py-2">
              No AI bots currently deployed. Use the workshop above to carve and hire bots for your rooms.
            </p>
          )}
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
                  openConfirm('Approve', `Approve ${p.username} into the selected room?`, () => handleApprovePlayer(p.id), 'success');
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
                          openConfirm('Change Room', `Change the room of ${p.username} to the selected room?`, () => handleChangeRoom(p.id), 'danger');
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
                          openConfirm('Change Room', `Change the room of ${p.username} to the selected room?`, () => handleChangeRoom(p.id), 'danger');
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
                    openConfirm('Approve', `Approve ${p.username} into the selected room?`, () => handleApprovePlayer(p.id), 'success');
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
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
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
                className={`flex items-center justify-center gap-2 disabled:opacity-50 px-5 py-2.5 rounded-lg font-bold transition-colors shadow-lg ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500' :
                  confirmModal.type === 'success' ? 'bg-green-600 hover:bg-green-500' :
                  'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isProcessing ? 'Processing...' : 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
