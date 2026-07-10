import { useEffect, useRef, useState } from "react";
import { PartyPopper, Zap } from "lucide-react";

export default function StageEffects({ state }) {
  const previous = useRef({ gameStatus: state.gameStatus, buzzerId: state.currentBuzzer?.playerId, scoreChangeId: state.recentScoreChanges?.[0]?.id });
  const [effect, setEffect] = useState(null);

  useEffect(() => {
    const last = previous.current;
    const newestScoreChange = state.recentScoreChanges?.[0];

    if (last.gameStatus !== "buzzing_open" && state.gameStatus === "buzzing_open") {
      setEffect({ type: "buzz", title: "Buzz Now!", subtitle: "Fast fingers, big points" });
    } else if (state.currentBuzzer && last.buzzerId !== state.currentBuzzer.playerId) {
      setEffect({ type: "buzzer", title: `${state.currentBuzzer.name} buzzed first!`, subtitle: "Spotlight is on" });
    } else if (newestScoreChange && newestScoreChange.id !== last.scoreChangeId && newestScoreChange.delta !== 0) {
      setEffect({
        type: newestScoreChange.delta > 0 ? "correct" : "incorrect",
        title: newestScoreChange.delta > 0 ? `+${newestScoreChange.delta}` : `${newestScoreChange.delta}`,
        subtitle: newestScoreChange.name
      });
    }

    previous.current = {
      gameStatus: state.gameStatus,
      buzzerId: state.currentBuzzer?.playerId,
      scoreChangeId: newestScoreChange?.id
    };
  }, [state]);

  useEffect(() => {
    if (!effect) return undefined;
    const timeout = window.setTimeout(() => setEffect(null), effect.type === "buzz" ? 1450 : 1800);
    return () => window.clearTimeout(timeout);
  }, [effect]);

  if (!effect) return null;

  return (
    <div className={`stage-effect stage-effect-${effect.type}`}>
      <div className="stage-burst" />
      <div className="stage-effect-card">
        {effect.type === "buzz" ? <Zap size={56} /> : <PartyPopper size={56} />}
        <h2>{effect.title}</h2>
        <p>{effect.subtitle}</p>
      </div>
      {Array.from({ length: 18 }).map((_, index) => (
        <span className="confetti-bit" style={{ "--i": index }} key={index} />
      ))}
    </div>
  );
}
