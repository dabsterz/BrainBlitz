const AVATARS = ["⚡", "🎯", "🚀", "🌟", "🎲", "🧠", "🏆", "🔥", "🍿", "🎵", "🌈", "🕹️"];

export function sanitizePlayerName(name) {
  return String(name || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

export function sanitizeRoomCode(code) {
  return String(code || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
}

export function sanitizeAvatar(avatar) {
  return AVATARS.includes(avatar) ? avatar : "⚡";
}

export { AVATARS };
