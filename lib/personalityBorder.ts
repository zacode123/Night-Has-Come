export const personalityBorder: Record<string, string> = {
  "Leader": "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]",
  "Quiet Observer": "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]",
  "Funny / Comic": "border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]",
  "Strategic Thinker": "border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]",
  "Mysterious": "border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]",
  "Aggressive": "border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]",
  "Friendly": "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]",
  default: "border-white"
};

export function getPersonalityBorder(personality?: string) {
  if (!personality) return personalityBorder.default;
  return personalityBorder[personality] || personalityBorder.default;
}
