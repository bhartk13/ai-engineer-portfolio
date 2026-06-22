/* eslint-disable react-refresh/only-export-components */
import { useProgress, countDone } from "../store.jsx";
import { days } from "../data/roadmap.js";
import { conceptsDeep } from "../data/concepts.js";
import { quizzes } from "../data/quizzes.js";

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", group: "Overview" },
  { id: "learn", label: "Learn Roadmap", icon: "📅", group: "Study" },
  { id: "concepts", label: "Core Concepts", icon: "🧠", group: "Study" },
  { id: "glossary", label: "Glossary", icon: "📖", group: "Study" },
  { id: "quizzes", label: "Quizzes", icon: "📝", group: "Practice" },
  { id: "flashcards", label: "Flashcards", icon: "🃏", group: "Practice" },
  { id: "projects", label: "Projects", icon: "🚀", group: "Build" },
  { id: "cost", label: "Cost Guide", icon: "💰", group: "Build" },
];

const GROUPS = ["Overview", "Study", "Practice", "Build"];

export default function Sidebar({ page, onNavigate, open, onClose }) {
  const { state } = useProgress();

  const totalItems = days.length + conceptsDeep.length;
  const doneItems = countDone(state.days) + countDone(state.concepts);
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const quizzesDone = Object.keys(state.quizScores || {}).length;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, backdropFilter: "blur(2px)" }}
          className="sidebar-overlay"
        />
      )}
      <aside
        style={{
          width: 256,
          background: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          zIndex: 201,
        }}
        data-open={open ? "true" : "false"}
        className="lc-sidebar"
      >
        {/* Brand */}
        <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "#fff",
              fontWeight: 900,
              flexShrink: 0,
              boxShadow: "0 6px 16px rgba(37,99,235,0.4)",
            }}
          >
            ⛓
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.2px" }}>LangChain</div>
            <div style={{ fontSize: 10, color: "var(--sidebar-muted)", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>
              Learning Lab
            </div>
          </div>
        </div>

        {/* Progress mini */}
        <div style={{ padding: "0 20px 16px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 11,
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--sidebar-muted)", fontWeight: 600 }}>Course progress</span>
              <span style={{ fontSize: 11, color: "#fff", fontWeight: 800 }}>{pct}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                  borderRadius: 99,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--sidebar-muted)", marginTop: 8 }}>
              {doneItems}/{totalItems} lessons · {quizzesDone}/{quizzes.length} quizzes
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 16px" }}>
          {GROUPS.map((group) => (
            <div key={group} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 9.5,
                  color: "var(--sidebar-muted)",
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  padding: "0 10px 6px",
                }}
              >
                {group}
              </div>
              {NAV.filter((n) => n.group === group).map((n) => {
                const active = page === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      onNavigate(n.id);
                      onClose?.();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      width: "100%",
                      textAlign: "left",
                      background: active ? "var(--sidebar-active)" : "transparent",
                      color: active ? "#fff" : "var(--sidebar-text)",
                      border: "none",
                      borderRadius: 9,
                      padding: "9px 11px",
                      marginBottom: 2,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      fontFamily: "inherit",
                      transition: "background 0.12s, color 0.12s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 99,
                          background: "linear-gradient(180deg, #2563eb, #7c3aed)",
                        }}
                      />
                    )}
                    <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span>
                    {n.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 10.5, color: "var(--sidebar-muted)" }}>
          Built for AI engineers · v2
        </div>
      </aside>
    </>
  );
}
