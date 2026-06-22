import { useState } from "react";
import { quizzes } from "../data/quizzes.js";
import { useProgress } from "../store.jsx";
import { SectionHeading, Card, Button, Badge } from "../components/ui.jsx";

function QuizRunner({ quiz, onExit }) {
  const { recordQuiz } = useProgress();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  const q = quiz.questions[idx];
  const score = answers.filter((a, i) => a === quiz.questions[i].answer).length;

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
  };

  const next = () => {
    const newAnswers = [...answers, picked];
    setAnswers(newAnswers);
    setPicked(null);
    if (idx + 1 < quiz.questions.length) {
      setIdx(idx + 1);
    } else {
      const finalScore = newAnswers.filter((a, i) => a === quiz.questions[i].answer).length;
      recordQuiz(quiz.id, finalScore, quiz.questions.length);
      setFinished(true);
    }
  };

  const restart = () => {
    setIdx(0);
    setPicked(null);
    setAnswers([]);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    const pass = pct >= 70;
    return (
      <div className="page-enter" style={{ maxWidth: 640, margin: "0 auto" }}>
        <Card style={{ padding: 32, textAlign: "center", borderTop: `3px solid ${quiz.accent}` }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{pass ? "🎉" : "📚"}</div>
          <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>
            {pass ? "Great work!" : "Keep practicing!"}
          </h2>
          <p style={{ margin: "0 0 20px", color: "var(--text-muted)", fontSize: 14 }}>
            You scored <strong style={{ color: quiz.accent }}>{score}/{quiz.questions.length}</strong> ({pct}%) on {quiz.title}.
          </p>
          <div style={{ display: "grid", gap: 10, textAlign: "left", marginBottom: 22 }}>
            {quiz.questions.map((qq, i) => {
              const correct = answers[i] === qq.answer;
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: "var(--surface-2)", borderRadius: 9, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{correct ? "✅" : "❌"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{qq.q}</div>
                    {!correct && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Correct: {qq.options[qq.answer]}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Button variant="soft" onClick={onExit}>← All quizzes</Button>
            <Button onClick={restart} style={{ background: quiz.accent, borderColor: quiz.accent }}>↻ Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Button variant="ghost" onClick={onExit}>← Exit</Button>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 }}>
          Question {idx + 1} of {quiz.questions.length}
        </span>
      </div>

      <div style={{ background: "var(--surface-3)", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ width: `${((idx + (picked !== null ? 1 : 0)) / quiz.questions.length) * 100}%`, height: "100%", background: quiz.accent, transition: "width 0.3s ease" }} />
      </div>

      <Card style={{ padding: 28 }}>
        <div style={{ fontSize: 11, color: quiz.accent, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
          {quiz.icon} {quiz.title}
        </div>
        <h2 style={{ margin: "0 0 20px", fontSize: 19, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>{q.q}</h2>

        <div style={{ display: "grid", gap: 10 }}>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.answer;
            const isPicked = i === picked;
            let bg = "var(--surface-2)";
            let border = "var(--border)";
            let color = "var(--text-secondary)";
            if (picked !== null) {
              if (isCorrect) {
                bg = "#05966914";
                border = "#059669";
                color = "#059669";
              } else if (isPicked) {
                bg = "#dc262614";
                border = "#dc2626";
                color = "#dc2626";
              }
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={picked !== null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  background: bg,
                  border: `1.5px solid ${border}`,
                  borderRadius: 11,
                  padding: "14px 16px",
                  cursor: picked === null ? "pointer" : "default",
                  fontSize: 14,
                  fontFamily: "inherit",
                  fontWeight: 500,
                  color,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (picked === null) e.currentTarget.style.borderColor = quiz.accent;
                }}
                onMouseLeave={(e) => {
                  if (picked === null) e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    flexShrink: 0,
                    background: picked !== null && (isCorrect || isPicked) ? border : "var(--surface-3)",
                    color: picked !== null && (isCorrect || isPicked) ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {picked !== null && isCorrect ? "✓" : picked !== null && isPicked ? "✕" : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div style={{ marginTop: 18, padding: "14px 16px", background: "var(--primary-soft)", borderLeft: "3px solid var(--primary)", borderRadius: 9, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--primary-strong)" }}>{picked === q.answer ? "Correct! " : "Explanation: "}</strong>
            {q.explanation}
          </div>
        )}

        {picked !== null && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <Button onClick={next} style={{ background: quiz.accent, borderColor: quiz.accent }}>
              {idx + 1 < quiz.questions.length ? "Next question →" : "See results →"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Quizzes({ target }) {
  const { state } = useProgress();
  const [active, setActive] = useState(target && quizzes.some((q) => q.id === target) ? target : null);

  if (active) {
    const quiz = quizzes.find((q) => q.id === active);
    return <QuizRunner quiz={quiz} onExit={() => setActive(null)} />;
  }

  return (
    <div className="page-enter">
      <SectionHeading kicker="Practice" title="📝 Quizzes" subtitle="Check your understanding. Each quiz gives instant feedback with explanations, and your best score is saved." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {quizzes.map((q) => {
          const best = state.quizScores?.[q.id];
          return (
            <Card key={q.id} hover style={{ padding: 22, cursor: "pointer", borderTop: `3px solid ${q.accent}` }} onClick={() => setActive(q.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${q.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{q.icon}</div>
                {best && (
                  <Badge color={best.score / best.total >= 0.7 ? "#059669" : "#b45309"}>
                    Best {best.score}/{best.total}
                  </Badge>
                )}
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{q.title}</h3>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>{q.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11.5, color: "var(--text-subtle)", fontWeight: 600 }}>{q.questions.length} questions</span>
                <span style={{ fontSize: 13, color: q.accent, fontWeight: 700 }}>{best ? "Retake →" : "Start →"}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
