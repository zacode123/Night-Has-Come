export const gameConfig = {
  maxPlayers: 12,
  minPlayers: 4,
  maxMafia: 3,
  doctorCooldown: 1,
  nightDuration: 30, // seconds
  dayDuration: 60, // seconds
  voteDuration: 30, // seconds
  chatEnabled: true,
  voiceEnabled: true,
  soundEnabled: true,
  episodeMode: true,
  debugMode: process.env.NODE_ENV === 'development',
};
