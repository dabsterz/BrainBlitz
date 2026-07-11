import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Brain, Users, WifiOff } from "lucide-react";
import { APP_CONFIG } from "../config.js";
import GameBoard from "./GameBoard.jsx";
import Leaderboard from "./Leaderboard.jsx";
import Mascot from "./Mascot.jsx";
import QuestionView from "./QuestionView.jsx";
import StageEffects from "./StageEffects.jsx";

const STATUS_LABELS = {
  lobby: "Lobby",
  in_progress: "Game board",
  question_active: "Question",
  buzzing_open: "Buzz now",
  answer_review: "Answer review",
  finished: "Final results"
};

export default function DisplayView({ state }) {
  const winner = state.players[0];

  return (
    <main className="display-screen bg-host text-white">
      <StageEffects state={state} />
      <div className="display-shell">
        <header className="display-header">
          <div className="flex min-w-0 items-center gap-3">
            <span className="display-brand-icon">
              <Brain size={30} />
            </span>
            <div className="min-w-0">
              <h1>{APP_CONFIG.appName}</h1>
              <p>Room {state.roomCode}</p>
            </div>
          </div>
          <div className="display-status-row">
            {!state.hostConnected ? (
              <span className="display-alert">
                <WifiOff size={20} />
                Host offline
              </span>
            ) : null}
            <span className={`display-status ${state.gameStatus}`}>{STATUS_LABELS[state.gameStatus] || state.gameStatus}</span>
            <span className="display-player-count">
              <Users size={20} />
              {state.players.length}
            </span>
          </div>
        </header>

        {state.gameStatus === "lobby" ? (
          <DisplayLobby state={state} />
        ) : state.gameStatus === "finished" ? (
          <DisplayFinal winner={winner} state={state} />
        ) : (
          <div className="display-game-grid">
            <section className="flex min-h-0">
              {state.currentQuestion ? <QuestionView state={state} readOnly /> : <GameBoard state={state} readOnly />}
            </section>
            <aside className="min-h-0">
              <Leaderboard players={state.players} scoreChanges={state.recentScoreChanges} mode="display" />
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function DisplayLobby({ state }) {
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

  return (
    <section className="display-lobby">
      <div className="hero-card display-join-card">
        <Mascot mood="wave" label="Join in!" />
        <p className="text-sm font-black uppercase tracking-wide text-pop">Scan to play</p>
        <div className="qr-portal mx-auto mt-5 w-fit rounded-3xl bg-white p-5 shadow-lift">
          <QRCodeSVG value={joinUrl} size={300} bgColor="#ffffff" fgColor="#141521" level="M" includeMargin />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Room code</p>
        <div className="display-room-code">{state.roomCode}</div>
      </div>

      <div className="hero-card display-player-board">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-mint">Players</p>
            <h2>Ready to play</h2>
          </div>
          <span className="display-player-count large">
            <Users size={26} />
            {state.players.length}
          </span>
        </div>

        {state.players.length ? (
          <div className="display-player-grid">
            {state.players.map((player) => (
              <div key={player.id} className="display-player-tile">
                <span className="avatar-lg">{player.avatar}</span>
                <div className="min-w-0">
                  <p>{player.name}</p>
                  <span className={player.connected ? "text-mint" : "text-white/45"}>{player.connected ? "Ready" : "Offline"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="display-empty-players">Waiting for players</div>
        )}
      </div>
    </section>
  );
}

function DisplayFinal({ winner, state }) {
  return (
    <section className="display-final">
      <div className="hero-card winner-stage display-final-main">
        <div className="winner-rays" />
        <div className="relative z-10">
          <Mascot mood="celebrate" label="Winner!" />
          <p className="text-lg font-bold uppercase tracking-wider text-pop">Final results</p>
          <h2>{winner ? `${winner.avatar} ${winner.name} wins!` : "Game finished"}</h2>
          <p>{winner ? `${winner.score} points` : "No players joined."}</p>
        </div>
        {Array.from({ length: 28 }).map((_, index) => (
          <span className="winner-confetti" style={{ "--i": index }} key={index} />
        ))}
      </div>
      <Leaderboard players={state.players} scoreChanges={state.recentScoreChanges} mode="display" />
    </section>
  );
}
