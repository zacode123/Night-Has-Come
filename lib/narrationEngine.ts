import { supabase } from './supabaseClient';

export const narrationEngine = {
  async generateNarration(roomId: string, phase: string, event: string) {
    // This would typically call an AI service to generate text
    // For now, we'll use predefined templates or simple logic
    
    let narration = '';
    
    switch (phase) {
      case 'Night':
        narration = 'Night falls again. Someone in the room is about to make a deadly choice.';
        break;
      case 'Morning':
        narration = 'Morning arrives. But someone will never wake up again.';
        break;
      case 'Discussion':
        narration = 'The sun rises, revealing the horrors of the night. Who is responsible?';
        break;
      case 'Voting':
        narration = 'The time has come to decide. Who will be banished?';
        break;
      case 'Execution':
        narration = 'The votes are counted. The decision is final.';
        break;
      default:
        narration = 'The game continues...';
    }

    // Store narration in episodes table if needed
    // await supabase.from('episodes').insert({ ... });

    return narration;
  },

  speak(text: string) {
    // Use Web Speech API for client-side TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      // Configure voice (e.g., rate, pitch, voice selection)
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      
      // Try to find a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Web Speech API not supported');
    }
  },

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  // Alias for backward compatibility if needed, though speak is preferred
  async playVoice(text: string) {
    this.speak(text);
  }
};
