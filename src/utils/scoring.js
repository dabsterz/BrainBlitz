export function scoreDeltaForAnswer({ value, isCorrect, deductOnWrong }) {
  if (isCorrect) return value;
  return deductOnWrong ? -value : 0;
}

export function rankPlayers(players) {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
}
