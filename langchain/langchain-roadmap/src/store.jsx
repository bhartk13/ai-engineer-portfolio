/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);
const THEME_KEY = "lc_theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS CONTEXT — tracks completed items + quiz scores in localStorage
// ─────────────────────────────────────────────────────────────────────────────
const ProgressContext = createContext(null);
const PROGRESS_KEY = "lc_progress_v1";

const emptyState = {
  // sets of completed item ids, stored as objects { [id]: true }
  days: {},
  concepts: {},
  flashcards: {}, // deckId -> true when fully reviewed
  // best score per quiz: quizId -> { score, total }
  quizScores: {},
  bookmarks: {}, // "type:id" -> true
};

function loadState() {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyState;
    return { ...emptyState, ...JSON.parse(raw) };
  } catch {
    return emptyState;
  }
}

export function ProgressProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  }, [state]);

  const toggleItem = useCallback((bucket, id) => {
    setState((s) => {
      const next = { ...s[bucket] };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { ...s, [bucket]: next };
    });
  }, []);

  const setItem = useCallback((bucket, id, value = true) => {
    setState((s) => {
      const next = { ...s[bucket] };
      if (value) next[id] = true;
      else delete next[id];
      return { ...s, [bucket]: next };
    });
  }, []);

  const recordQuiz = useCallback((quizId, score, total) => {
    setState((s) => {
      const prev = s.quizScores[quizId];
      // keep the best score
      if (prev && prev.score >= score) return s;
      return { ...s, quizScores: { ...s.quizScores, [quizId]: { score, total } } };
    });
  }, []);

  const toggleBookmark = useCallback((key) => {
    setState((s) => {
      const next = { ...s.bookmarks };
      if (next[key]) delete next[key];
      else next[key] = true;
      return { ...s, bookmarks: next };
    });
  }, []);

  const resetAll = useCallback(() => setState(emptyState), []);

  const value = useMemo(
    () => ({ state, toggleItem, setItem, recordQuiz, toggleBookmark, resetAll }),
    [state, toggleItem, setItem, recordQuiz, toggleBookmark, resetAll]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}

// Helper: count of true keys in an object
export const countDone = (obj) => Object.keys(obj || {}).length;
