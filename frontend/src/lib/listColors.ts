export const LIST_COLORS = [
  { name: "emerald",  icon: "bg-emerald-100",  pinned: "bg-emerald-50",  pinnedRing: "ring-emerald-300",  ring: "ring-emerald-400" },
  { name: "teal",     icon: "bg-teal-100",     pinned: "bg-teal-50",     pinnedRing: "ring-teal-300",     ring: "ring-teal-400" },
  { name: "cyan",     icon: "bg-cyan-100",     pinned: "bg-cyan-50",     pinnedRing: "ring-cyan-300",     ring: "ring-cyan-400" },
  { name: "sky",      icon: "bg-sky-100",      pinned: "bg-sky-50",      pinnedRing: "ring-sky-300",      ring: "ring-sky-400" },
  { name: "blue",     icon: "bg-blue-100",     pinned: "bg-blue-50",     pinnedRing: "ring-blue-300",     ring: "ring-blue-400" },
  { name: "indigo",   icon: "bg-indigo-100",   pinned: "bg-indigo-50",   pinnedRing: "ring-indigo-300",   ring: "ring-indigo-400" },
  { name: "violet",   icon: "bg-violet-100",   pinned: "bg-violet-50",   pinnedRing: "ring-violet-300",   ring: "ring-violet-400" },
  { name: "purple",   icon: "bg-purple-100",   pinned: "bg-purple-50",   pinnedRing: "ring-purple-300",   ring: "ring-purple-400" },
  { name: "pink",     icon: "bg-pink-100",     pinned: "bg-pink-50",     pinnedRing: "ring-pink-300",     ring: "ring-pink-400" },
  { name: "rose",     icon: "bg-rose-100",     pinned: "bg-rose-50",     pinnedRing: "ring-rose-300",     ring: "ring-rose-400" },
  { name: "orange",   icon: "bg-orange-100",   pinned: "bg-orange-50",   pinnedRing: "ring-orange-300",   ring: "ring-orange-400" },
  { name: "amber",    icon: "bg-amber-100",    pinned: "bg-amber-50",    pinnedRing: "ring-amber-300",    ring: "ring-amber-400" },
] as const;

export type ListColorName = (typeof LIST_COLORS)[number]["name"];

export function getListColor(name?: string) {
  return LIST_COLORS.find((c) => c.name === name) ?? LIST_COLORS[0];
}
