/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared style tokens (theme-aware via CSS variables)
// ─────────────────────────────────────────────────────────────────────────────
export const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "var(--shadow-sm)",
};

/** Tint a surface with a lesson/concept accent — avoids near-white pastels */
export function accentTint(accent, pct = "18%") {
  return `color-mix(in srgb, ${accent} ${pct}, var(--surface))`;
}

export function Card({ children, style, hover, ...rest }) {
  const [h, setH] = useState(false);
  return (
    <div
      className="lc-card"
      {...rest}
      onMouseEnter={(e) => {
        if (hover) setH(true);
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hover) setH(false);
        rest.onMouseLeave?.(e);
      }}
      style={{
        ...cardStyle,
        ...(hover && h ? { boxShadow: "var(--shadow-md)", transform: "translateY(-2px)" } : null),
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ children, color = "var(--primary)", bg, style }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: bg || `${color}1a`,
        color,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        padding: "3px 11px",
        fontSize: 11,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Button({ children, variant = "primary", style, ...rest }) {
  const variants = {
    primary: { background: "var(--primary)", color: "#fff", border: "1px solid var(--primary)" },
    soft: { background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" },
    ghost: { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" },
    outline: { background: "transparent", color: "var(--primary)", border: "1px solid var(--primary)" },
  };
  return (
    <button
      {...rest}
      style={{
        padding: "8px 16px",
        borderRadius: 9,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "inherit",
        fontWeight: 600,
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, total, color = "var(--primary)", height = 8 }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ background: "var(--surface-3)", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

export function SectionHeading({ kicker, title, subtitle, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
      <div>
        {kicker && (
          <div style={{ fontSize: 10.5, color: "var(--primary)", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 7 }}>
            {kicker}
          </div>
        )}
        <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>{title}</h2>
        {subtitle && <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13.5, maxWidth: 640, lineHeight: 1.6 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy-to-clipboard hook
// ─────────────────────────────────────────────────────────────────────────────
export function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = useCallback((text, id) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);
  return { copied, copy };
}

// ─────────────────────────────────────────────────────────────────────────────
// Code block (terminal style)
// ─────────────────────────────────────────────────────────────────────────────
export function CodeBlock({ code, id, copied, onCopy, filename = "example.py", maxHeight = 440 }) {
  return (
    <div style={{ background: "var(--code-bg)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--code-border)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "var(--code-bar)",
          borderBottom: "1px solid var(--code-border)",
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["#ff5f57", "#ffbd2e", "#28c840"].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
          <span style={{ fontSize: 11.5, color: "#8a93a8", marginLeft: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            python · {filename}
          </span>
        </div>
        <button
          onClick={() => onCopy(code, id)}
          style={{
            background: copied === id ? "#28c84020" : "#ffffff12",
            border: `1px solid ${copied === id ? "#28c84055" : "#ffffff20"}`,
            color: copied === id ? "#28c840" : "#9aa4ba",
            padding: "5px 13px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11.5,
            fontFamily: "inherit",
            fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          {copied === id ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "18px 20px",
          fontSize: 12.5,
          lineHeight: 1.8,
          color: "var(--code-text)",
          overflowX: "auto",
          maxHeight,
          overflowY: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────────────────────────────────────
export function StatTile({ icon, label, value, sub, color = "var(--primary)" }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: `${color}1a`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
        </div>
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 10 }}>{sub}</div>}
    </Card>
  );
}

// Circular progress ring
export function ProgressRing({ value, total, size = 120, stroke = 10, color = "var(--primary)", label }) {
  const pct = total > 0 ? value / total : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>{Math.round(pct * 100)}%</div>
        {label && <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>}
      </div>
    </div>
  );
}
