import { useState, useMemo, useEffect } from "react";
import { glossary } from "../data/glossary.js";
import { SectionHeading, Card } from "../components/ui.jsx";

const CATEGORY_COLORS = {
  Core: "#2563eb",
  Prompts: "#059669",
  RAG: "#dc2626",
  Tools: "#b45309",
  Agents: "#0891b2",
  LangGraph: "#7c3aed",
  Memory: "#db2777",
  Observability: "#475569",
};

export default function Glossary({ target }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [highlight, setHighlight] = useState(target || null);

  const categories = useMemo(() => ["All", ...Array.from(new Set(glossary.map((g) => g.category))).sort()], []);

  // Scroll to and briefly highlight a term linked from search. The component
  // remounts when `target` changes (App keys pages by target), so this runs once.
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => {
      document.getElementById(`term-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const clear = setTimeout(() => setHighlight(null), 2400);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, [target]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return glossary
      .filter((g) => (cat === "All" ? true : g.category === cat))
      .filter((g) => (term ? (g.term + " " + g.def).toLowerCase().includes(term) : true))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [q, cat]);

  return (
    <div className="page-enter">
      <SectionHeading kicker="Study" title="📖 Glossary" subtitle={`${glossary.length} essential LangChain terms, defined in plain language.`} />

      {/* Controls */}
      <Card style={{ padding: 16, marginBottom: 18 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search terms and definitions…"
          style={{
            width: "100%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "11px 14px",
            fontSize: 13.5,
            fontFamily: "inherit",
            color: "var(--text)",
            outline: "none",
            marginBottom: 14,
          }}
        />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {categories.map((c) => {
            const active = cat === c;
            const color = CATEGORY_COLORS[c] || "var(--primary)";
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  background: active ? color : "var(--surface-2)",
                  color: active ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${active ? color : "var(--border)"}`,
                  padding: "6px 13px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No terms match “{q}”.</Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map((g) => {
            const color = CATEGORY_COLORS[g.category] || "var(--primary)";
            const isHi = highlight === g.term;
            return (
              <div
                key={g.term}
                id={`term-${g.term}`}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isHi ? color : "var(--border)"}`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  boxShadow: isHi ? `0 0 0 3px ${color}33` : "var(--shadow-sm)",
                  transition: "box-shadow 0.3s, border 0.3s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 7 }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--text)" }}>{g.term}</h3>
                  <span style={{ fontSize: 9.5, color, background: `${color}1a`, border: `1px solid ${color}33`, borderRadius: 6, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {g.category}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{g.def}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
