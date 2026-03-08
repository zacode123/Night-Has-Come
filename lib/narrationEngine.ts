// lib/narrationEngine.ts

class NarrationEngine {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = this.loadVoices.bind(this);
      }
    } else {
      this.synth = {} as SpeechSynthesis;
    }
  }

  private loadVoices() {
    if (!this.synth.getVoices) return;
    const voices = this.synth.getVoices();
    // Try to find a dramatic/deep voice (e.g., Google UK English Male, or any deep voice)
    this.voice = voices.find(v => v.name.includes('Google UK English Male')) || 
                 voices.find(v => v.lang === 'en-GB') || 
                 voices[0] || null;
  }

  speak(text: string) {
    if (!this.synth.speak) return;
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.pitch = 0.5; // Lower pitch for dramatic effect
    utterance.rate = 0.85; // Slower rate
    this.synth.speak(utterance);
  }

  stop() {
    if (!this.synth.cancel) return;
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }
}

export const narrationEngine = new NarrationEngine();
