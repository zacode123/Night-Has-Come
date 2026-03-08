export class NarrationEngine {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private isEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0] || null;
  }

  speak(text: string) {
    if (!this.isEnabled || !this.synth) return;
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const narrationEngine = new NarrationEngine();
