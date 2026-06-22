import { useState, useCallback } from "react";
import { ThemeProvider, ProgressProvider } from "./store.jsx";
import Sidebar, { NAV } from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Learn from "./pages/Learn.jsx";
import Concepts from "./pages/Concepts.jsx";
import Glossary from "./pages/Glossary.jsx";
import Quizzes from "./pages/Quizzes.jsx";
import Flashcards from "./pages/Flashcards.jsx";
import Projects from "./pages/Projects.jsx";
import CostGuide from "./pages/CostGuide.jsx";

function Shell() {
  const [page, setPage] = useState("dashboard");
  const [target, setTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useCallback((nextPage, nextTarget = null) => {
    setPage(nextPage);
    setTarget(nextTarget);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const title = NAV.find((n) => n.id === page)?.label || "Dashboard";

  // re-mount page content when target changes so internal state resyncs
  const pageKey = `${page}:${target ?? ""}`;

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "learn":
        return <Learn target={target} onNavigate={navigate} />;
      case "concepts":
        return <Concepts target={target} onNavigate={navigate} />;
      case "glossary":
        return <Glossary target={target} />;
      case "quizzes":
        return <Quizzes target={target} />;
      case "flashcards":
        return <Flashcards />;
      case "projects":
        return <Projects target={target} onNavigate={navigate} />;
      case "cost":
        return <CostGuide />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-grad)", backgroundAttachment: "fixed" }}>
      <Sidebar page={page} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar title={title} onNavigate={navigate} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main style={{ flex: 1, padding: "26px 28px 48px", maxWidth: 1180, width: "100%", margin: "0 auto", background: "transparent" }} key={pageKey}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ProgressProvider>
        <Shell />
      </ProgressProvider>
    </ThemeProvider>
  );
}
