// lib/audioEngine.ts

class AudioEngine {
  private sounds: Record<string, HTMLAudioElement> = {};
  private ambientSound: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.sounds = {
        notification: new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'),
        voteTick: new Audio('https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg'),
        death: new Audio('https://actions.google.com/sounds/v1/horror/aggressive_zombie_snarls.ogg'),
        roleReveal: new Audio('https://actions.google.com/sounds/v1/science_fiction/alien_breath.ogg'),
        victory: new Audio('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'),
        defeat: new Audio('https://actions.google.com/sounds/v1/horror/ambient_hum_pitched.ogg'),
        nightAmbient: new Audio('https://actions.google.com/sounds/v1/horror/hallow_wind.ogg'),
        discussionAmbient: new Audio('https://actions.google.com/sounds/v1/science_fiction/suspense_builder.ogg'),
        mainMenuAmbient: new Audio('https://actions.google.com/sounds/v1/science_fiction/ringing_ambient_background.ogg')
      };
      
      // Configure ambient sounds to loop with a fade
      this.setupLoopWithFade(this.sounds.nightAmbient);
      this.setupLoopWithFade(this.sounds.discussionAmbient);
      this.setupLoopWithFade(this.sounds.mainMenuAmbient);
      
      this.sounds.voteTick.volume = 1.0;
    }
  }

  private setupLoopWithFade(audio: HTMLAudioElement) {
    audio.loop = true;
    
    audio.addEventListener('timeupdate', () => {
      const fadeTime = 2.0; // 2 seconds fade in/out
      if (audio.duration > 0) {
        if (audio.currentTime >= audio.duration - fadeTime) {
          // Fade out
          audio.volume = Math.max(0, (audio.duration - audio.currentTime) / fadeTime);
        } else if (audio.currentTime < fadeTime) {
          // Fade in
          audio.volume = Math.min(1, audio.currentTime / fadeTime);
        } else {
          audio.volume = 1.0;
        }
      }
    });
  }

  private getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playCinematicSound(type: 'hover' | 'click') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'hover') {
      // Soft electric pulse / low heartbeat
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Deep click / thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  }

  private playSound(name: string) {
    if (this.sounds[name]) {
      this.sounds[name].currentTime = 0;
      this.sounds[name].play().catch(e => console.error(`Error playing ${name}:`, e));
    }
  }

  playHover() {
    this.playCinematicSound('hover');
  }

  playClick() {
    this.playCinematicSound('click');
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
    this.stopAmbient();
    this.ambientSound = this.sounds.mainMenuAmbient;
    if (this.ambientSound) {
      this.ambientSound.play().catch(e => console.error('Error playing main menu ambient:', e));
    }
  }

  startNightAmbient() {
    this.stopAmbient();
    this.ambientSound = this.sounds.nightAmbient;
    if (this.ambientSound) {
      this.ambientSound.play().catch(e => console.error('Error playing night ambient:', e));
    }
  }

  startDiscussionMusic() {
    this.stopAmbient();
    this.ambientSound = this.sounds.discussionAmbient;
    if (this.ambientSound) {
      this.ambientSound.play().catch(e => console.error('Error playing discussion ambient:', e));
    }
  }

  stopAmbient() {
    if (this.ambientSound) {
      this.ambientSound.pause();
      this.ambientSound.currentTime = 0;
      this.ambientSound = null;
    }
  }
}

export const audioEngine = new AudioEngine();
