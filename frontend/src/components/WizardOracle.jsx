import { useState } from "react";
import { askWizard } from "../api";

export default function WizardOracle({ courses, focusCourseId, focusTaskId, onFocusUpdate, onCoursesUpdated }) {
  const [context, setContext] = useState("");
  const [response, setResponse] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proactive, setProactive] = useState(true);

  async function handleAsk() {
    if (loading) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await askWizard(courses, context, proactive);
      setResponse(result.response);
      setWarnings(result.warnings || []);
      onFocusUpdate(result.focus_course_id, result.focus_task_id);
    } catch (err) {
      setError(err.message || "The orb went dark. Try again.");
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <div className="orb-wrapper-oracle">
          <div className={`orb-oracle ${loading ? "orb-oracle--active" : ""}`} />
          <span className="orb-emoji-oracle">🔮</span>
        </div>
      </div>

      {response && (
        <div className="response-card rounded-xl border border-violet-600 bg-gray-900 px-6 py-5">
          <p className="text-violet-200 italic leading-relaxed">{response}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {warnings.map((warning, index) => (
            <p key={index} className="text-amber-400 text-sm">
              ⚠ {warning}
            </p>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tell the orb your situation..."
        rows={3}
        className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-400">
          <input
            type="checkbox"
            checked={proactive}
            onChange={(e) => setProactive(e.target.checked)}
            className="w-4 h-4 accent-violet-500 cursor-pointer"
          />
          Warn me about things I might miss
        </label>

        <button
          onClick={handleAsk}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl font-bold tracking-widest text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white whitespace-nowrap"
        >
          {loading ? "CONSULTING..." : "ASK THE KIWIZARD"}
        </button>
      </div>

      <style>{`
        .orb-wrapper-oracle {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orb-oracle {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #a855f7, #4c1d95);
          animation: pulse_orb 3s ease-in-out infinite;
          box-shadow: 0 0 24px 4px rgba(168, 85, 247, 0.35);
          transition: box-shadow 0.3s ease;
        }
        .orb-oracle--active {
          box-shadow: 0 0 60px 18px rgba(168, 85, 247, 0.75);
          animation: pulse_orb_fast 1s ease-in-out infinite;
        }
        .orb-emoji-oracle {
          position: relative;
          font-size: 2rem;
          z-index: 1;
        }
        @keyframes pulse_orb {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes pulse_orb_fast {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .response-card {
          animation: fadeIn 0.4s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
