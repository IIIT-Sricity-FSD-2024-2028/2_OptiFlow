export const AVATAR_PALETTES = [
  { id: 'indigo', name: 'Indigo Violet', bg: 'bg-indigo-600', gradient: 'bg-gradient-to-tr from-indigo-600 to-violet-500', ring: 'ring-indigo-100', text: 'text-white' },
  { id: 'blue', name: 'Ocean Blue', bg: 'bg-blue-600', gradient: 'bg-gradient-to-tr from-blue-600 to-sky-500', ring: 'ring-blue-100', text: 'text-white' },
  { id: 'emerald', name: 'Emerald Teal', bg: 'bg-emerald-600', gradient: 'bg-gradient-to-tr from-emerald-600 to-teal-500', ring: 'ring-emerald-100', text: 'text-white' },
  { id: 'violet', name: 'Royal Purple', bg: 'bg-violet-600', gradient: 'bg-gradient-to-tr from-violet-600 to-fuchsia-500', ring: 'ring-violet-100', text: 'text-white' },
  { id: 'rose', name: 'Crimson Rose', bg: 'bg-rose-600', gradient: 'bg-gradient-to-tr from-rose-600 to-pink-500', ring: 'ring-rose-100', text: 'text-white' },
  { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-600', gradient: 'bg-gradient-to-tr from-amber-600 to-orange-500', ring: 'ring-amber-100', text: 'text-white' },
  { id: 'cyan', name: 'Cyan Azure', bg: 'bg-cyan-600', gradient: 'bg-gradient-to-tr from-cyan-600 to-blue-500', ring: 'ring-cyan-100', text: 'text-white' },
  { id: 'slate', name: 'Charcoal Zinc', bg: 'bg-slate-800', gradient: 'bg-gradient-to-tr from-slate-800 to-slate-950', ring: 'ring-slate-100', text: 'text-white' },
];

/**
 * Deterministically picks a palette based on string input (e.g. email, user ID, full name)
 */
export function getDeterministicPalette(seed) {
  if (!seed) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

/**
 * Retrieves the effective avatar palette for a user:
 * 1. Checks user-selected custom preference in localStorage
 * 2. Falls back to deterministic seed from email / id / name
 */
export function getUserAvatarPalette(user) {
  if (!user) return AVATAR_PALETTES[0];
  const userKey = user.id || user.email || 'guest';
  try {
    const savedId = localStorage.getItem(`optiflow_avatar_palette_${userKey}`);
    if (savedId) {
      const match = AVATAR_PALETTES.find((p) => p.id === savedId);
      if (match) return match;
    }
  } catch (e) {
    // localStorage might be unavailable
  }

  const seed = user.email || user.fullName || user.id || 'optiflow';
  return getDeterministicPalette(seed);
}

/**
 * Saves the user's chosen palette and triggers an event for instant UI sync
 */
export function setUserAvatarPalette(user, paletteId) {
  if (!user) return;
  const userKey = user.id || user.email || 'guest';
  try {
    localStorage.setItem(`optiflow_avatar_palette_${userKey}`, paletteId);
    window.dispatchEvent(new CustomEvent('optiflow:avatar_color_change', {
      detail: { userKey, paletteId }
    }));
  } catch (e) {
    console.error('Failed to save avatar palette preference:', e);
  }
}
