import { useState, useMemo, useRef, useEffect } from "react";
import { useTheme } from "../store.jsx";
import { days } from "../data/roadmap.js";
import { conceptsDeep } from "../data/concepts.js";
import { glossary } from "../data/glossary.js";
import { quizzes } from "../data/quizzes.js";
import { projectsData } from "../data/projects.js";

// Build a flat search index once.
function buildIndex() {
  const idx = [];
  days.forEach((d) => idx.push({ type: "Lesson", icon: "📅", title: d.title, sub: d.day, page: "learn", target: d.id, text: (d.title + " " + d.summary + " " + d.concepts.join(" ")).toLowerCase() }));
  conceptsDeep.forEach((c) => idx.push({ type: "Concept", icon: c.icon, title: c.title, sub: c.subtitle, page: "concepts", target: c.id, text: (c.title + " " + c.subtitle + " " + (c.overview || c.tldr) + " " + (c.objectives || []).join(" ")).toLowerCase() }));
  glossary.forEach((g) => idx.push({ type: "Term", icon: "📖", title: g.term, sub: g.category, page: "glossary", target: g.term, text: (g.term + " " + g.def).toLowerCase() }));
  quizzes.forEach((q) => idx.push({ type: "Quiz", icon: q.icon, title: q.title, sub: `${q.questions.length} questions`, page: "quizzes", target: q.id, text: (q.title + " " + q.description).toLowerCase() }));
  projectsData.forEach((p) => idx.push({ type: "Project", icon: p.emoji, title: p.name, sub: p.subtitle, page: "projects", target: p.id, text: (p.name + " " + p.subtitle + " " + p.description).toLowerCase() }));
  return idx;
}

export default function TopBar({ title, onNavigate, onToggleSidebar }) {
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);
  const index = useMemo(() => buildIndex(), []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return index.filter((it) => it.text.includes(term)).slice(0, 8);
  }, [q, index]);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (it) => {
    onNavigate(it.page, it.target);
    setQ("");
    setFocused(false);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 150,
        background: "color-mix(in srgb, var(--surface-2) 90%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, height: 64 }}>
        <button
          onClick={onToggleSidebar}
          className="lc-hamburger"
          style={{
            display: "none",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 9,
            width: 38,
            height: 38,
            cursor: "pointer",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ☰
        </button>

        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.3px", flexShrink: 0 }} className="lc-topbar-title">
          {title}
        </h1>

        {/* Search */}
        <div ref={wrapRef} style={{ position: "relative", flex: 1, maxWidth: 460, marginLeft: "auto" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-subtle)" }}>🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Search lessons, concepts, terms…"
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: `1px solid ${focused ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "9px 14px 9px 36px",
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--text)",
                outline: "none",
                transition: "border 0.15s",
              }}
            />
          </div>

          {focused && q.trim() && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
                animation: "fadeIn 0.12s ease",
              }}
            >
              {results.length === 0 ? (
                <div style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-muted)" }}>No results for “{q}”.</div>
              ) : (
                results.map((it, i) => (
                  <button
                    key={i}
                    onClick={() => go(it)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                      padding: "11px 16px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{it.icon}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{it.title}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{it.sub}</span>
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-subtle)",
                        background: "var(--surface-3)",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      {it.type}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 10,
            width: 40,
            height: 40,
            cursor: "pointer",
            fontSize: 17,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
