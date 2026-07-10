import { RotateCcw } from "lucide-react";

const CATEGORY_ICONS = ["🎬", "🍳", "🌍", "🔬", "🎵", "⭐"];

export default function GameBoard({ state, onAction }) {
  return (
    <section className="hero-card flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-pop">Game board</p>
          <h2 className="text-4xl font-black">Pick a question</h2>
        </div>
        <button className="secondary-dark" onClick={() => onAction("reset_game")}>
          <RotateCcw size={20} />
          Reset
        </button>
      </div>

      <div className="board-grid">
        {state.board.map((category, categoryIndex) => (
          <div className="board-column" key={category.id}>
            <div className="category-header">
              <span>{CATEGORY_ICONS[categoryIndex % CATEGORY_ICONS.length]}</span>
              {category.name}
            </div>
            {category.questions.map((question, questionIndex) => (
              <button
                key={question.id}
                className={`question-tile ${question.used ? "used" : ""}`}
                disabled={question.used}
                onClick={() => onAction("select_question", { categoryIndex, questionIndex })}
              >
                <span>{question.used ? "Done" : question.value}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
