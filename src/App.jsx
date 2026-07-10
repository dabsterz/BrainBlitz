import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Brain, CircleAlert, Gamepad2, Plus, ScanLine, Smartphone } from "lucide-react";
import { APP_CONFIG } from "./config.js";
import { socket } from "./socket.js";
import { AVATARS } from "./utils/validation.js";
import HostLobby from "./components/HostLobby.jsx";
import GameBoard from "./components/GameBoard.jsx";
import QuestionView from "./components/QuestionView.jsx";
import PlayerController from "./components/PlayerController.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import StageEffects from "./components/StageEffects.jsx";
import Mascot from "./components/Mascot.jsx";

function socketAck(event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function LandingPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createGame() {
    setCreating(true);
    setError("");
    const result = await socketAck("create_room", {});
    setCreating(false);
    if (!result?.ok) {
      setError(result?.error || "Could not create a room.");
      return;
    }

    sessionStorage.setItem(`brainblitz_host_${result.roomCode}`, result.hostToken);
    navigate(`/host/${result.roomCode}`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-party">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <div className="brand-chip">
            <Brain size={22} />
            <span>{APP_CONFIG.appName}</span>
          </div>
          <Link className="ghost-link" to="/join">
            Join with code
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-pool shadow-sm">
              Live room trivia for phones and shared screens
            </p>
            <h1 className="text-5xl font-black leading-tight text-ink sm:text-6xl lg:text-7xl">
              {APP_CONFIG.appName}
            </h1>
            <p className="mt-5 max-w-xl text-xl font-semibold leading-relaxed text-night/80">
              {APP_CONFIG.tagline}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="primary-button text-lg" onClick={createGame} disabled={creating}>
                <Plus size={24} />
                {creating ? "Creating..." : "Create Game"}
              </button>
              <Link className="secondary-button text-lg" to="/join">
                <Smartphone size={24} />
                Join Game
              </Link>
            </div>
            {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700">{error}</p> : null}
          </div>

          <div className="stage-panel relative">
            <div className="score-orbit">
              <span>100</span>
              <span>300</span>
              <span>500</span>
            </div>
            <div className="mock-board" aria-hidden="true">
              {["Movie", "Food", "World", "Science"].map((label, index) => (
                <div key={label} className="mock-column">
                  <div className="mock-header">{label}</div>
                  {[100, 200, 300, 400].map((value) => (
                    <div key={value} className={`mock-tile tile-${index}`}>
                      {value}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function HostPage() {
  const { roomCode } = useParams();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const hostToken = sessionStorage.getItem(`brainblitz_host_${roomCode}`);
    if (!hostToken) {
      setError("This browser does not have the host token for that room. Create a new game from the landing page.");
      return;
    }

    socket.emit("host_reconnect", { roomCode, hostToken }, (result) => {
      if (!result?.ok) {
        setError(result?.error || "Could not reconnect as host.");
        return;
      }
      setState(result.state);
    });

    const onSync = (nextState) => {
      if (nextState.roomCode === roomCode && nextState.role === "host") setState(nextState);
    };
    const onError = (message) => setNotice(message);
    socket.on("sync_state", onSync);
    socket.on("action_error", onError);
    return () => {
      socket.off("sync_state", onSync);
      socket.off("action_error", onError);
    };
  }, [roomCode]);

  const hostAction = (event, payload = {}) => socket.emit(event, { roomCode, ...payload });

  if (error) return <MessageScreen title="Host access needed" message={error} action={<Link className="primary-button" to="/">Create Game</Link>} />;
  if (!state) return <LoadingScreen text="Connecting host screen..." />;

  const content =
    state.gameStatus === "lobby" ? (
      <HostLobby state={state} onAction={hostAction} />
    ) : state.currentQuestion ? (
      <QuestionView state={state} onAction={hostAction} />
    ) : (
      <GameBoard state={state} onAction={hostAction} />
    );

  return (
    <main className="min-h-screen bg-host text-white">
      <HostShell state={state} onAction={hostAction} notice={notice} setNotice={setNotice}>
        {content}
      </HostShell>
    </main>
  );
}

function HostShell({ state, children, onAction, notice, setNotice }) {
  const winner = state.players[0];

  return (
    <div className="mx-auto grid min-h-screen max-w-[1500px] gap-5 p-4 xl:grid-cols-[1fr_360px]">
      <StageEffects state={state} />
      <section className="flex min-h-0 flex-col">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pop text-ink">
                <Gamepad2 size={25} />
              </span>
              <div>
                <h1 className="text-2xl font-black">{APP_CONFIG.appName}</h1>
                <p className="text-sm font-semibold text-white/70">Room {state.roomCode}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="toggle-pill">
              <input
                type="checkbox"
                checked={state.settings.deductOnWrong}
                onChange={(event) => onAction("update_settings", { settings: { deductOnWrong: event.target.checked } })}
              />
              Deduct wrong answers
            </label>
            {state.gameStatus !== "finished" ? (
              <button className="small-danger" onClick={() => onAction("end_game")}>
                End Game
              </button>
            ) : (
              <button className="small-button" onClick={() => onAction("reset_game")}>
                Reset Game
              </button>
            )}
          </div>
        </header>

        {notice ? (
          <button className="mb-4 flex items-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-left font-bold text-red-800" onClick={() => setNotice("")}>
            <CircleAlert size={20} />
            {notice}
          </button>
        ) : null}

        {state.gameStatus === "finished" ? (
          <div className="hero-card winner-stage grid flex-1 place-items-center text-center">
            <div className="winner-rays" />
            <div className="relative z-10">
              <Mascot mood="celebrate" label="Winner!" />
              <p className="text-lg font-bold uppercase tracking-wider text-pop">Final results</p>
              <h2 className="mt-2 text-5xl font-black">{winner ? `${winner.avatar} ${winner.name} wins!` : "Game finished"}</h2>
              <p className="mt-3 text-2xl font-bold text-white/75">{winner ? `${winner.score} points` : "No players joined."}</p>
              <button className="primary-button mx-auto mt-7" onClick={() => onAction("reset_game")}>
                Reset Game
              </button>
            </div>
            {Array.from({ length: 28 }).map((_, index) => (
              <span className="winner-confetti" style={{ "--i": index }} key={index} />
            ))}
          </div>
        ) : (
          children
        )}
      </section>
      <aside className="min-h-0">
        <Leaderboard players={state.players} scoreChanges={state.recentScoreChanges} mode="host" onScore={(playerId, score) => onAction("update_score", { playerId, score })} />
      </aside>
    </div>
  );
}

function PlayerJoinPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState(params.roomCode || "");
  const [name, setName] = useState(localStorage.getItem("brainblitz_last_name") || "");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  async function joinGame(event) {
    event.preventDefault();
    setJoining(true);
    setError("");
    const result = await socketAck("join_room", { roomCode, name, avatar });
    setJoining(false);

    if (!result?.ok) {
      setError(result?.error || "Could not join that room.");
      return;
    }

    localStorage.setItem(`brainblitz_player_${result.roomCode}`, result.playerId);
    localStorage.setItem(`brainblitz_player_name_${result.roomCode}`, result.playerName);
    localStorage.setItem(`brainblitz_player_avatar_${result.roomCode}`, avatar);
    localStorage.setItem("brainblitz_last_name", result.playerName);
    navigate(`/play/${result.roomCode}`);
  }

  return (
    <main className="min-h-screen bg-player px-4 py-6 text-ink">
      <div className="mx-auto max-w-md">
        <Link className="brand-chip mb-8 inline-flex" to="/">
          <Brain size={22} />
          <span>{APP_CONFIG.appName}</span>
        </Link>
        <form className="join-card" onSubmit={joinGame}>
          <div className="mb-6">
            <p className="text-sm font-black uppercase tracking-wide text-pool">Player join</p>
            <h1 className="mt-1 text-4xl font-black">Get ready to buzz</h1>
          </div>

          <label className="field-label" htmlFor="roomCode">
            Room code
          </label>
          <input id="roomCode" className="text-field uppercase" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="ABC123" autoComplete="off" />

          <label className="field-label mt-5" htmlFor="name">
            Display name
          </label>
          <input id="name" className="text-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aunt Maya" maxLength={24} />

          <p className="field-label mt-5">Avatar</p>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((item) => (
              <button key={item} type="button" className={`avatar-button ${avatar === item ? "selected" : ""}`} onClick={() => setAvatar(item)}>
                {item}
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</p> : null}

          <button className="primary-button mt-6 w-full justify-center" type="submit" disabled={joining}>
            <ScanLine size={24} />
            {joining ? "Joining..." : "Join Game"}
          </button>
        </form>
      </div>
    </main>
  );
}

function PlayerPage() {
  const { roomCode } = useParams();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const playerId = useMemo(() => localStorage.getItem(`brainblitz_player_${roomCode}`), [roomCode]);

  useEffect(() => {
    if (!playerId) {
      setError("Join the room before opening the player controller.");
      return;
    }

    const name = localStorage.getItem(`brainblitz_player_name_${roomCode}`) || localStorage.getItem("brainblitz_last_name") || "Player";
    const avatar = localStorage.getItem(`brainblitz_player_avatar_${roomCode}`) || AVATARS[0];
    socket.emit("player_reconnect", { roomCode, playerId, name, avatar }, (result) => {
      if (!result?.ok) {
        setError(result?.error || "Could not reconnect to this game.");
        return;
      }
      setState(result.state);
    });

    const onSync = (nextState) => {
      if (nextState.roomCode === roomCode && nextState.role === "player") setState(nextState);
    };
    const onError = (message) => setError(message);
    socket.on("sync_state", onSync);
    socket.on("action_error", onError);
    return () => {
      socket.off("sync_state", onSync);
      socket.off("action_error", onError);
    };
  }, [roomCode, playerId]);

  if (error) return <MessageScreen title="Controller unavailable" message={error} action={<Link className="primary-button" to={`/join/${roomCode}`}>Join Room</Link>} />;
  if (!state) return <LoadingScreen text="Connecting controller..." />;

  return <PlayerController state={state} onBuzz={() => socket.emit("player_buzz", { roomCode, playerId })} />;
}

function LoadingScreen({ text }) {
  return (
    <main className="grid min-h-screen place-items-center bg-party px-5 text-center">
      <div className="join-card max-w-md">
        <Brain className="mx-auto text-plum" size={42} />
        <p className="mt-4 text-xl font-black">{text}</p>
      </div>
    </main>
  );
}

function MessageScreen({ title, message, action }) {
  return (
    <main className="grid min-h-screen place-items-center bg-party px-5 text-center">
      <div className="join-card max-w-lg">
        <CircleAlert className="mx-auto text-coral" size={44} />
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className="mt-3 font-semibold text-night/70">{message}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/host/:roomCode" element={<HostPage />} />
      <Route path="/join" element={<PlayerJoinPage />} />
      <Route path="/join/:roomCode" element={<PlayerJoinPage />} />
      <Route path="/play/:roomCode" element={<PlayerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
