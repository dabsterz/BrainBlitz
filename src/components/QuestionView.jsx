import { Check, Eye, Lock, Megaphone, RotateCcw, Sparkles, X } from "lucide-react";
import Mascot from "./Mascot.jsx";

export default function QuestionView({ state, onAction }) {
  const question = state.currentQuestion;
  const buzzer = state.currentBuzzer;
  const buzzingOpen = state.gameStatus === "buzzing_open";

  return (
    <section className="question-layout">
      <div className="question-main hero-card">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-mint">{question.category}</p>
            <h2 className="text-5xl font-black text-pop">{question.value}</h2>
          </div>
          <StatusBadge state={state} />
        </div>

        {buzzingOpen ? (
          <div className="buzz-now-ribbon">
            <Sparkles size={22} />
            Buzzing is open
            <Sparkles size={22} />
          </div>
        ) : null}

        <div className="question-text">{question.question}</div>

        <div className={`answer-key ${question.answerRevealed ? "revealed" : ""}`}>
          <p className="text-sm font-black uppercase tracking-wide">{question.answerRevealed ? "Revealed answer" : "Host answer key"}</p>
          <p className="mt-2 text-2xl font-black">{question.answer}</p>
        </div>

        {buzzer ? (
          <div className="buzzer-banner">
            <Mascot mood="spotlight" label="First!" />
            <span className="avatar-lg">{buzzer.avatar}</span>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-white/60">First buzz</p>
              <p className="text-3xl font-black">{buzzer.name}</p>
            </div>
          </div>
        ) : (
          <div className={`waiting-banner ${buzzingOpen ? "open" : ""}`}>
            {buzzingOpen ? "Buzzing is open" : "Buzzing is closed"}
          </div>
        )}
      </div>

      <div className="hero-card question-controls">
        <button className="control-button open" onClick={() => onAction("open_buzzing")} disabled={buzzingOpen || Boolean(buzzer)}>
          <Megaphone size={24} />
          Open Buzzing
        </button>
        <button className="control-button" onClick={() => onAction("close_buzzing")} disabled={!buzzingOpen}>
          <Lock size={24} />
          Close Buzzing
        </button>
        <button className="control-button reveal" onClick={() => onAction("reveal_answer")} disabled={question.answerRevealed}>
          <Eye size={24} />
          Reveal Answer
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button className="control-button correct" onClick={() => onAction("mark_correct")} disabled={!buzzer}>
            <Check size={24} />
            Correct
          </button>
          <button className="control-button wrong" onClick={() => onAction("mark_incorrect")} disabled={!buzzer}>
            <X size={24} />
            Incorrect
          </button>
        </div>

        <button className="control-button" onClick={() => onAction("reopen_buzzing")} disabled={!question || Boolean(buzzer)}>
          <RotateCcw size={24} />
          Reopen Buzzing
        </button>
        <button className="primary-button w-full justify-center" onClick={() => onAction("return_to_board")}>
          Return to Board
        </button>

        <div className="buzz-history">
          <p className="mb-2 text-sm font-black uppercase tracking-wide text-white/55">Buzz order</p>
          {state.buzzHistory.length ? (
            state.buzzHistory.map((buzz, index) => (
              <div key={`${buzz.playerId}-${buzz.receivedAt}`} className="history-row">
                <span>{index + 1}</span>
                <strong>{buzz.name}</strong>
              </div>
            ))
          ) : (
            <p className="font-semibold text-white/50">No buzzes yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ state }) {
  const labels = {
    question_active: "Question active",
    buzzing_open: "Buzzing open",
    answer_review: "Answer review",
    in_progress: "Board"
  };

  return <span className={`status-badge ${state.gameStatus}`}>{labels[state.gameStatus] || state.gameStatus}</span>;
}
