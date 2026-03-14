'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EXIF from 'exif-js';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabaseClient';
import { audioEngine } from '@/lib/audioEngine';
import DrippingText from "@/components/DrippingText";
import GlobalTouchGlow from '@/components/GlobalTouchGlow';
import Background3D from '@/components/Background3D';
import { getPersonalityBorder } from '@/lib/personalityBorder';

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [SignInName, setSignInName] = useState('');
  const [SignInPassword, setSignInPassword] = useState('');
  const [age, setAge] = useState('');
  const [personality, setPersonality] = useState('Leader');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signInError, setSignInError] = useState('');
  const isSignUpInvalid = isSubmitting || name.length < 3 || name.length > 20 || password.length < 6 || password.length > 10 || Number(age) < 10 || Number(age) > 20;
  const isSignInInvalid = SignInName.length < 3 || SignInName.length > 20 || SignInPassword.length < 6 || SignInPassword.length > 10;
  const router = useRouter();

  const personalities = [
    { id: 'Leader', desc: 'Takes charge, makes decisions.' },
    { id: 'Quiet Observer', desc: 'Watches closely, speaks rarely.' },
    { id: 'Funny / Comic', desc: 'Defuses tension with humor.' },
    { id: 'Strategic Thinker', desc: 'Plans ahead, analyzes everything.' },
    { id: 'Mysterious', desc: 'Hard to read, unpredictable.' },
    { id: 'Aggressive', desc: 'Quick to accuse, loud.' },
    { id: 'Friendly', desc: 'Trusts easily, builds alliances.' }
  ];

  useEffect(() => {
    const checkStatus = async () => {
      // First check if game has started
      const { data: room } = await supabase
        .from('rooms')
        .select('status')
        .eq('room_code', 'MAFIA')
        .single();

      const gameStarted = room?.status === 'started';
      const storedId = Cookies.get('playerId') || localStorage.getItem('playerId');

      if (gameStarted) {
        if (storedId) {
          // If player exists, redirect to game
          router.push('/game/MAFIA');
        } else {
          // If no player, redirect to "Game Started" page
          router.push('/started');
        }
        return;
      }

      if (storedId) {
        const { data, error } = await supabase
          .from('players')
          .select('status, username')
          .eq('id', storedId)
          .single();
        
        if (data) {
          Cookies.set('playerStatus', data.status, { expires: 7 });
          
          if (data.status === 'approved') {
            router.push('/approved');
          } else if (data.status === 'rejected') {
            router.push('/rejected');
          } else if (data.status === 'pending') {
            router.push('/lobby');
          }
        } else {
          localStorage.removeItem('playerId');
          Cookies.remove('playerId');
          Cookies.remove('playerStatus');
        }
      }
    };
    
    checkStatus();
  }, [router]);

  const handleEnter = () => {
    setHasEntered(true);
    audioEngine.init();
    audioEngine.startMainMenuAmbient();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (SignInName.length < 3) {
      setSignInError('Minimum username length is 3!');
      return;
    } else {
      setSignInError('');
    }
    if (SignInName.length > 20) {
      setSignInError('Maximum username length is 20!');
      return;
    } else {
      setSignInError('');
    }
    if (SignInPassword.length < 6) {
      setSignInError('Minimum password length is 6!');
      return;
    } else {
      setSignInError('');
    }
    if (SignInPassword.length > 10) {
      setSignInError('Maximum password length is 10!');
      return;
    } else {
      setSignInError('');
    }
    const password_hash = await hash(SignInPassword);
    const {data} = await supabase.from('players').select('*').eq('username', SignInName).eq('password_hash', password_hash).single();
    if(!data){
      setSignInError('Invalid username or password!');
      return;
    } else{
      setSignInError('');
    }
    localStorage.setItem('playerId', data.id);
    Cookies.set('playerId', data.id, {expires:7});
    router.push('/lobby');
  };
  
  async function hash(d: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(d);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSignUpError("Image must be smaller than 2MB!");
      return;
    } else {
      setSignUpError('');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const size = 96; // final avatar size
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = size;
        canvas.height = size;

        if (img instanceof HTMLImageElement) {
          // Get orientation from EXIF
          EXIF.getData(img, function() {
            const orientation = EXIF.getTag(this, "Orientation") || 1;

            // Pre-rotate the canvas to fix orientation
            switch(orientation) {
              case 2: ctx.transform(-1, 0, 0, 1, size, 0); break; // horizontal flip
              case 3: ctx.transform(-1, 0, 0, -1, size, size); break; // 180 rotate
              case 4: ctx.transform(1, 0, 0, -1, 0, size); break; // vertical flip
              case 5: ctx.transform(0, 1, 1, 0, 0, 0); break; // rotate 90 + flip
              case 6: ctx.transform(0, 1, -1, 0, size, 0); break; // rotate 90
              case 7: ctx.transform(0, -1, -1, 0, size, size); break; // rotate -90 + flip
              case 8: ctx.transform(0, -1, 1, 0, 0, size); break; // rotate -90
              default: break;
            }

            // Calculate square crop to preserve central part
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;

            // Draw circular mask
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Draw image cropped to square inside circle
            ctx.drawImage(
              img,
              sx, sy, minSide, minSide,  // source crop
              0, 0, size, size           // destination canvas
            );

            // Export final avatar
            const compressed = canvas.toDataURL("image/jpeg", 0.6);
            setAvatar(compressed);
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (name.length < 3) {
      setSignUpError('Minimum username length is 3!');
      setIsSubmitting(false);
      return;
    } else {
      setSignUpError('');
    }
    if (name.length > 20) {
      setSignUpError('Maximum username length us 20!');
      setIsSubmitting(false);
      return;
    } else {
      setSignUpError('');
    }
    if (password.length < 6) {
      setSignUpError('Minimum password length is 6!');
      setIsSubmitting(false);
      return;
    } else {
      setSignUpError('');
    }
    if (password.length > 10) {
      setSignUpError('Maximum password length us 10!');
      setIsSubmitting(false);
      return;
    } else {
      setSignUpError('');
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 20) {
      setSignUpError('Age must be between 10 and 20.');
      setIsSubmitting(false);
      return;
    } else {
      setSignUpError('');
    }
    
    try {
      // Check for duplicate name
      const { data: existingUser } = await supabase
        .from('players')
        .select('id')
        .eq('username', name)
        .maybeSingle();

      if (existingUser) {
        setSignUpError('User already registered! Please login.');
        setIsSubmitting(false);
        return;
      } else {
        setSignUpError('');
      }

      if (name.toLowerCase().includes('@zahid')) {
        setSignUpError('');
        setName(name.replace('@', ''));
      } else if (name.toLowerCase().includes('zahid')) {
        setSignUpError('Are you trying to be oversmart? Please choose another name.');
        setIsSubmitting(false);
        return;
      } else {
        setSignUpError('');
      }

      const password_hash = await hash(password);
      
      // Create player
      const { data, error } = await supabase.from('players').insert({
        username: name,
        age: parseInt(age),
        personality: personality,
        password_hash: password_hash,
        avatar_base64: avatar,
        status: 'pending',
        alive: true,
        connected: true
      }).select().single();

      if (error) throw error;

      if (data) {
        await fetch('/api/notify-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            personality,
            age,
            avatar
          })
        });
          
        localStorage.setItem('playerId', data.id);
        Cookies.set('playerId', data.id, { expires: 7 });
        Cookies.set('playerStatus', 'pending', { expires: 7 });
        router.push('/lobby');
      }
    } catch (error) {
      console.error('Error joining:', error);
      setSignUpError('Failed to join. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!hasEntered) {
    return (
      <div 
        className="min-h-screen bg-black flex items-center justify-center cursor-pointer"
        onClick={handleEnter}
      >
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-red-500 font-serif tracking-widest text-2xl"
        >
          CLICK ANYWHERE TO ENTER
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200 relative overflow-hidden flex flex-col items-center justify-center perspective-[1000px]">
      {/* Admin Icon */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/admin">
          <motion.div
            whileHover={{ scale: 1.1, textShadow: '0 0 8px rgb(220, 38, 38)' }}
            whileTap={{ scale: 0.9 }}
            className="text-red-500/50 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Shield size={24} />
            <span className="text-sm tracking-widest uppercase font-bold hidden sm:inline-block">Admin</span>
          </motion.div>
        </Link>
      </div>

      {/* Cinematic Thriller Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,0,0,0.8)_0%,rgba(0,0,0,1)_100%)]" />
        <motion.div 
          animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center mix-blend-overlay"
        />
        {/* Neon Red Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/30 rounded-full blur-[120px]" />
      </div>

      {/* 3D Floating Elements */}
      <Background3D />

      {/* Main Content */}
      <div className="relative z-10 text-center flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
        <motion.div 
          initial={{ opacity: 0, z: -100 }}
          animate={{ 
            opacity: 1, 
            z: 0,
            y: [0, -15, 0] 
          }}
          transition={{ 
            opacity: { duration: 1.5 },
            z: { duration: 1.5 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="mb-0 py-0"
        >
          <DrippingText 
            text="NIGHT HAS COME" 
            className="text-5xl sm:text-9xl lg:text-8xl font-['var(--font-nosifer)'] font-black tracking-[0.05em] text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.9)] drop-shadow-[0_0_30px_rgba(220,38,38,0.7)]"
          />
        </motion.div>

        <div className="relative inline-block">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              y: [0, -5, 0]
            }}
            transition={{ 
              opacity: { duration: 1, delay: 0.5 },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
            }}
            className="text-sm sm:text-xl font-bold text-zinc-300 tracking-widest mb-8 px-6 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]"
          >
            Trust no one. Survive the night.
          </motion.p>
          <span className="absolute -top-4 -right-4 bg-red-600 text-black text-xs font-bold px-2 py-[2px] rounded-xl shadow-[0_0_10px_rgba(220,38,38,0.9)]">BETA</span>
        </div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: '0 0 40px rgba(220, 38, 38, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)'
          }}
          whileTap={{ scale: 0.95 }}
          onHoverStart={() => audioEngine.playHover()}
          onClick={() => {
            audioEngine.playClick();
            setShowSignUpModal(true);
          }}
          className="sm:px-12 sm:py-6 px-6 py-3 rounded-[25px] border-2 border-red-600 bg-red-900/30 backdrop-blur-sm flex items-center justify-center text-xl tracking-widest hover:bg-red-800/50 transition-all text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
        >
          ▶ PLAY
        </motion.button>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-12 sm:text-sm text-red-400 text-xs tracking-widest uppercase font-bold drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
          style={{ textShadow: '0 0 10px rgba(220,38,38,0.8), 0 0 20px rgba(220,38,38,0.6)' }}
        >
          Created by Zahid Arman
        </motion.p>
      </div>

      {/* Sign Up Modal */}
      <AnimatePresence>
        {showSignUpModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, rotateX: 10 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: 20, rotateX: -10 }}
              className="bg-black/80 border border-red-600/50 p-8 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.h2 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-3xl font-serif text-red-500 mb-6 text-center drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]"
              >
                Sign Up
              </motion.h2>
              
              <form onSubmit={handleSignUp} className="space-y-6">
                {signUpError && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-sm text-center">
                    {signUpError}
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <label className="text-sm text-red-400 mb-3 uppercase tracking-wider flex justify-between items-center">Profile Picture
                    <span className="flex items-center normal-case text-xs text-red-300" style={{ marginRight: '3px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M444-288h72v-240h-72v240Zm61.5-322.29q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29ZM480.28-96Q401-96 331-126t-122.5-82.5Q156-261 126-330.96t-30-149.5Q96-560 126-629.5q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5T834-629.28q30 69.73 30 149Q864-401 834-331t-82.5 122.5Q699-156 629.28-126q-69.73 30-149 30Zm-.28-72q130 0 221-91t91-221q0-130-91-221t-221-91q-130 0-221 91t-91 221q0 130 91 221t221 91Zm0-312Z"/></svg>
                    Minimum profile picture size 2MB.</span>
                  </label>        
                  <div className="relative w-24 h-24 self-center">
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} id="avatarUpload" className="hidden" />
                    {/* Image Preview */}
                    <div
                      className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-red-950/30 cursor-pointer transition-all duration-300 border-4 ${getPersonalityBorder(personality)}`}
                      onMouseEnter={() => audioEngine.playHover()}
                      onClick={() => {
                        audioEngine.playClick();
                        if (avatar) {
                          setShowAvatarPreview(true);
                        } else {
                          const input = document.getElementById('avatarUpload') as HTMLInputElement;
                          if (input) input.click();
                        }
                      }}
                    >
                      {avatar ? (
                        <img src={avatar} className="w-full h-full object-cover"/>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#F87171"><path d="M480-480q-51 0-85.5-34.5T360-600q0-50 34.5-85t85.5-35q50 0 85 35t35 85q0 51-35 85.5T480-480Zm-.35-60q25.35 0 42.85-17.15t17.5-42.5q0-25.35-17.35-42.85t-43-17.5Q454-660 437-642.65t-17 43Q420-574 437.15-557t42.5 17ZM240-240v-76q0-27 17.5-47.5T300-397q42-22 86.94-32.5 44.95-10.5 93-10.5Q528-440 573-429.5t87 32.5q25 13 42.5 33.5T720-316v76H240Zm147-127q-45 13-87 39v28h360v-28q-42-26-87-39t-93-13q-48 0-93 13Zm93-233Zm92.77 300H660 300h272.77ZM140-80q-24 0-42-18t-18-42v-172h60v172h172v60H140ZM80-648v-172q0-24 18-42t42-18h172v60H140v172H80ZM648-80v-60h172v-172h60v172q0 24-18 42t-42 18H648Zm172-568v-172H648v-60h172q24 0 42 18t18 42v172h-60Z"/></svg>
                      )}
                    </div>
                   {avatar && (
                     <label htmlFor="avatarUpload" className="absolute bottom-0 left-0 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center border-2 border-black cursor-pointer" onMouseEnter={() => audioEngine.playHover()} onClick={() => audioEngine.playClick()}>
                       <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#FFFFFF"><path d="M479.5-267q72.5 0 121.5-49t49-121.5q0-72.5-49-121T479.5-607q-72.5 0-121 48.5t-48.5 121q0 72.5 48.5 121.5t121 49Zm0-60q-47.5 0-78.5-31.5t-31-79q0-47.5 31-78.5t78.5-31q47.5 0 79 31t31.5 78.5q0 47.5-31.5 79t-79 31.5ZM140-120q-24 0-42-18t-18-42v-513q0-23 18-41.5t42-18.5h147l73-87h240l73 87h147q23 0 41.5 18.5T880-693v513q0 24-18.5 42T820-120H140Zm0-60h680v-513H645l-73-87H388l-73 87H140v513Zm340-257Z"/></svg>
                     </label>
                   )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder=" "
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={3}
                      className="peer w-full bg-red-950/20 border border-red-900/50 rounded-lg px-4 py-3 text-red-100 focus:outline-none focus:border-red-500 focus:border-3 transition-colors"
                    />
                    <label className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 text-base transition-all duration-200 bg-black px-2
                      peer-placeholder-shown:top-1/2
                      peer-placeholder-shown:text-base
                      peer-focus:top-0
                      peer-focus:text-sm
                      peer-focus:left-2
                      peer-not-placeholder-shown:top-0
                      peer-not-placeholder-shown:text-sm"
                    >Username</label>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      placeholder=" "
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="peer w-full bg-red-950/20 border border-red-900/50 rounded-lg px-4 py-3 text-red-100 focus:outline-none focus:border-red-500 focus:border-3 transition-colors"
                    />
                    <label className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 text-base transition-all duration-200 bg-black px-2
                      peer-placeholder-shown:top-1/2
                      peer-placeholder-shown:text-base
                      peer-focus:top-0
                      peer-focus:text-sm
                      peer-focus:left-2
                      peer-not-placeholder-shown:top-0
                      peer-not-placeholder-shown:text-sm"
                    >Password</label>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="number"
                      placeholder=" "
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min={10}
                      max={20}
                      required
                      className="peer w-full bg-red-950/20 border border-red-900/50 rounded-lg px-4 py-3 text-red-100 focus:outline-none focus:border-red-500 focus:border-3 transition-colors"
                    />
                    <label className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 text-base transition-all duration-200 bg-black px-2
                      peer-placeholder-shown:top-1/2
                      peer-placeholder-shown:text-base
                      peer-focus:top-0
                      peer-focus:text-sm
                      peer-focus:left-2
                      peer-not-placeholder-shown:top-0
                      peer-not-placeholder-shown:text-sm"
                    >Age (10-20)</label>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Coming Soon"
                      disabled
                      className="w-full bg-red-950/20 border border-red-900/50 rounded-lg px-4 py-3 text-red-100 cursor-not-allowed"
                    />
                    <label className="absolute left-4 -top-2 text-red-400 text-sm bg-black px-2">Special Feature</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-red-400 mb-2 uppercase tracking-wider">Choose Your Personality</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {personalities.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          audioEngine.playSelect();
                          setPersonality(p.id);
                        }}
                        className={`cursor-pointer p-3 rounded-lg transition-all ${
                          personality === p.id 
                            ? 'bg-red-900/50 border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                            : 'bg-black/50 border border-red-800 focus:border-red-400'
                        }`}
                      >
                        <div className="text-red-200 font-medium mb-1">{p.id}</div>
                        <div className="text-red-500/70 text-xs">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button 
                    type="button"
                    onMouseEnter={() => audioEngine.playHover()}
                    onClick={() => {
                      audioEngine.playClick();
                      setShowSignUpModal(false);
                    }}
                    className="flex-1 py-3 border border-red-700/50 text-red-500 rounded-lg focus:border-2 focus:border-red-500 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    onMouseEnter={() => {
                      if (!isSignUpInvalid) audioEngine.playHover();
                    }}
                    onClick={() => {
                      if (!isSignUpInvalid) audioEngine.playClick();
                    }}
                    className={`flex-1 py-3 bg-red-700 text-white rounded-lg font-medium ${ isSignUpInvalid ? 'opacity-50' : 'hover:bg-red-600 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)]'}`}
                  >
                    {isSubmitting ? 'Signing up...' : 'Sign Up'}
                  </button>
                </div>
                <p
                  onClick={()=>{
                    setShowSignUpModal(false)
                    setShowSignInModal(true)
                  }}
                  className="text-center text-sm text-white/70 mt-4 cursor-pointer hover:text-white/90"
                >Already have an account?<span className="text-red-500 hover:text-red-400"> Sign in</span></p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignInModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-black/80 border border-red-600/50 p-8 rounded-2xl w-full max-w-sm sm:max-w-md shadow-[0_0_40px_rgba(220,38,38,0.2)]"
            >
              <button
                onClick={() => {
                  audioEngine.playClick();
                  setShowSignInModal(false);
                  setShowSignUpModal(true);
                }}
                className="text-red-400 hover:text-red-300 mb-4 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#FFFFFF"><path d="M650-80 250-480l400-400 61 61.67L372.67-480 711-141.67 650-80Z"/></svg>
              Back</button>
              <h2 className="text-2xl text-red-500 mb-4 text-center">Sign In</h2>

              {signInError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-sm text-center mb-4">
                  {signInError}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={SignInName}
                    onChange={(e) => setSignInName(e.target.value)}
                    placeholder=""
                    minLength={3}
                    className="peer w-full px-4 pt-6 pb-2 bg-red-950/20 border border-red-900/50 focus:border-3 focus:border-red-500 focus:outline-none rounded-lg text-red-100 placeholder-transparent"
                    required
                  />
                  <label className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 text-sm transition-all duration-200 bg-black/90 px-2
                    peer-placeholder-shown:top-1/2
                    peer-placeholder-shown:text-base
                    peer-focus:top-0
                    peer-focus:text-sm
                    peer-focus:left-2
                    peer-not-placeholder-shown:top-0
                    peer-not-placeholder-shown:text-sm"
                  >
                    Username
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="password"
                    value={SignInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder=""
                    minLength={6}
                    className="peer w-full px-4 pt-6 pb-2 bg-red-950/20 border border-red-900/50 focus:border-3 focus:border-red-500 focus:outline-none rounded-lg text-red-100 placeholder-transparent"
                    required
                  />
                  <label className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 text-sm transition-all duration-200 bg-black/90 px-2
                    peer-placeholder-shown:top-1/2
                    peer-placeholder-shown:text-base
                    peer-focus:top-0
                    peer-focus:text-sm
                    peer-focus:left-2
                    peer-not-placeholder-shown:top-0
                    peer-not-placeholder-shown:text-sm"
                  >
                    Password
                  </label>
                </div>

                <button
                  type="submit"
                  onMouseEnter={() => {
                    if (!isSignInInvalid) audioEngine.playHover();
                  }}
                  onClick={() => {
                    if (!isSignInInvalid) audioEngine.playClick();
                  }}
                  className={`w-full py-3 bg-red-700 rounded-lg ${isSignInInvalid ? 'opacity-50' : 'hover:bg-red-600'}`}
                >
                  Login
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Preview Modal */}
      <AnimatePresence>
        {showAvatarPreview && avatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setShowAvatarPreview(false)}
          >
            <motion.img
              src={avatar}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className={`w-48 h-48 sm:w-64 sm:h-64 rounded-full object-cover border-4 ${getPersonalityBorder(personality)}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
