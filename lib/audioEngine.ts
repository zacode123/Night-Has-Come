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

      // Preload ambient sounds (completely voice-free suspenseful ambiances)
      this.preloadAmbient('nightAmbient', 'https://actions.google.com/sounds/v1/weather/thunderstorm.ogg');
      this.preloadAmbient('discussionAmbient', 'https://actions.google.com/sounds/v1/science_fiction/low_frequency_drones.ogg');
      this.preloadAmbient('mainMenuAmbient', 'https://actions.google.com/sounds/v1/science_fiction/ringing_ambient_background.ogg');
    }
  }

  private synthNodes: { oscs: OscillatorNode[]; gain: GainNode } | null = null;

  private getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.connect(this.audioCtx.destination);
      this.gainNode.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
    }
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume().then(() => {
        if (this.currentAmbientName) {
          this.playAmbient(this.currentAmbientName);
        }
      }).catch(() => {
        // Ignored until user gesture
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
    // Do not set crossOrigin = 'anonymous' to prevent CORS blockages on external CDNs
    audio.src = url;
    audio.preload = 'auto';
    audio.loop = true;
    
    const checkReady = () => {
      if (audio.readyState >= 2) {
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

    audio.onerror = () => {
      // Gracefully fall back to procedural synthesis without throwing or logging console.error
      this.loadingAmbients.delete(name);
      if (this.currentAmbientName === name) {
        this.playProceduralDrone(name);
      }
    };

    // Force load
    audio.load();
    setTimeout(checkReady, 2000);
  }

  private playProceduralDrone(name: string) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.stopProceduralDrone();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const oscs: OscillatorNode[] = [];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.connect(masterGain);

    if (name === 'discussionAmbient') {
      // Suspenseful dual low-frequency beat drone
      filter.frequency.setValueAtTime(140, ctx.currentTime);
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1
      osc1.connect(filter);
      osc1.start();
      oscs.push(osc1);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(57.5, ctx.currentTime); // Detuned tension beat
      osc2.connect(filter);
      osc2.start();
      oscs.push(osc2);

      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(110, ctx.currentTime);
      osc3.connect(filter);
      osc3.start();
      oscs.push(osc3);

      masterGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 2);
    } else if (name === 'nightAmbient') {
      // Deep sub-bass dark rumble
      filter.frequency.setValueAtTime(90, ctx.currentTime);
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(40, ctx.currentTime);
      osc1.connect(filter);
      osc1.start();
      oscs.push(osc1);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(42.5, ctx.currentTime);
      osc2.connect(filter);
      osc2.start();
      oscs.push(osc2);

      masterGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 2);
    } else {
      // Ethereal fifth chord background
      filter.frequency.setValueAtTime(280, ctx.currentTime);
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, ctx.currentTime);
      osc1.connect(filter);
      osc1.start();
      oscs.push(osc1);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(165, ctx.currentTime); // E
      osc2.connect(filter);
      osc2.start();
      oscs.push(osc2);

      masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2);
    }

    this.synthNodes = { oscs, gain: masterGain };
  }

  private stopProceduralDrone() {
    if (this.synthNodes && this.audioCtx) {
      const { oscs, gain } = this.synthNodes;
      try {
        gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
        setTimeout(() => {
          oscs.forEach((osc) => {
            try {
              osc.stop();
              osc.disconnect();
            } catch (_) {}
          });
        }, 850);
      } catch (_) {}
      this.synthNodes = null;
    }
  }

  private playAmbient(name: string) {
    this.currentAmbientName = name;
    const audio = this.ambientSounds[name];

    // If audio element is available and ready, use it
    if (audio && audio.readyState >= 2) {
      if (!audio.paused && this.currentAmbientName === name) return;
      this.stopAmbient();
      this.currentAmbientName = name;

      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name === 'NotAllowedError') {
            console.log(`Autoplay waiting for user gesture for ${name}`);
          } else {
            // Fall back to Web Audio API drone
            this.playProceduralDrone(name);
          }
        });
      }
    } else {
      // Use built-in procedural synthesizer drone
      this.playProceduralDrone(name);
    }

    // Update Media Session metadata
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: name === 'mainMenuAmbient' ? 'Night Has Come - Main Menu' : 
                 name === 'nightAmbient' ? 'Night Has Come - Night Phase' : 
                 'Night Has Come - Discussion',
          artist: 'Night Has Come',
          album: 'Original Soundtrack',
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch (_) {}
    }
  }

  stopAmbient() {
    if (this.currentAmbientName && this.ambientSounds[this.currentAmbientName]) {
      const audio = this.ambientSounds[this.currentAmbientName];
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
    }
    this.stopProceduralDrone();

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
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

  playFootstep(isRunning: boolean = false) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Procedural synthetic footstep impact
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      const baseFreq = isRunning ? 95 : 75;
      osc.frequency.setValueAtTime(baseFreq + Math.random() * 20, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isRunning ? 400 : 300, now);

      gain.gain.setValueAtTime(isRunning ? 0.16 : 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isRunning ? 0.07 : 0.09));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }

  playJump() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.21);
    } catch (_) {}
  }

  playLand() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  playDoorPush() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Door creak / wood glide sound
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.15);
      osc.frequency.linearRampToValueAtTime(140, now + 0.35);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch (_) {}
  }

  playDoorLock() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Heavy mechanical bolt latch click
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.setValueAtTime(220, now + 0.04);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_) {}
  }

  playDoorUnlock() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Mechanical unlock double click
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.setValueAtTime(520, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
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

  stopAllVoice() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }
}

export const audioEngine = new AudioEngine();
