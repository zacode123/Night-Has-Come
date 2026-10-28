export const personalityBorder: Record<string, string> = {
  "Leader": "border-red-500 border-2",
  "Quiet Observer": "border-sky-500 border-2",
  "Funny / Comic": "border-amber-400 border-2",
  "Strategic Thinker": "border-violet-500 border-2",
  "Mysterious": "border-indigo-500 border-2",
  "Aggressive": "border-orange-600 border-2",
  "Friendly": "border-emerald-500 border-2",
  "Cautious": "border-amber-600 border-2",
  "Empathetic": "border-pink-400 border-2",
  "Rebellious": "border-fuchsia-600 border-2",
  default: "border-white border-2"
};

export function getPersonalityBorder(personality?: string) {
  if (!personality) return personalityBorder.default;
  return personalityBorder[personality] || personalityBorder.default;
}
