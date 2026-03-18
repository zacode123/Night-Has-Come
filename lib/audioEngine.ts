// lib/audioEngine.ts

class AudioEngine {
  private sfx: Record<string, HTMLAudioElement> = {};
  private ambientSounds: Record<string, HTMLAudioElement> = {};
  private loadingAmbients: Set<string> = new Set();
  private currentAmbientName: string | null = null;
  private fadeInterval: any = null;
  private audioCtx: AudioContext | null = null;
  private ambientNodes: Record<string, MediaElementAudioSourceNode> = {};
  private gainNode: GainNode | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Preload SFX
      this.preloadSFX('notification', 'https://actions.google.com/sounds/v1/cartoon/pop.ogg');
      this.preloadSFX('voteTick', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      this.preloadSFX('death', 'https://actions.google.com/sounds/v1/impacts/crash.ogg');
      this.preloadSFX('roleReveal', 'https://actions.google.com/sounds/v1/science_fiction/alien_breath.ogg');
      this.preloadSFX('victory', 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg');
      this.preloadSFX('defeat', 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg');
    }
  }

  init() {
    if (typeof window !== 'undefined') {
      (window as any).audioEngine = this;
      
      // Try to resume immediately if called from a user gesture
      this.getAudioContext();

      // Setup Media Session API for better background/notification handling
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          if (this.currentAmbientName) this.playAmbient(this.currentAmbientName);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.stopAmbient();
        });
      }

      // Preload ambient sounds
      this.preloadAmbient('nightAmbient', 'https://actions.google.com/sounds/v1/weather/thunderstorm.ogg');
      this.preloadAmbient('discussionAmbient', 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg');
      this.preloadAmbient('mainMenuAmbient', 'https://actions.google.com/sounds/v1/science_fiction/ringing_ambient_background.ogg');
    }
  }

  private getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.connect(this.audioCtx.destination);
      this.gainNode.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
    }
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume().then(() => {
        console.log("AudioContext resumed successfully");
        // If an ambient was supposed to be playing, try to play it again
        if (this.currentAmbientName) {
          this.playAmbient(this.currentAmbientName);
        }
      }).catch(err => {
        console.error("Failed to resume AudioContext:", err);
      });
    }
    return this.audioCtx;
  }

  private preloadSFX(name: string, url: string) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.sfx[name] = audio;
  }

  private preloadAmbient(name: string, url: string) {
    if (this.ambientSounds[name]) return;
    
    this.loadingAmbients.add(name);
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    
    const checkReady = () => {
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or better
        console.log(`Ambient ${name} is ready to play (readyState: ${audio.readyState})`);
        this.ambientSounds[name] = audio;
        this.loadingAmbients.delete(name);
        if (this.currentAmbientName === name) {
          this.playAmbient(name);
        }
        audio.removeEventListener('canplaythrough', checkReady);
        audio.removeEventListener('canplay', checkReady);
      }
    };

    audio.addEventListener('canplaythrough', checkReady);
    audio.addEventListener('canplay', checkReady);

    audio.onerror = (e) => {
      console.error(`Failed to load ambient: ${name}`, e);
      this.loadingAmbients.delete(name);
    };

    // Force load
    audio.load();
    
    // Fallback check in case events don't fire
    setTimeout(checkReady, 2000);
  }

  private playAmbient(name: string) {
    this.currentAmbientName = name;
    const audio = this.ambientSounds[name];
    const ctx = this.getAudioContext();
    
    if (!audio || !ctx) {
      console.log(`Ambient ${name} or AudioContext not ready yet, will play when loaded`);
      return;
    }

    // If it's already playing, don't restart it
    if (!audio.paused && this.currentAmbientName === name) return;
    
    this.stopAmbient();
    this.currentAmbientName = name;

    // Connect to AudioContext if not already connected
    if (!this.ambientNodes[name]) {
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(this.gainNode!);
        this.ambientNodes[name] = source;
      } catch (e) {
        console.warn(`Source already connected for ${name}, skipping connection.`);
      }
    }

    // Update Media Session metadata
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: name === 'mainMenuAmbient' ? 'Night Has Come - Main Menu' : 
               name === 'nightAmbient' ? 'Night Has Come - Night Phase' : 
               'Night Has Come - Discussion',
        artist: 'Zahid Arman',
        album: ' Night Has Come Soundtrack',
        artwork: [
          { src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=512&q=80', sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
      
      // Update playback position for notification bar
      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration || 0,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      }
    }

    audio.volume = 1.0; // Control volume via GainNode instead
    this.gainNode!.gain.cancelScheduledValues(ctx.currentTime);
    this.gainNode!.gain.setValueAtTime(0, ctx.currentTime);
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log(`Successfully playing ambient: ${name}`);
        // Fade in using GainNode
        this.gainNode!.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 2);
      }).catch(e => {
        if (e.name === 'NotAllowedError') {
          console.log(`Autoplay blocked for ${name}, waiting for user interaction.`);
        } else {
          console.error(`Error playing ${name}:`, e);
        }
        // If play failed, try to resume context and play again on next interaction
        this.getAudioContext();
      });
    }
  }

  stopAmbient() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const ctx = this.getAudioContext();
    if (this.currentAmbientName && this.ambientSounds[this.currentAmbientName] && ctx && this.gainNode) {
      const audio = this.ambientSounds[this.currentAmbientName];
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }

      // Fade out using GainNode
      this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      
      setTimeout(() => {
        if (this.currentAmbientName === null) {
          audio.pause();
          audio.currentTime = 0;
        }
      }, 1100);
    }
    
    this.currentAmbientName = null;
  }

  private playCinematicSound(type: 'hover' | 'click' | 'select') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Add slight pitch variation (±10%)
    const pitchFactor = 0.9 + Math.random() * 0.2;

    if (type === 'hover') {
      // Soft electric pulse / low heartbeat
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(45 * pitchFactor, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20 * pitchFactor, ctx.currentTime + 1.5);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.6);
    } else if (type === 'select') {
      // Modern UI Click (Sharp, high-frequency tick)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500 * pitchFactor, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100 * pitchFactor, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Deep Thriller Click (Sharp UI tick + deep sub thud)
      
      // 1. Sharp high-frequency tick
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.connect(tickGain);
      tickGain.connect(ctx.destination);
      
      tickOsc.type = 'sine';
      tickOsc.frequency.setValueAtTime(2000 * pitchFactor, ctx.currentTime);
      tickOsc.frequency.exponentialRampToValueAtTime(100 * pitchFactor, ctx.currentTime + 0.08);
      
      tickGain.gain.setValueAtTime(0.4, ctx.currentTime);
      tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      
      tickOsc.start();
      tickOsc.stop(ctx.currentTime + 0.1);
      
      // 2. Deep sub thud
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90 * pitchFactor, ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(15 * pitchFactor, ctx.currentTime + 2.0);
      
      subGain.gain.setValueAtTime(0.6, ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
      
      subOsc.start();
      subOsc.stop(ctx.currentTime + 2.1);
      
      // 3. Add a little rumble (sine instead of sawtooth for smoother "non-vibrate" feel)
      const rumbleOsc = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      rumbleOsc.connect(filter);
      filter.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);
      
      rumbleOsc.type = 'sine'; // Changed from sawtooth to sine for smoother tail
      rumbleOsc.frequency.setValueAtTime(35 * pitchFactor, ctx.currentTime);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 2.5);
      
      rumbleGain.gain.setValueAtTime(0.2, ctx.currentTime);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      
      rumbleOsc.start();
      rumbleOsc.stop(ctx.currentTime + 2.6);
    }
  }

  private playSound(name: string) {
    const audio = this.sfx[name];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => {
        if (e.name === 'NotAllowedError') {
          console.log(`Autoplay blocked for SFX ${name}, waiting for user interaction.`);
        } else {
          console.warn(`Error playing SFX ${name}:`, e);
        }
      });
    } else {
      console.warn(`SFX ${name} not loaded.`);
    }
  }

  playHover() {
    this.playCinematicSound('hover');
  }

  playClick() {
    this.playCinematicSound('click');
  }

  playSelect() {
    this.playCinematicSound('select');
  }

  playNotification() {
    this.playSound('notification');
  }

  playVoteTick() {
    this.playSound('voteTick');
  }

  playDeathSound() {
    this.playSound('death');
  }

  playRoleReveal() {
    this.playSound('roleReveal');
  }

  playVictory() {
    this.playSound('victory');
  }

  playDefeat() {
    this.playSound('defeat');
  }

  startMainMenuAmbient() {
    this.playAmbient('mainMenuAmbient');
  }

  startNightAmbient() {
    this.playAmbient('nightAmbient');
  }

  startDiscussionMusic() {
    this.playAmbient('discussionAmbient');
  }
}

export const audioEngine = new AudioEngine();
