export type SoundCategory = 
  | 'notification' 
  | 'night_ambient' 
  | 'discussion_music' 
  | 'vote_tick' 
  | 'death_sound' 
  | 'role_reveal' 
  | 'victory' 
  | 'defeat'
  | 'button_click'
  | 'chat_ping'
  | 'suspense_ambience'
  | 'night_horror_drone'
  | 'vote_drum_hit';

export const soundConfig: Record<SoundCategory, { src: string; volume: number; loop: boolean }> = {
  notification: { src: '/sounds/notification.mp3', volume: 0.5, loop: false },
  night_ambient: { src: '/sounds/night_ambient.mp3', volume: 0.3, loop: true },
  discussion_music: { src: '/sounds/discussion_music.mp3', volume: 0.2, loop: true },
  vote_tick: { src: '/sounds/vote_tick.mp3', volume: 0.4, loop: false },
  death_sound: { src: '/sounds/death_sound.mp3', volume: 0.8, loop: false },
  role_reveal: { src: '/sounds/role_reveal.mp3', volume: 0.6, loop: false },
  victory: { src: '/sounds/victory.mp3', volume: 0.7, loop: false },
  defeat: { src: '/sounds/defeat.mp3', volume: 0.7, loop: false },
  button_click: { src: '/sounds/button_click.mp3', volume: 0.5, loop: false },
  chat_ping: { src: '/sounds/chat_ping.mp3', volume: 0.4, loop: false },
  suspense_ambience: { src: '/sounds/suspense_ambience.mp3', volume: 0.2, loop: true },
  night_horror_drone: { src: '/sounds/night_horror_drone.mp3', volume: 0.3, loop: true },
  vote_drum_hit: { src: '/sounds/vote_drum_hit.mp3', volume: 0.6, loop: false },
};
