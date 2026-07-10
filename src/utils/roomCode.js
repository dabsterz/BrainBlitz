const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode(existingCodes = new Set(), length = 6) {
  let code = "";

  do {
    code = Array.from({ length }, () => {
      const index = Math.floor(Math.random() * ALPHABET.length);
      return ALPHABET[index];
    }).join("");
  } while (existingCodes.has(code));

  return code;
}
