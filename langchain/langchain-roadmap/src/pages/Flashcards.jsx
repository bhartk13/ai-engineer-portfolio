import { useState } from "react";
import { flashcardDecks } from "../data/flashcards.js";
import { useProgress } from "../store.jsx";
import { SectionHeading, Card, Button, Badge } from "../components/ui.jsx";

function DeckStudy({ deck, onExit }) {
  const { setItem } = useProgress();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState({});

  const card = deck.cards[idx];
  const knownCount = Object.keys(known).length;

  const go = (dir) => {
    setFlipped(false);
    setIdx((i) => {
      const ni = i + dir;
      if (ni < 0) return 0;
      if (ni >= deck.cards.length) {
        setItem("flashcards", deck.id, true);
        return i;
      }
      return ni;
    });
  };

  const mark = (val) => {
    setKnown((k) => {
      const next = { ...k };
      if (val) next[idx] = true;
      else delete next[idx];
      return next;
    });
    if (idx + 1 >= deck.cards.length) {
      setItem("flashcards", deck.id, true);
    }
    go(1);
  };

  const atEnd = idx === deck.cards.length - 1;

  return (
    <div className="page-enter" style={{ maxWidth: 660, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Button variant="ghost" onClick={onExit}>← All decks</Button>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 }}>
          Card {idx + 1} / {deck.cards.length} · {knownCount} known
        </span>
      </div>

      <div style={{ background: "var(--surface-3)", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ width: `${((idx + 1) / deck.cards.length) * 100}%`, height: "100%", background: deck.accent, transition: "width 0.3s ease" }} />
      </div>

      {/* Flip card */}
      <div onClick={() => setFlipped((f) => !f)} style={{ perspective: 1400, cursor: "pointer", marginBottom: 18 }}>
        <div
          style={{
            position: "relative",
            minHeight: 280,
            transition: "transform 0.5s",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* Front */}
          <div
            style={{
              position: flipped ? "absolute" : "relative",
              inset: 0,
              backfaceVisibility: "hidden",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderTop: `3px solid ${deck.accent}`,
              borderRadius: 16,
              boxShadow: "var(--shadow-md)",
              padding: 36,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 280,
            }}
          >
            <div style={{ fontSize: 10.5, color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Question</div>
            <div style={{ fontSize: 21, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>{card.front}</div>
            <div style={{ position: "absolute", bottom: 18, fontSize: 11.5, color: "var(--text-subtle)" }}>Click to reveal answer ↻</div>
          </div>
          {/* Back */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: deck.accent,
              borderRadius: 16,
              boxShadow: "var(--shadow-md)",
              padding: 36,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Answer</div>
            <div style={{ fontSize: 16.5, fontWeight: 500, color: "#fff", lineHeight: 1.6 }}>{card.back}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="soft" onClick={() => go(-1)} disabled={idx === 0} style={idx === 0 ? { opacity: 0.5 } : null}>
          ← Prev
        </Button>
        <Button onClick={() => mark(false)} variant="outline" style={{ color: "#dc2626", borderColor: "#dc2626" }}>
          ✕ Review again
        </Button>
        <Button onClick={() => mark(true)} style={{ background: "#059669", borderColor: "#059669" }}>
          ✓ Got it
        </Button>
        <Button variant="soft" onClick={() => go(1)} disabled={atEnd} style={atEnd ? { opacity: 0.5 } : null}>
          Next →
        </Button>
      </div>
    </div>
  );
}

export default function Flashcards() {
  const { state } = useProgress();
  const [active, setActive] = useState(null);

  if (active) {
    const deck = flashcardDecks.find((d) => d.id === active);
    return <DeckStudy deck={deck} onExit={() => setActive(null)} />;
  }

  return (
    <div className="page-enter">
      <SectionHeading kicker="Practice" title="🃏 Flashcards" subtitle="Active-recall practice. Flip each card, test yourself, and mark what you know." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {flashcardDecks.map((d) => {
          const reviewed = !!state.flashcards[d.id];
          return (
            <Card key={d.id} hover style={{ padding: 22, cursor: "pointer", borderTop: `3px solid ${d.accent}` }} onClick={() => setActive(d.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${d.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{d.icon}</div>
                {reviewed && <Badge color="#059669">✓ Reviewed</Badge>}
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{d.title}</h3>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--text-muted)" }}>{d.cards.length} cards</p>
              <span style={{ fontSize: 13, color: d.accent, fontWeight: 700 }}>Study deck →</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
