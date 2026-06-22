import { costTiers, modelComparison, budgetStrategy } from "../data/costGuide.js";
import { SectionHeading, Card } from "../components/ui.jsx";

export default function CostGuide() {
  return (
    <div className="page-enter">
      <SectionHeading kicker="Build" title="💰 Low-Cost Learning Strategy" subtitle="Complete the entire curriculum and all 5 projects for under $5 in API costs." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }} className="lc-grid-2">
        {costTiers.map((t, i) => (
          <Card key={i} style={{ padding: 22, borderTop: `3px solid ${t.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{t.tier}</h3>
              <span style={{ fontSize: 15, fontWeight: 800, color: t.color }}>{t.cost}</span>
            </div>
            {t.items.map((item, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: j < t.items.length - 1 ? "1px solid var(--border)" : "none", fontSize: 13, color: "var(--text-secondary)" }}>
                <span style={{ color: t.color, fontSize: 8 }}>●</span>
                {item}
              </div>
            ))}
          </Card>
        ))}
      </div>

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>🆚 Model Comparison</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr>
                {modelComparison.headers.map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelComparison.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: "11px 14px", color: j === 0 ? "var(--text)" : j === 1 ? "#059669" : "var(--text-secondary)", fontWeight: j === 0 ? 700 : 400, borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)", borderLeft: "4px solid var(--primary)", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--primary-strong)", lineHeight: 1.7, fontWeight: 500 }}>
        <strong>💡 Budget Strategy:</strong> {budgetStrategy}
      </div>
    </div>
  );
}
