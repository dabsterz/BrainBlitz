import { Brain, Trophy, WifiOff, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import Leaderboard from "./Leaderboard.jsx";

export default function PlayerController({ state, onBuzz }) {
  const previousCanBuzz = useRef(state.canBuzz);
  const player = state.player;
  const question = state.currentQuestion;
  const someoneElseBuzzed = state.currentBuzzer && state.currentBuzzer.playerId !== player?.id;
  const youBuzzed = state.currentBuzzer?.playerId === player?.id || (state.buzzed && !someoneElseBuzzed);
  const disabled = !state.canBuzz;

  let buttonText = "Buzzing Closed";
  if (state.canBuzz) buttonText = "Buzz In";
  if (youBuzzed) buttonText = "You buzzed!";
  if (someoneElseBuzzed) buttonText = "Someone else buzzed first";
  if (player?.answerStatus === "incorrect") buttonText = "Marked Incorrect";
  if (player?.answerStatus === "correct") buttonText = "Marked Correct";

  useEffect(() => {
    if (!previousCanBuzz.current && state.canBuzz && "vibrate" in navigator) {
      navigator.vibrate([80, 40, 120]);
    }
    previousCanBuzz.current = state.canBuzz;
  }, [state.canBuzz]);

  function handleBuzz() {
    if ("vibrate" in navigator) navigator.vibrate(45);
    onBuzz();
  }

  return (
    <main className="min-h-screen bg-player px-4 py-4 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col gap-4">
        <header className="phone-top">
          <div className="flex items-center gap-3">
            <span className="avatar-lg">{player?.avatar || "⚡"}</span>
            <div className="min-w-0">
              <p className="truncate text-xl font-black">{player?.name}</p>
              <p className="text-sm font-bold text-night/55">Room {state.roomCode}</p>
            </div>
          </div>
          <div className="score-pill">{player?.score || 0}</div>
        </header>

        {!state.hostConnected ? (
          <div className="phone-alert">
            <WifiOff size={21} />
            Host disconnected. Waiting for the host screen to reconnect.
          </div>
        ) : null}

        <section className="phone-question">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-wide text-pool">Current question</p>
            {question ? <span className="rounded-full bg-pop px-3 py-1 text-sm font-black">{question.value}</span> : null}
          </div>
          {question ? (
            <>
              <h1 className="mt-3 text-2xl font-black">{question.category}</h1>
              <p className="mt-3 text-lg font-bold leading-snug text-night/80">{question.question}</p>
              {question.answerRevealed ? <p className="mt-4 rounded-xl bg-mint/20 p-3 font-black">Answer: {question.answer}</p> : null}
            </>
          ) : (
            <div className="grid min-h-[180px] place-items-center text-center">
              <div>
                <Brain className="mx-auto text-plum" size={38} />
                <p className="mt-2 font-black text-night/65">Waiting for the host to pick a question.</p>
              </div>
            </div>
          )}
        </section>

        <button className={`buzz-button ${state.canBuzz ? "active" : ""} ${youBuzzed ? "buzzed" : ""} ${someoneElseBuzzed ? "too-late" : ""}`} disabled={disabled} onClick={handleBuzz}>
          <Zap size={44} />
          <span>{buttonText}</span>
        </button>

        {state.currentBuzzer ? (
          <div className="phone-status">
            <Trophy size={22} />
            {state.currentBuzzer.playerId === player?.id ? "You are answering now." : `${state.currentBuzzer.name} is answering.`}
          </div>
        ) : (
          <div className="phone-status muted">{state.gameStatus === "buzzing_open" ? "Tap fast when you know it." : "Get ready. The host controls the buzzer."}</div>
        )}

        <Leaderboard players={state.players} scoreChanges={state.recentScoreChanges} mode="player" />
      </div>
    </main>
  );
}
