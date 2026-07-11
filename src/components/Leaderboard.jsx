import { Crown, Minus, Plus, Trophy } from "lucide-react";
import { useState } from "react";

export default function Leaderboard({ players, scoreChanges = [], mode = "host", onScore }) {
  const [editing, setEditing] = useState(null);
  const panelClass = mode === "host" ? "leaderboard-panel" : mode === "display" ? "display-leaderboard" : "phone-leaderboard";
  const titleClass = mode === "display" ? "text-4xl font-black" : mode === "host" ? "text-3xl font-black" : "text-2xl font-black";

  return (
    <section className={panelClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-pop">Leaderboard</p>
          <h2 className={titleClass}>Scores</h2>
        </div>
        <Trophy className="text-pop" size={30} />
      </div>

      <div className="space-y-3">
        {players.length ? (
          players.map((player, index) => {
            const recent = scoreChanges.find((change) => change.playerId === player.id);
            return (
              <div className="leader-row" key={player.id}>
                <div className="rank">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">
                    {index === 0 ? <Crown className="mr-1 inline text-pop" size={18} /> : null}
                    {player.avatar} {player.name}
                  </p>
                  <p className={`text-xs font-bold ${player.connected ? "text-mint" : "text-white/40"}`}>
                    {player.connected ? "Online" : "Offline"}
                    {recent ? ` · ${recent.reason}` : ""}
                  </p>
                </div>
                {mode === "host" && onScore ? (
                  <div className="score-edit">
                    <button title={`Subtract 100 from ${player.name}`} onClick={() => onScore(player.id, player.score - 100)}>
                      <Minus size={16} />
                    </button>
                    <input
                      aria-label={`Score for ${player.name}`}
                      value={editing?.id === player.id ? editing.value : player.score}
                      onChange={(event) => setEditing({ id: player.id, value: event.target.value })}
                      onBlur={() => {
                        if (editing?.id === player.id && String(editing.value).trim() !== "") onScore(player.id, editing.value);
                        setEditing(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                    <button title={`Add 100 to ${player.name}`} onClick={() => onScore(player.id, player.score + 100)}>
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="score-display">{player.score}</div>
                )}
                {recent && recent.delta !== 0 ? (
                  <span className={`score-pop ${recent.delta > 0 ? "positive" : "negative"}`}>
                    {recent.delta > 0 ? `+${recent.delta}` : recent.delta}
                  </span>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="rounded-xl bg-white/10 p-4 text-center font-bold text-white/55">No players yet.</p>
        )}
      </div>

      {mode === "host" && scoreChanges.length ? (
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="mb-2 text-sm font-black uppercase tracking-wide text-white/50">Recent score changes</p>
          {scoreChanges.slice(0, 4).map((change) => (
            <div className="flex justify-between gap-3 py-1 text-sm font-bold" key={change.id}>
              <span className="truncate">{change.name}</span>
              <span className={change.delta >= 0 ? "text-mint" : "text-coral"}>{change.delta >= 0 ? `+${change.delta}` : change.delta}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
