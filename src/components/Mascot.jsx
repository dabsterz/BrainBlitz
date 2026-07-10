import { Sparkles } from "lucide-react";

export default function Mascot({ mood = "ready", label = "Ready?" }) {
  return (
    <div className={`mascot mascot-${mood}`} aria-hidden="true">
      <div className="mascot-bubble">
        <span className="mascot-face">🧠</span>
        <span className="mascot-bolt">⚡</span>
      </div>
      <div className="mascot-label">
        <Sparkles size={16} />
        {label}
      </div>
    </div>
  );
}
