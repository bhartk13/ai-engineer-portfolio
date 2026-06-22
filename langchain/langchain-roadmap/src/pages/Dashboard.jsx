import { useProgress, countDone } from "../store.jsx";
import { days } from "../data/roadmap.js";
import { conceptsDeep } from "../data/concepts.js";
import { quizzes } from "../data/quizzes.js";
import { flashcardDecks } from "../data/flashcards.js";
import { Card, ProgressRing, StatTile, Button, ProgressBar, accentTint } from "../components/ui.jsx";

export default function Dashboard({ onNavigate }) {
  const { state, resetAll } = useProgress();

  const daysDone = countDone(state.days);
  const conceptsDoneCount = countDone(state.concepts);
  const totalLessons = days.length + conceptsDeep.length;
  const lessonsDone = daysDone + conceptsDoneCount;

  const quizIds = Object.keys(state.quizScores || {});
  const quizCount = quizIds.length;
  const avgScore =
    quizCount > 0
      ? Math.round(
          (quizIds.reduce((acc, id) => {
            const s = state.quizScores[id];
            return acc + (s.total ? s.score / s.total : 0);
          }, 0) /
            quizCount) *
            100
        )
      : 0;

  const decksDone = countDone(state.flashcards);

  // Find next lesson to continue
  const nextDay = days.find((d) => !state.days[d.id]);
  const nextConcept = conceptsDeep.find((c) => !state.concepts[c.id]);

  const minutesDone = days.filter((d) => state.days[d.id]).reduce((a, d) => a + d.minutes, 0);
  const totalMinutes = days.reduce((a, d) => a + d.minutes, 0);

  return (
    <div className="page-enter" style={{ display: "grid", gap: 18 }}>
      {/* Hero */}
      <Card
        style={{
          padding: 0,
          overflow: "hidden",
          background: "linear-gradient(135deg, #1e293b 0%, #312e81 60%, #4c1d95 100%)",
          border: "none",
        }}
      >
        <div style={{ padding: "30px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ maxWidth: 540 }}>
            <div style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>
              LangChain Learning Lab
            </div>
            <h1 style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.6px", lineHeight: 1.15 }}>
              Master LangChain &amp; Agentic AI
            </h1>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "#cbd5e1", lineHeight: 1.65 }}>
              A complete, hands-on curriculum: a 2-week roadmap, deep-dive concepts, quizzes, flashcards, a glossary, and 5 portfolio
              projects — all in one place.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={() => onNavigate("learn", nextDay?.id)} style={{ background: "#fff", color: "#1e293b", border: "none" }}>
                {lessonsDone > 0 ? "▶ Continue learning" : "▶ Start learning"}
              </Button>
              <Button onClick={() => onNavigate("quizzes")} variant="outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
                📝 Take a quiz
              </Button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ProgressRing value={lessonsDone} total={totalLessons} size={132} color="#a5b4fc" label="complete" />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatTile icon="📅" label="Lessons done" value={`${lessonsDone}/${totalLessons}`} color="#2563eb" sub={`${minutesDone} of ${totalMinutes} min studied`} />
        <StatTile icon="🧠" label="Concepts mastered" value={`${conceptsDoneCount}/${conceptsDeep.length}`} color="#7c3aed" />
        <StatTile icon="📝" label="Quizzes taken" value={`${quizCount}/${quizzes.length}`} color="#b45309" sub={quizCount ? `Avg best score ${avgScore}%` : "Test your knowledge"} />
        <StatTile icon="🃏" label="Decks reviewed" value={`${decksDone}/${flashcardDecks.length}`} color="#059669" />
      </div>

      {/* Continue + Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="lc-grid-2">
        {/* Continue learning */}
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>
            Pick up where you left off
          </div>
          {nextDay ? (
            <div
              onClick={() => onNavigate("learn", nextDay.id)}
              style={{
                cursor: "pointer",
                border: "1px solid var(--border)",
                borderLeft: `4px solid ${nextDay.accent}`,
                borderRadius: 11,
                padding: "16px 18px",
                marginBottom: 12,
                background: accentTint(nextDay.accent, "18%"),
              }}
            >
              <div style={{ fontSize: 10.5, color: nextDay.accent, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
                Next lesson · {nextDay.day}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 5 }}>{nextDay.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>{nextDay.summary}</div>
            </div>
          ) : (
            <div style={{ padding: "16px 18px", borderRadius: 11, background: "var(--surface-2)", marginBottom: 12, fontSize: 13.5, color: "var(--text-secondary)" }}>
              🎉 You finished all roadmap lessons! Reinforce with quizzes and flashcards.
            </div>
          )}
          {nextConcept && (
            <div
              onClick={() => onNavigate("concepts", nextConcept.id)}
              style={{
                cursor: "pointer",
                border: "1px solid var(--border)",
                borderLeft: `4px solid ${nextConcept.accent}`,
                borderRadius: 11,
                padding: "16px 18px",
                background: accentTint(nextConcept.accent, "18%"),
              }}
            >
              <div style={{ fontSize: 10.5, color: nextConcept.accent, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
                Recommended concept
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 5 }}>
                {nextConcept.icon} {nextConcept.title}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>{nextConcept.subtitle}</div>
            </div>
          )}
        </Card>

        {/* Quick links */}
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>
            Jump in
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { id: "concepts", icon: "🧠", label: "Deep-dive concepts", desc: "8 core primitives with guides & exercises" },
              { id: "flashcards", icon: "🃏", label: "Flashcards", desc: "Quick recall practice" },
              { id: "glossary", icon: "📖", label: "Glossary", desc: "34 key terms" },
              { id: "projects", icon: "🚀", label: "Portfolio projects", desc: "5 build blueprints" },
            ].map((q) => (
              <button
                key={q.id}
                onClick={() => onNavigate(q.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "all 0.14s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.transform = "translateX(3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <span style={{ fontSize: 20 }}>{q.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{q.label}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{q.desc}</span>
                </span>
                <span style={{ color: "var(--text-subtle)", fontSize: 16 }}>→</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Roadmap mini progress */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" }}>
            Roadmap progress
          </div>
          <Button variant="ghost" onClick={resetAll} style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            ↺ Reset progress
          </Button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {days.map((d) => {
            const done = !!state.days[d.id];
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    background: done ? d.accent : "var(--surface-3)",
                    color: done ? "#fff" : "var(--text-subtle)",
                    border: done ? "none" : "1px solid var(--border)",
                  }}
                >
                  {done ? "✓" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 10 }}>
                    <span
                      onClick={() => onNavigate("learn", d.id)}
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {d.day} · {d.title}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-subtle)", flexShrink: 0 }}>{d.minutes} min</span>
                  </div>
                  <ProgressBar value={done ? 1 : 0} total={1} color={d.accent} height={6} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
