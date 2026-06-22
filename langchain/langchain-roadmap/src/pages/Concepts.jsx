import { useState } from "react";
import { conceptsDeep } from "../data/concepts.js";
import { conceptsOverview } from "../data/conceptsOverview.js";
import { useProgress, useTheme } from "../store.jsx";
import { Card, Button, CodeBlock, useCopy, accentTint } from "../components/ui.jsx";

const SUBTABS = [
  { id: "guide", label: "📖 Guide" },
  { id: "explain", label: "💡 Explain" },
  { id: "howit", label: "⚙️ How It Works" },
  { id: "code", label: "💻 Code" },
  { id: "gotchas", label: "⚠️ Gotchas" },
  { id: "practice", label: "🏋️ Practice" },
];

function ConceptsBanner() {
  const { theme } = useTheme();
  const w = conceptsOverview;
  const isDark = theme === "dark";
  const bg = isDark
    ? "linear-gradient(135deg, #312e81 0%, #1e293b 55%, #1e1b4b 100%)"
    : w.bg;

  const text = isDark ? "#e2e8f0" : "#1e293b";
  const textSecondary = isDark ? "#cbd5e1" : "#334155";
  const textMuted = isDark ? "#94a3b8" : "#475569";
  const label = isDark ? "#94a3b8" : "#64748b";
  const accent = isDark ? "#c4b5fd" : w.accent;
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
          <div style={{ fontSize: 10, color: label, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Learning goals</div>
          {w.goals.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12.5, color: textSecondary, lineHeight: 1.5 }}>
              <span style={{ color: accent, flexShrink: 0 }}>▹</span>{g}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, color: label, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Suggested study path</div>
          {w.studyPath.map((d, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "8px 12px", background: innerBg, borderRadius: 8, border: `1px solid ${innerBorder}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 2 }}>Concepts {d.order}</div>
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

export default function Concepts({ target }) {
  const { state, toggleItem } = useProgress();
  const validTarget = target && conceptsDeep.some((c) => c.id === target) ? target : "lcel";
  const [active, setActive] = useState(validTarget);
  const [subTab, setSubTab] = useState("guide");
  const { copied, copy } = useCopy();

  const cur = conceptsDeep.find((c) => c.id === active);
  const mastered = !!state.concepts[cur.id];
  const idx = conceptsDeep.findIndex((c) => c.id === active);

  return (
    <div className="page-enter">
      <ConceptsBanner />

      {/* Concept tabs */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 18, paddingBottom: 4 }}>
        {conceptsDeep.map((c) => {
          const isActive = active === c.id;
          const isDone = !!state.concepts[c.id];
          return (
            <button
              key={c.id}
              onClick={() => {
                setActive(c.id);
                setSubTab("guide");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: isActive ? c.accent : accentTint(c.accent, "12%"),
                color: isActive ? "#fff" : "var(--text-muted)",
                border: `1px solid ${isActive ? c.accent : "var(--border)"}`,
                padding: "8px 13px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 600,
                borderRadius: 9,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span>{c.icon}</span>
              {c.title.split("—")[0].split(" ").slice(0, 2).join(" ")}
              {isDone && <span style={{ color: isActive ? "#fff" : "#059669" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Hero */}
      <Card style={{ padding: 26, borderTop: `3px solid ${cur.accent}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 18 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 10.5, color: cur.accent, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 7 }}>
              Core Concept · {idx + 1}/{conceptsDeep.length}
            </div>
            <h2 style={{ margin: "0 0 5px", fontSize: 25, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.4px" }}>
              {cur.icon} {cur.title}
            </h2>
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>{cur.subtitle}</p>
            {cur.overview && (
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 640 }}>{cur.overview}</p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ background: accentTint(cur.accent, "14%"), border: `1.5px solid ${cur.accent}44`, borderRadius: 8, padding: "9px 15px" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: cur.accent }}>💡 {cur.tagline}</span>
              </div>
              <Button
                onClick={() => toggleItem("concepts", cur.id)}
                variant={mastered ? "soft" : "primary"}
                style={mastered ? { color: "#059669", borderColor: "#05966944", background: "#05966914" } : { background: cur.accent, borderColor: cur.accent }}
              >
                {mastered ? "✓ Mastered" : "Mark mastered"}
              </Button>
            </div>
          </div>
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 11, padding: "16px 20px", minWidth: 250 }}>
            <div style={{ fontSize: 10, color: "var(--text-subtle)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12, fontWeight: 800 }}>
              Data Flow
            </div>
            {cur.diagram.map((step, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: step.color, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{step.desc}</div>
                </div>
                {i < cur.diagram.length - 1 && <div style={{ fontSize: 14, color: "var(--text-subtle)", marginLeft: 16, lineHeight: 1.6 }}>↓</div>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Prerequisites + Objectives */}
      {(cur.prerequisites?.length > 0 || cur.objectives?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: cur.prerequisites?.length && cur.objectives?.length ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 16 }} className="lc-grid-2">
          {cur.prerequisites?.length > 0 && (
            <Card style={{ padding: 18, background: "var(--surface-2)" }}>
              <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
                📋 Prerequisites
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cur.prerequisites.map((p, i) => (
                  <span key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 11px" }}>
                    {p}
                  </span>
                ))}
              </div>
            </Card>
          )}
          {cur.objectives?.length > 0 && (
            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
                🎯 Learning objectives
              </div>
              {cur.objectives.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  <span style={{ color: cur.accent, fontWeight: 800, flexShrink: 0 }}>▹</span>{o}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* Subtabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              background: subTab === t.id ? cur.accent : accentTint(cur.accent, "12%"),
              color: subTab === t.id ? "#fff" : "var(--text-muted)",
              border: `1px solid ${subTab === t.id ? cur.accent : "var(--border)"}`,
              padding: "8px 16px",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 12.5,
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Guide */}
      {subTab === "guide" && cur.sections?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {cur.sections.map((s, i) => (
            <SectionBlock key={i} section={s} />
          ))}
        </div>
      )}
      {subTab === "guide" && !cur.sections?.length && (
        <Card style={{ padding: 22, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.75 }}>{cur.tldr}</p>
        </Card>
      )}

      {/* Explain */}
      {subTab === "explain" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="lc-grid-2">
          <Card style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: accentTint(cur.accent, "14%"), color: cur.accent, borderRadius: 5, padding: "2px 8px", fontSize: 10.5 }}>TL;DR</span> What is it?
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.75 }}>{cur.tldr}</p>
          </Card>
          <Card style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#ecfdf5", color: "#059669", borderRadius: 5, padding: "2px 8px", fontSize: 10.5 }}>WHY</span> Why it matters
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.75 }}>{cur.whyItMatters}</p>
          </Card>
          <Card style={{ padding: 22, gridColumn: "1 / -1" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--callout-warn-bg)", color: "#b45309", borderRadius: 5, padding: "2px 8px", fontSize: 10.5 }}>ANALOGY</span> Mental model
            </h3>
            <div style={{ background: "var(--callout-warn-bg)", border: "1px solid var(--callout-warn-border)", borderLeft: "4px solid #f59e0b", borderRadius: 8, padding: "14px 18px" }}>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--callout-warn-text)", lineHeight: 1.8, fontStyle: "italic" }}>“{cur.analogy}”</p>
            </div>
          </Card>
        </div>
      )}

      {/* How it works */}
      {subTab === "howit" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="lc-grid-2">
          <Card style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Step-by-Step</h3>
            {cur.howItWorks.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i < cur.howItWorks.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: cur.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                    {i + 1}
                  </div>
                  {i < cur.howItWorks.length - 1 && <div style={{ width: 2, flex: 1, background: `${cur.accent}33`, minHeight: 14 }} />}
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{step}</p>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Component Flow</h3>
            {cur.diagram.map((step, i) => (
              <div key={i}>
                <div style={{ background: `${step.color}14`, border: `1.5px solid ${step.color}44`, borderRadius: 9, padding: "13px 15px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: step.color, marginBottom: 4 }}>{step.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.desc}</div>
                </div>
                {i < cur.diagram.length - 1 && <div style={{ textAlign: "center", fontSize: 16, color: "var(--text-subtle)", lineHeight: 1.4 }}>↓</div>}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Code */}
      {subTab === "code" && (
        <div>
          <div style={{ background: accentTint(cur.accent, "12%"), border: `1px solid ${cur.accent}33`, borderLeft: `3px solid ${cur.accent}`, borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: cur.accent, fontWeight: 500 }}>
            💡 {cur.tagline}
          </div>
          <CodeBlock code={cur.code} id={cur.id} copied={copied} onCopy={copy} filename="main.py" maxHeight={520} />
          {cur.migrationNote && (
            <div style={{ background: "var(--callout-warn-bg)", border: "1px solid var(--callout-warn-border)", borderLeft: "3px solid #f59e0b", borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: "var(--callout-warn-text)", lineHeight: 1.6, marginTop: 14 }}>
              <strong>⚠️ Migration note:</strong> {cur.migrationNote}
            </div>
          )}
        </div>
      )}

      {/* Gotchas */}
      {subTab === "gotchas" && (
        <div style={{ display: "grid", gap: 12 }}>
          {cur.gotchas.map((g, i) => (
            <Card key={i} style={{ padding: 18, display: "flex", gap: 14, alignItems: "flex-start", borderLeft: "4px solid #f59e0b" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--callout-warn-bg)", border: "1.5px solid var(--callout-warn-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⚠️</div>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>{g}</p>
            </Card>
          ))}
          {cur.tip && (
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
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: cur.accent }}>💡</span>
              <span>{cur.tip}</span>
            </div>
          )}
        </div>
      )}

      {/* Practice */}
      {subTab === "practice" && (
        <div>
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
          {(cur.checklist?.length > 0 || cur.keyTakeaways?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }} className="lc-grid-2">
              {cur.checklist?.length > 0 && (
                <Card style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
                    ✅ Mastery checklist
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
        </div>
      )}

      {/* Resources */}
      {cur.resources?.length > 0 && (
        <Card style={{ padding: 18, marginTop: 16, marginBottom: 16 }}>
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

      {/* Bottom nav */}
      <Card style={{ marginTop: 18, padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
          {idx + 1} / {conceptsDeep.length}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="soft"
            onClick={() => {
              if (idx > 0) {
                setActive(conceptsDeep[idx - 1].id);
                setSubTab("guide");
              }
            }}
          >
            ← Prev
          </Button>
          <Button
            onClick={() => {
              if (idx < conceptsDeep.length - 1) {
                setActive(conceptsDeep[idx + 1].id);
                setSubTab("guide");
              }
            }}
            style={{ background: cur.accent, borderColor: cur.accent }}
          >
            Next →
          </Button>
        </div>
      </Card>
    </div>
  );
}
