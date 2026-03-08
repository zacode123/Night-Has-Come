export class AudioEngine {
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async loadSound(name: string, url: string) {
    if (!this.context) return;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
    } catch (error) {
      console.error(`Failed to load sound ${name}:`, error);
    }
  }

  playSound(name: string, loop = false, volume = 1.0) {
    if (!this.isEnabled || !this.context) return null;
    const buffer = this.sounds.get(name);
    if (!buffer) return null;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start(0);
    return { source, gainNode };
  }

  stopSound(sourceObj: { source: AudioBufferSourceNode, gainNode: GainNode } | null) {
    if (sourceObj) {
      sourceObj.source.stop();
    }
  }
}

export const audioEngine = new AudioEngine();
