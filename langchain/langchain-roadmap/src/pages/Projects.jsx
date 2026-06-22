import { useState } from "react";
import { projectsData } from "../data/projects.js";
import { conceptsDeep } from "../data/concepts.js";
import { SectionHeading, Card, Badge } from "../components/ui.jsx";

export default function Projects({ target, onNavigate }) {
  const initialOpen = target ? projectsData.findIndex((p) => p.id === target) : null;
  const [open, setOpen] = useState(initialOpen >= 0 ? initialOpen : null);

  return (
    <div className="page-enter">
      <SectionHeading
        kicker="Build"
        title="5 Portfolio Projects"
        subtitle="Build all five for a complete, recruiter-ready AI portfolio. Ordered from beginner to advanced — each maps to concepts you can revisit."
      />
      <div style={{ display: "grid", gap: 12 }}>
        {projectsData.map((p, i) => {
          const isOpen = open === i;
          return (
            <Card key={p.id} style={{ padding: 22, borderLeft: `4px solid ${p.accentBar}`, cursor: "pointer", boxShadow: isOpen ? "var(--shadow-md)" : "var(--shadow-sm)" }} onClick={() => setOpen(isOpen ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 22 }}>{p.emoji}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{p.name}</span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>— {p.subtitle}</span>
                    <Badge color={p.diffColor} bg={p.diffBg}>
                      {p.difficulty}
                    </Badge>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{p.description}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.tech.map((t, j) => (
                      <span key={j} style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: "var(--text-subtle)", marginBottom: 3 }}>API COST</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: p.diffColor }}>{p.cost}</div>
                  <div style={{ fontSize: 18, color: "var(--text-subtle)", marginTop: 10 }}>{isOpen ? "▲" : "▼"}</div>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="lc-grid-2">
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-subtle)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>GitHub Structure</div>
                      <pre style={{ background: "var(--code-bg)", border: "1px solid var(--code-border)", borderRadius: 9, padding: 14, fontSize: 12, color: "var(--code-text)", margin: 0, lineHeight: 1.8, fontFamily: "ui-monospace, Menlo, monospace" }}>
                        {p.structure}
                      </pre>
                      {p.skills?.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontSize: 10, color: "var(--text-subtle)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>Concepts used</div>
                          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            {p.skills.map((sid) => {
                              const c = conceptsDeep.find((x) => x.id === sid);
                              if (!c) return null;
                              return (
                                <button
                                  key={sid}
                                  onClick={() => onNavigate("concepts", sid)}
                                  style={{ background: c.bg, color: c.accent, border: `1px solid ${c.accent}44`, borderRadius: 7, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                                >
                                  {c.icon} {c.title.split("—")[0].split("&")[0].trim()} →
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-subtle)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>✨ Wow Factor</div>
                      <div style={{ background: p.diffBg, border: `1px solid ${p.diffColor}33`, borderRadius: 9, padding: 14, fontSize: 13, color: p.diffColor, lineHeight: 1.6, fontWeight: 500, marginBottom: 12 }}>{p.wow}</div>
                      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9, padding: 14, fontSize: 12, color: "var(--text-secondary)", lineHeight: 2 }}>
                        <strong style={{ color: "var(--text)" }}>README must include:</strong>
                        <br />✓ Architecture diagram
                        <br />✓ Demo GIF / video
                        <br />✓ .env.example file
                        <br />✓ Cost breakdown
                        <br />✓ "How to run" in 3 steps
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
