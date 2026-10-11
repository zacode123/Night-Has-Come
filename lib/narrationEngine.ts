type NarrationListener = (payload: { title: string; message: string; phase?: string }) => void;

class NarrationEngine {
  private listeners: Set<NarrationListener> = new Set();
  private customTtsEndpoint: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('night_has_come_custom_tts');
      if (stored) {
        this.customTtsEndpoint = stored;
      }
    }
  }

  /**
   * Set custom TTS endpoint provided by the user (or via settings).
   * Will persist in localStorage for the session.
   */
  public setCustomTtsEndpoint(endpoint: string | null) {
    this.customTtsEndpoint = endpoint;
    if (typeof window !== 'undefined') {
      if (endpoint) {
        localStorage.setItem('night_has_come_custom_tts', endpoint);
      } else {
        localStorage.removeItem('night_has_come_custom_tts');
      }
    }
  }

  public getCustomTtsEndpoint(): string | null {
    return this.customTtsEndpoint;
  }

  public subscribe(listener: NarrationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcastAnnouncement(title: string, message: string, phase?: string) {
    this.listeners.forEach((fn) => fn({ title, message, phase }));
    this.speak(message);
  }

  public async speak(text: string) {
    if (typeof window === 'undefined') return;

    this.stop();

    // 1. Try Custom TTS Endpoint if provided
    if (this.customTtsEndpoint) {
      try {
        const res = await fetch(this.customTtsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('audio') || contentType.includes('octet-stream')) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            this.currentAudio = new Audio(url);
            this.currentAudio.play();
            return;
          } else {
            const data = await res.json();
            if (data.audioUrl || data.audio) {
              const src = data.audioUrl || (data.audio.startsWith('data:') ? data.audio : `data:audio/wav;base64,${data.audio}`);
              this.currentAudio = new Audio(src);
              this.currentAudio.play();
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Custom TTS endpoint call failed, falling back to Web Speech:', err);
      }
    }

    // 2. Try Server-Side TTS route (/api/tts)
    try {
      const apiRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.audio) {
          const src = `data:${data.mimeType || 'audio/wav'};base64,${data.audio}`;
          this.currentAudio = new Audio(src);
          await this.currentAudio.play();
          return;
        }
      }
    } catch {
      // Continue to Web Speech fallback
    }

    // 3. High-quality Web Speech API fallback with dramatic thriller tone
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.88; // slightly slower for ominous suspense
        utterance.pitch = 0.75; // deeper thriller voice
        
        const voices = window.speechSynthesis.getVoices();
        const eerieVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Male') ||
              v.name.includes('Google') ||
              v.name.includes('David') ||
              v.name.includes('Alex') ||
              v.name.includes('Natural'))
        );
        if (eerieVoice) {
          utterance.voice = eerieVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis error:', e);
      }
    }
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getPhaseNarration(phase: string, dayNumber = 1): { title: string; subtitle: string } {
    switch (phase) {
      case 'Night':
        return {
          title: `NIGHT ${dayNumber} CURFEW`,
          subtitle: 'Lights are out. The Mafia is choosing their prey in the darkness.',
        };
      case 'Morning':
        return {
          title: `DAY ${dayNumber} MORNING HAS BROKEN`,
          subtitle: 'The sirens blare. The retreat center tallies the survivors.',
        };
      case 'Discussion':
        return {
          title: `INVESTIGATION & ALIBIS`,
          subtitle: 'Share clues. The Mafia walks disguised among the living.',
        };
      case 'Voting':
        return {
          title: `VOTING TIME: CAST YOUR VOTE`,
          subtitle: 'Failing to cast a vote or crossing the boundary results in instant execution.',
        };
      case 'Execution':
        return {
          title: `SENTENCE CARRIED OUT`,
          subtitle: 'The votes are sealed. The condemned student is eliminated.',
        };
      case 'GameEnd':
        return {
          title: `SIMULATION TERMINATED`,
          subtitle: 'The night has finally come to an end.',
        };
      default:
        return {
          title: 'YOOIL RETREAT CENTER',
          subtitle: 'Obey the rules. Do not attempt to leave the perimeter.',
        };
    }
  }
}

export const narrationEngine = new NarrationEngine();
