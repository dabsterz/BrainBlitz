import { QRCodeSVG } from "qrcode.react";
import { Copy, Play, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import Mascot from "./Mascot.jsx";

export default function HostLobby({ state, onAction }) {
  const [joinBaseUrl, setJoinBaseUrl] = useState(window.location.origin);
  const joinUrl = `${joinBaseUrl}/join/${state.roomCode}`;

  useEffect(() => {
    let cancelled = false;

    fetch("/api/join-url")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.baseUrl) setJoinBaseUrl(data.baseUrl);
      })
      .catch(() => {
        if (!cancelled) setJoinBaseUrl(window.location.origin);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function copyJoinUrl() {
    await navigator.clipboard?.writeText(joinUrl);
  }

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-[390px_1fr]">
      <section className="hero-card text-center">
        <Mascot mood="wave" label="Join in!" />
        <p className="text-sm font-black uppercase tracking-wide text-pop">Scan to join</p>
        <div className="qr-portal mx-auto mt-4 w-fit rounded-3xl bg-white p-5 shadow-lift">
          <QRCodeSVG value={joinUrl} size={260} bgColor="#ffffff" fgColor="#141521" level="M" includeMargin />
        </div>
        <p className="mt-5 text-sm font-bold text-white/70">Room code</p>
        <div className="mt-2 rounded-2xl bg-ink px-4 py-3 text-5xl font-black tracking-[0.18em] text-pop">{state.roomCode}</div>
        <p className="mt-4 break-all rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/75">{joinUrl}</p>
        <button className="secondary-dark mt-4 w-full justify-center" onClick={copyJoinUrl}>
          <Copy size={20} />
          Copy Join Link
        </button>
      </section>

      <section className="hero-card flex min-h-[560px] flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-mint">Lobby</p>
            <h2 className="text-4xl font-black">Players joining live</h2>
          </div>
          <button className="primary-button" onClick={() => onAction("start_game")} disabled={state.players.length === 0}>
            <Play size={23} />
            Start Game
          </button>
        </div>

        {state.players.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-white/20 text-center">
            <div>
              <Users className="mx-auto text-white/50" size={48} />
              <p className="mt-3 text-xl font-bold text-white/70">Waiting for players</p>
              <p className="mt-1 font-semibold text-white/50">Phones will appear here as they join.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="avatar-parade" aria-hidden="true">
              {state.players.map((player, index) => (
                <span key={player.id} style={{ "--i": index }}>
                  {player.avatar}
                </span>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {state.players.map((player) => (
              <div key={player.id} className="player-tile">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="avatar-lg">{player.avatar}</span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">{player.name}</p>
                    <p className={`text-sm font-bold ${player.connected ? "text-mint" : "text-white/45"}`}>
                      {player.connected ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                <button className="icon-danger" title={`Remove ${player.name}`} onClick={() => onAction("remove_player", { playerId: player.id })}>
                  <Trash2 size={19} />
                </button>
              </div>
            ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
