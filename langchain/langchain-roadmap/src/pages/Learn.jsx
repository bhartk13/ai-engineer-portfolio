import { useState } from "react";
import { days } from "../data/roadmap.js";
import { weekOverviews } from "../data/weekOverviews.js";
import { useProgress, useTheme } from "../store.jsx";
import { Card, Badge, Button, CodeBlock, useCopy, accentTint } from "../components/ui.jsx";

function WeekOverview({ week }) {
  const { theme } = useTheme();
  const w = weekOverviews[week];
  if (!w) return null;

  const isDark = theme === "dark";
  const bg = isDark
    ? `linear-gradient(135deg, #1e3a5f 0%, #1e293b 55%, ${week === 1 ? "#1e1b4b" : "#312e81"} 100%)`
    : w.bg;

  // Explicit contrast on the overview card — theme vars alone break on the light gradient
  const text = isDark ? "#e2e8f0" : "#1e293b";
  const textSecondary = isDark ? "#cbd5e1" : "#334155";
  const textMuted = isDark ? "#94a3b8" : "#475569";
  const label = isDark ? "#94a3b8" : "#64748b";
  const accent = isDark ? (week === 1 ? "#93c5fd" : "#c4b5fd") : w.accent;
  const innerBg = isDark ? "rgba(255,255,255,0.07)" : w.innerBg;
  const innerBorder = isDark ? "rgba(255,255,255,0.12)" : w.innerBorder;

  return (
    <Card style={{ padding: 24, marginBottom: 18, borderTop: `3px solid ${accent}`, background: bg, border: `1px solid ${innerBorder}`, color: text }}>
      <div style={{ fontSize: 10.5, color: accent, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>
        {w.title} · {w.hours}
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: textSecondary, lineHeight: 1.65 }}>{w.description}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="lc-grid-2">
        <div>
          <div style={{ fontSize: 10, color: label, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Week goals</div>
          {w.goals.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12.5, color: textSecondary, lineHeight: 1.5 }}>
              <span style={{ color: accent, flexShrink: 0 }}>▹</span>{g}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, color: label, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Daily plan</div>
          {w.dailyPlan.map((d, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "8px 12px", background: innerBg, borderRadius: 8, border: `1px solid ${innerBorder}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 2 }}>{d.day}</div>
              <div style={{ fontSize: 12, color: textSecondary, marginBottom: 2 }}>{d.focus}</div>
              <div style={{ fontSize: 11, color: textMuted }}>→ {d.deliverable}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: innerBg, border: `1px solid ${innerBorder}`, borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: textSecondary, lineHeight: 1.6, marginBottom: 10 }}>
        <strong style={{ color: accent }}>Outcome:</strong> {w.outcome}
      </div>
      <div style={{ background: "var(--callout-warn-bg)", border: "1px solid var(--callout-warn-border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--callout-warn-text)", lineHeight: 1.55 }}>
        <strong>📌 Docs update (2025–2026):</strong> {w.docsNote}
      </div>
    </Card>
  );
}

function SectionBlock({ section }) {
  return (
    <Card style={{ padding: 20, marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 800, color: "var(--text)" }}>{section.title}</h3>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{section.content}</p>
      {section.bullets?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
          {section.bullets.map((b, i) => (
            <li key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{b}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Learn({ target }) {
  const { state, toggleItem } = useProgress();
  const initial = target ? Math.max(0, days.findIndex((d) => d.id === target)) : 0;
  const [sel, setSel] = useState(initial);
  const { copied, copy } = useCopy();

  const cur = days[sel];
  const done = !!state.days[cur.id];
  const showWeekOverview = sel === 0 || days[sel - 1]?.week !== cur.week;

  return (
    <div className="page-enter lc-learn-grid" style={{ display: "grid", gridTemplateColumns: "248px 1fr", gap: 22 }} key={sel}>
      {/* Left rail */}
      <div className="lc-rail">
        {[1, 2].map((wk) => (
          <div key={wk} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-subtle)", letterSpacing: "2px", textTransform: "uppercase", padding: "0 10px 8px" }}>
              Week {wk}
            </div>
            {days
              .map((d, i) => ({ d, i }))
              .filter(({ d }) => d.week === wk)
              .map(({ d, i }) => {
                const active = sel === i;
                const isDone = !!state.days[d.id];
                return (
                  <button
                    key={d.id}
                    onClick={() => setSel(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      background: active ? accentTint(d.accent, "22%") : "transparent",
                      border: active ? `1.5px solid ${d.accent}55` : "1.5px solid transparent",
                      borderLeft: `3px solid ${active ? d.accent : "transparent"}`,
                      padding: "10px 12px",
                      marginBottom: 4,
                      cursor: "pointer",
                      borderRadius: 9,
                      fontFamily: "inherit",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isDone ? d.accent : "transparent",
                        border: isDone ? "none" : "1.5px solid var(--border-strong)",
                        color: isDone ? "#fff" : "var(--text-muted)",
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isDone ? "✓" : ""}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 9.5, color: active ? d.accent : "var(--text-subtle)", fontWeight: 700 }}>{d.day}</span>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: active ? d.accent : "var(--text-secondary)" }}>{d.title}</span>
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {/* Detail */}
      <div>
        {showWeekOverview && <WeekOverview week={cur.week} />}

        {/* Hero */}
        <Card style={{ padding: 26, borderTop: `3px solid ${cur.accent}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10.5, color: cur.accent, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
                Week {cur.week} · {cur.day} · ~{cur.minutes} min
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 23, fontWeight: 800, color: "var(--text)" }}>{cur.title}</h2>
              <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 600 }}>{cur.summary}</p>
              {cur.overview && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 640 }}>{cur.overview}</p>
              )}
            </div>
            <Button
              onClick={() => toggleItem("days", cur.id)}
              variant={done ? "soft" : "primary"}
              style={done ? { color: "#059669", borderColor: "#05966944", background: "#05966914" } : { background: cur.accent, borderColor: cur.accent }}
            >
              {done ? "✓ Completed" : "Mark complete"}
            </Button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {cur.concepts.map((c, i) => (
              <Badge key={i} color={cur.accent} style={{ borderRadius: 7, fontWeight: 600 }}>{c}</Badge>
            ))}
          </div>
        </Card>

        {/* Prerequisites */}
        {cur.prerequisites?.length > 0 && (
          <Card style={{ padding: 18, marginBottom: 16, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
              📋 Prerequisites
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cur.prerequisites.map((p, i) => (
                <span key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 11px" }}>
                  {p}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Objectives */}
        <Card style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>
            🎯 Learning objectives
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }} className="lc-grid-2">
            {cur.objectives.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: cur.accent, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>▹</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{o}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Sections — comprehensive guide */}
        {cur.sections?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
              📖 Lesson guide
            </div>
            {cur.sections.map((s, i) => (
              <SectionBlock key={i} section={s} />
            ))}
          </div>
        )}

        {/* Code */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
            💻 Code (LangChain 1.x)
          </div>
          <CodeBlock code={cur.code} id={cur.id} copied={copied} onCopy={copy} filename="main.py" maxHeight={520} />
        </div>

        {/* Migration note */}
        {cur.migrationNote && (
          <div style={{ background: "var(--callout-warn-bg)", border: "1px solid var(--callout-warn-border)", borderLeft: "3px solid #f59e0b", borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: "var(--callout-warn-text)", lineHeight: 1.6, marginBottom: 16 }}>
            <strong>⚠️ Migration note:</strong> {cur.migrationNote}
          </div>
        )}

        {/* Exercises */}
        {cur.exercises?.length > 0 && (
          <Card style={{ padding: 22, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>
              🏋️ Hands-on exercises
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {cur.exercises.map((ex, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: cur.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: ex.hint ? 4 : 0 }}>{ex.task}</div>
                    {ex.hint && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Hint: {ex.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Checklist + Key takeaways side by side */}
        {(cur.checklist?.length > 0 || cur.keyTakeaways?.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }} className="lc-grid-2">
            {cur.checklist?.length > 0 && (
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
                  ✅ Completion checklist
                </div>
                {cur.checklist.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--text-subtle)", flexShrink: 0 }}>☐</span>{item}
                  </div>
                ))}
              </Card>
            )}
            {cur.keyTakeaways?.length > 0 && (
              <Card style={{ padding: 20, background: accentTint(cur.accent, "16%"), border: `1px solid ${cur.accent}44` }}>
                <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
                  💡 Key takeaways
                </div>
                {cur.keyTakeaways.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ color: cur.accent, flexShrink: 0, fontWeight: 700 }}>→</span>{t}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Tip */}
        <div
          style={{
            background: accentTint(cur.accent, "14%"),
            border: `1px solid ${cur.accent}44`,
            borderLeft: `3px solid ${cur.accent}`,
            borderRadius: 10,
            padding: "13px 16px",
            fontSize: 13,
            color: "var(--text-secondary)",
            display: "flex",
            gap: 10,
            marginBottom: 16,
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: cur.accent }}>💡</span>
          <span>{cur.tip}</span>
        </div>

        {/* Resources */}
        {cur.resources?.length > 0 && (
          <Card style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
              📚 Official docs (docs.langchain.com)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {cur.resources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noreferrer" className="lc-link" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border)", padding: "7px 12px", borderRadius: 8 }}>
                  {r.label} ↗
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Nav */}
        <Card style={{ padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{sel + 1} / {days.length}</span>
          <div style={{ display: "flex", gap: 5 }}>
            {days.map((d, i) => (
              <div
                key={i}
                onClick={() => setSel(i)}
                style={{
                  width: i === sel ? 22 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: i === sel ? d.accent : state.days[d.id] ? `${d.accent}66` : "var(--surface-3)",
                  cursor: "pointer",
                  transition: "all 0.25s",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="soft" onClick={() => setSel(Math.max(0, sel - 1))}>← Prev</Button>
            <Button onClick={() => setSel(Math.min(days.length - 1, sel + 1))} style={{ background: cur.accent, borderColor: cur.accent, color: "#fff" }}>
              Next →
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
