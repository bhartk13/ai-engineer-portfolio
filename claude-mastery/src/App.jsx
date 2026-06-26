import React, { useState, useEffect, useMemo, useCallback } from "react";
import { META, MODULES } from "./data/curriculum.js";
import { MODULES_2 } from "./data/curriculum-2.js";
import { MODULES_3 } from "./data/curriculum-3.js";
import { EXAM_BANK } from "./data/exam.js";

const ALL_MODULES = [...MODULES, ...MODULES_2, ...MODULES_3];
const STORAGE_KEY = "claude-mastery:v1";

/* ---------- progress persistence ---------- */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: {}, examBest: null };
  } catch {
    return { completed: {}, examBest: null };
  }
}
function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* no-op */ }
}

/* ---------- tiny markdown-ish renderer for lesson bodies ---------- */
function renderBody(body) {
  const blocks = body.split("\n\n");
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    const isList = lines.every((l) => l.trim().startsWith("- "));
    if (isList) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(l.replace(/^- /, "")) }} />
          ))}
        </ul>
      );
    }
    // numbered list
    const isNum = lines.every((l) => /^\d+\.\s/.test(l.trim()));
    if (isNum) {
      return (
        <ol key={i} style={{ paddingLeft: 22, margin: "0 0 16px" }}>
          {lines.map((l, j) => (
            <li key={j} style={{ fontSize: 15, marginBottom: 8 }}
                dangerouslySetInnerHTML={{ __html: inline(l.replace(/^\d+\.\s/, "")) }} />
          ))}
        </ol>
      );
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: inline(block) }} />;
  });
}
function inline(s) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code style="font-family:var(--mono);font-size:0.92em;color:#f7c468;background:#0a0c11;padding:1px 5px;border-radius:4px;">$1</code>')
    .replace(/\\\$/g, "$");
}

/* ---------- crude code highlighter ---------- */
function highlight(code) {
  let html = code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // strings
  html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    '<span class="str">$1</span>');
  // line comments
  html = html.replace(/(\/\/[^\n]*)/g, '<span class="cmt">$1</span>');
  // keywords
  html = html.replace(/\b(const|let|async|await|function|return|for|while|if|else|import|from|new|throw|of|true|false)\b/g,
    '<span class="kw">$1</span>');
  return html;
}

/* ====================================================== App */
export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [view, setView] = useState({ name: "home" }); // home | module | exam
  useEffect(() => saveProgress(progress), [progress]);

  const completedCount = Object.keys(progress.completed).length;
  const pct = Math.round((completedCount / ALL_MODULES.length) * 100);

  const markDone = useCallback((id) => {
    setProgress((p) => ({ ...p, completed: { ...p.completed, [id]: true } }));
  }, []);
  const resetAll = useCallback(() => {
    if (confirm("Reset all progress and exam scores?")) {
      setProgress({ completed: {}, examBest: null });
    }
  }, []);

  const go = (v) => { setView(v); window.scrollTo({ top: 0, behavior: "instant" }); };

  return (
    <div className="app">
      <TopBar view={view} go={go} />
      <div className="shell">
        {view.name === "home" && (
          <Home pct={pct} completedCount={completedCount} progress={progress} go={go} resetAll={resetAll} />
        )}
        {view.name === "module" && (
          <ModuleView
            module={ALL_MODULES.find((m) => m.id === view.id)}
            index={ALL_MODULES.findIndex((m) => m.id === view.id)}
            done={!!progress.completed[view.id]}
            markDone={markDone}
            go={go}
          />
        )}
        {view.name === "exam" && (
          <Exam progress={progress} setProgress={setProgress} go={go} />
        )}
        <Footer />
      </div>
    </div>
  );
}

/* ---------- top bar ---------- */
function TopBar({ view, go }) {
  return (
    <div className="topbar">
      <div className="shell">
        <div className="topbar-in">
          <div className="brand" onClick={() => go({ name: "home" })}>
            <span className="brand-mark">{"</>"}</span>
            <span className="brand-name">{META.title}</span>
            <span className="brand-sub">// architect track</span>
          </div>
          <nav className="topnav">
            <button className={view.name === "home" ? "active" : ""} onClick={() => go({ name: "home" })}>
              CURRICULUM
            </button>
            <button className={view.name === "exam" ? "active" : ""} onClick={() => go({ name: "exam" })}>
              MOCK EXAM
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/* ---------- home ---------- */
function Home({ pct, completedCount, progress, go, resetAll }) {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Self-paced · {ALL_MODULES.length} modules · {META.updated}</div>
        <h1>
          Master <span className="accent">Claude</span>,<br />
          end to end.
        </h1>
        <p className="lede">
          A complete, opinionated path through the Claude ecosystem — models, prompting,
          the API, tool use, MCP, agents, RAG, coding, security, and evaluation — built to
          take you from fundamentals to <strong style={{ color: "var(--amber-soft)" }}>{META.examName}</strong>-level fluency.
        </p>
        <div className="hero-meta">
          <span className="chip">12 modules</span>
          <span className="chip"><b>34</b> lessons</span>
          <span className="chip"><b>30+</b> quiz checks</span>
          <span className="chip"><b>{EXAM_BANK.length}</b> exam scenarios</span>
        </div>
        <div className="cta-row">
          <button className="btn btn-primary" onClick={() => go({ name: "module", id: ALL_MODULES[0].id })}>
            ▸ START MODULE 01
          </button>
          <button className="btn btn-ghost" onClick={() => go({ name: "exam" })}>
            TAKE THE MOCK EXAM
          </button>
        </div>

        <div className="meter">
          <div className="meter-top">
            <span className="meter-label">PROGRESS · {completedCount}/{ALL_MODULES.length} MODULES</span>
            <span className="meter-pct">{pct}%</span>
          </div>
          <div className="meter-track"><div className="meter-fill" style={{ width: `${pct}%` }} /></div>
          {progress.examBest != null && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-faint)", marginTop: 12 }}>
              BEST EXAM SCORE: <span style={{ color: progress.examBest >= 80 ? "var(--green)" : "var(--amber)" }}>{progress.examBest}%</span>
            </div>
          )}
        </div>
      </section>

      <div className="sec-head">
        <span className="idx">§</span>
        <h2>The curriculum</h2>
        <span className="rule" />
      </div>

      <div className="grid">
        {ALL_MODULES.map((m, i) => {
          const done = !!progress.completed[m.id];
          return (
            <div key={m.id} className={`card ${done ? "done" : ""}`} onClick={() => go({ name: "module", id: m.id })}>
              <div className="card-top">
                <span className="card-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="card-eyebrow">{m.eyebrow}</span>
              </div>
              <h3>{m.title}</h3>
              <p>{m.summary}</p>
              <div className="card-foot">
                <span>{m.lessons.length} lessons · {m.est}</span>
                <span className={done ? "status-done" : ""}>
                  <span className={`dot ${done ? "on" : ""}`} />
                  {done ? "COMPLETE" : "OPEN"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 40, textAlign: "center" }}>
        <button className="reset-link" onClick={resetAll}>reset progress</button>
      </div>
    </>
  );
}

/* ---------- module detail ---------- */
function ModuleView({ module, index, done, markDone, go }) {
  const [lessonIdx, setLessonIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  useEffect(() => { setLessonIdx(0); setShowQuiz(false); }, [module.id]);

  if (!module) return null;
  const lesson = module.lessons[lessonIdx];
  const isLast = lessonIdx === module.lessons.length - 1;

  return (
    <div className="detail">
      <button className="back" onClick={() => go({ name: "home" })}>← all modules</button>
      <div className="detail-eyebrow">Module {String(index + 1).padStart(2, "0")} · {module.eyebrow}</div>
      <h1>{module.title}</h1>
      <p className="summary">{module.summary}</p>
      <div className="detail-meta">{module.lessons.length} lessons · {module.quiz.length} checks · est. {module.est}</div>

      <div className="lesson-nav">
        {module.lessons.map((l, i) => (
          <button key={l.id} className={i === lessonIdx && !showQuiz ? "active" : ""}
            onClick={() => { setLessonIdx(i); setShowQuiz(false); }}>
            {String(i + 1).padStart(2, "0")} · {l.title}
          </button>
        ))}
        <button className={showQuiz ? "active" : ""} onClick={() => setShowQuiz(true)}
          style={{ color: showQuiz ? "var(--amber)" : "var(--green)" }}>
          ✓ CHECKPOINT
        </button>
      </div>

      {!showQuiz && (
        <div className="lesson" key={lesson.id}>
          <h2>{lesson.title}</h2>
          {renderBody(lesson.body)}
          {lesson.code && (
            <pre className="code" dangerouslySetInnerHTML={{ __html: highlight(lesson.code) }} />
          )}
          {lesson.callout && (
            <div className="callout">
              <span className="ico">▲</span>
              <p>{lesson.callout}</p>
            </div>
          )}
          <div className="lesson-foot">
            <button className="btn btn-ghost" disabled={lessonIdx === 0}
              style={{ opacity: lessonIdx === 0 ? 0.4 : 1 }}
              onClick={() => setLessonIdx((i) => Math.max(0, i - 1))}>
              ← PREV
            </button>
            {isLast ? (
              <button className="btn btn-primary" onClick={() => setShowQuiz(true)}>
                GO TO CHECKPOINT →
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setLessonIdx((i) => i + 1)}>
                NEXT LESSON →
              </button>
            )}
          </div>
        </div>
      )}

      {showQuiz && (
        <Quiz module={module} done={done} markDone={markDone} go={go} index={index} />
      )}
    </div>
  );
}

/* ---------- per-module quiz ---------- */
function Quiz({ module, done, markDone, go, index }) {
  const [answers, setAnswers] = useState({}); // qi -> chosen index
  const allAnswered = Object.keys(answers).length === module.quiz.length;
  const correct = module.quiz.filter((q, i) => answers[i] === q.answer).length;

  const choose = (qi, oi) => {
    if (answers[qi] != null) return;
    setAnswers((a) => ({ ...a, [qi]: oi }));
  };

  useEffect(() => {
    if (allAnswered && correct === module.quiz.length && !done) markDone(module.id);
  }, [allAnswered, correct, done, markDone, module.id, module.quiz.length]);

  const nextModule = ALL_MODULES[index + 1];

  return (
    <div className="quiz-wrap">
      <h3>Checkpoint — {module.title}</h3>
      <div className="quiz-sub">Answer all {module.quiz.length} to complete the module. Full marks marks it done.</div>

      {module.quiz.map((q, qi) => {
        const chosen = answers[qi];
        const answered = chosen != null;
        return (
          <div className="qcard" key={qi}>
            <div className="qq">{qi + 1}. {q.q}</div>
            {q.options.map((opt, oi) => {
              let cls = "qopt";
              if (answered) {
                if (oi === q.answer) cls += " correct";
                else if (oi === chosen) cls += " wrong";
              }
              return (
                <button key={oi} className={cls} disabled={answered} onClick={() => choose(qi, oi)}>
                  <span className="tag">{String.fromCharCode(65 + oi)}</span>{opt}
                </button>
              );
            })}
            {answered && (
              <div className="explain">
                <b>{chosen === q.answer ? "Correct. " : "Not quite. "}</b>{q.explain}
              </div>
            )}
          </div>
        );
      })}

      {allAnswered && (
        <div className="qcard" style={{ borderColor: correct === module.quiz.length ? "var(--green)" : "var(--amber-deep)" }}>
          <div className="qq" style={{ marginBottom: 14 }}>
            Score: {correct}/{module.quiz.length}{" "}
            {correct === module.quiz.length ? "— module complete ✓" : "— review the misses above."}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={() => go({ name: "home" })}>← CURRICULUM</button>
            {nextModule
              ? <button className="btn btn-primary" onClick={() => go({ name: "module", id: nextModule.id })}>NEXT MODULE →</button>
              : <button className="btn btn-primary" onClick={() => go({ name: "exam" })}>TAKE MOCK EXAM →</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- mock exam ---------- */
const EXAM_SIZE = 12;
const PASS = 80;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Exam({ progress, setProgress, go }) {
  const [state, setState] = useState("intro"); // intro | running | done
  const [questions, setQuestions] = useState([]);
  const [cur, setCur] = useState(0);
  const [picks, setPicks] = useState([]);

  const start = () => {
    setQuestions(shuffle(EXAM_BANK).slice(0, EXAM_SIZE));
    setPicks([]); setCur(0); setState("running");
  };

  const pick = (oi) => {
    const next = [...picks]; next[cur] = oi; setPicks(next);
  };
  const advance = () => {
    if (cur < questions.length - 1) setCur(cur + 1);
    else finish();
  };
  const finish = () => {
    const score = Math.round(
      (questions.filter((q, i) => picks[i] === q.answer).length / questions.length) * 100
    );
    setProgress((p) => ({ ...p, examBest: Math.max(p.examBest ?? 0, score) }));
    setState("done");
  };

  if (state === "intro") {
    return (
      <div className="exam-intro">
        <button className="back" onClick={() => go({ name: "home" })}>← curriculum</button>
        <div className="detail-eyebrow">Certification practice</div>
        <h1 style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: "clamp(28px,4vw,42px)", letterSpacing: "-1px", margin: "10px 0 14px" }}>
          {META.examName} — mock exam
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-dim)" }}>
          {EXAM_SIZE} scenario questions drawn from a pool of {EXAM_BANK.length}, spanning model selection,
          prompting, the API, tool use, MCP, agents, RAG, coding, security, and evaluation. These mirror the
          eight architect decisions: every question is a judgment call with a justified best answer.
        </p>
        <div className="exam-card">
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-dim)", lineHeight: 2 }}>
            <div>· FORMAT &nbsp;&nbsp; {EXAM_SIZE} multiple-choice scenarios</div>
            <div>· PASS MARK &nbsp; {PASS}%</div>
            <div>· FEEDBACK &nbsp; full rationale shown after submission</div>
            <div>· BEST SCORE &nbsp;{progress.examBest != null ? `${progress.examBest}%` : "—"}</div>
          </div>
          <div style={{ marginTop: 22 }}>
            <button className="btn btn-primary" onClick={start}>▸ BEGIN EXAM</button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "running") {
    const q = questions[cur];
    const chosen = picks[cur];
    return (
      <div className="detail" style={{ maxWidth: 760 }}>
        <div className="exam-card">
          <div className="exam-progress">
            <span>QUESTION {cur + 1} / {questions.length}</span>
            <span>{q.domain.toUpperCase()}</span>
          </div>
          <div className="meter-track" style={{ marginBottom: 22 }}>
            <div className="meter-fill" style={{ width: `${((cur) / questions.length) * 100}%` }} />
          </div>
          <div className="exam-q">{q.q}</div>
          {q.options.map((opt, oi) => (
            <button key={oi} className={`qopt ${chosen === oi ? "" : ""}`}
              style={chosen === oi ? { borderColor: "var(--amber)", background: "rgba(240,160,32,0.10)" } : {}}
              onClick={() => pick(oi)}>
              <span className="tag">{String.fromCharCode(65 + oi)}</span>{opt}
            </button>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn btn-primary" disabled={chosen == null}
              style={{ opacity: chosen == null ? 0.4 : 1 }} onClick={advance}>
              {cur < questions.length - 1 ? "NEXT →" : "SUBMIT EXAM ✓"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // done
  const correct = questions.filter((q, i) => picks[i] === q.answer).length;
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= PASS;
  return (
    <div className="detail" style={{ maxWidth: 760 }}>
      <div className="exam-card" style={{ textAlign: "center", borderColor: passed ? "var(--green)" : "var(--amber-deep)" }}>
        <div className="detail-eyebrow">{passed ? "Passed" : "Keep going"}</div>
        <div className={`result-big ${passed ? "pass" : "fail"}`}>{score}%</div>
        <div className="score-line">{correct} / {questions.length} correct · pass mark {PASS}%</div>
        <p style={{ color: "var(--text-dim)", fontSize: 15, marginTop: 14 }}>
          {passed
            ? "Architect-level judgment on display. Re-roll for a fresh question set to keep sharp."
            : "Review the rationales below, revisit the weak-domain modules, and try a fresh set."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={start}>↻ NEW QUESTION SET</button>
          <button className="btn btn-ghost" onClick={() => go({ name: "home" })}>← CURRICULUM</button>
        </div>
      </div>

      <h3 style={{ fontFamily: "var(--disp)", fontSize: 20, margin: "30px 0 16px" }}>Review</h3>
      {questions.map((q, i) => {
        const ok = picks[i] === q.answer;
        return (
          <div className="review-item" key={i}>
            <div className="ri-q"><b>{i + 1}.</b> {q.q}</div>
            <div className="ri-mark"><span className={ok ? "ok" : "no"}>{ok ? "✓ correct" : "✗ your answer: " + String.fromCharCode(65 + (picks[i] ?? 0))}</span>
              {!ok && <span style={{ color: "var(--green)" }}> · right: {String.fromCharCode(65 + q.answer)}</span>}</div>
            <div className="explain" style={{ marginTop: 10 }}>{q.explain}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- footer ---------- */
function Footer() {
  return (
    <div className="foot">
      <p>{META.title} · architect track · content current as of {META.updated}</p>
      <p>
        Verify volatile facts (models, pricing, availability) against{" "}
        <a href="https://docs.claude.com" target="_blank" rel="noreferrer">docs.claude.com</a>.
        Not affiliated with or endorsed by Anthropic.
      </p>
      <p style={{ marginTop: 10, color: "var(--text-faint)" }}>MIT licensed · open an issue or PR to improve a module.</p>
    </div>
  );
}
