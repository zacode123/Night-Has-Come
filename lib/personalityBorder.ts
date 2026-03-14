export const personalityBorder: Record<string, string> = {
  "Leader": "border-red-500 border-2 ring-4 ring-red-400",
  "Quiet Observer": "border-sky-500 border-2 ring-4 ring-sky-400",
  "Funny / Comic": "border-amber-400 border-2 ring-4 ring-amber-300",
  "Strategic Thinker": "border-violet-500 border-2 ring-4 ring-violet-400",
  "Mysterious": "border-indigo-500 border-2 ring-4 ring-indigo-400",
  "Aggressive": "border-orange-600 border-2 ring-4 ring-orange-400",
  "Friendly": "border-emerald-500 border-2 ring-4 ring-emerald-400",
  "Cautious": "border-amber-600 border-2 ring-4 ring-amber-500",
  "Empathetic": "border-pink-400 border-2 ring-4 ring-pink-300",
  "Rebellious": "border-fuchsia-600 border-2 ring-4 ring-fuchsia-400",
  default: "border-white border-2 ring-2 ring-white/30"
};

export function getPersonalityBorder(personality?: string) {
  if (!personality) return personalityBorder.default;
  return personalityBorder[personality] || personalityBorder.default;
}
