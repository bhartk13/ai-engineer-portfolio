# ⛓ LangChain Learning Lab

A **comprehensive, interactive learning app for LangChain & Agentic AI**, built with React + Vite. It combines a structured roadmap, deep-dive concept explainers, quizzes, flashcards, a searchable glossary, and portfolio project blueprints — with **progress tracking** and a **light/dark theme** that persist in your browser.

---

## 📸 Features

- 🏠 **Dashboard** — progress ring, stats, "continue learning", and quick links
- 📅 **2-week roadmap** — 7 lessons with objectives, copyable code, tips, docs & completion tracking
- 🧠 **8 deep-dive concepts** — TL;DR, why it matters, analogy, step-by-step, code, gotchas, mastery tracking
- 📝 **Quizzes** — 4 topic quizzes with instant feedback, explanations, and saved best scores
- 🃏 **Flashcards** — 5 decks of flip cards for active-recall practice
- 📖 **Glossary** — 34 searchable, category-filtered terms
- 🚀 **5 portfolio projects** — folder structure, wow-factor, and links to the concepts each one uses
- 💰 **Cost guide** — complete everything for under $5 in API costs
- 🔍 **Global search** across lessons, concepts, terms, quizzes, and projects
- 🌗 **Light/dark theme** + **localStorage progress** — fully responsive

---

## 🗂 Project Structure

```
langchain-roadmap/
├── src/
│   ├── App.jsx              ← Layout + routing
│   ├── store.jsx           ← Theme + progress contexts (localStorage)
│   ├── index.css           ← Design system + light/dark themes
│   ├── components/         ← Sidebar, TopBar (search), shared UI, CodeBlock
│   ├── pages/             ← Dashboard, Learn, Concepts, Quizzes, Flashcards, Glossary, Projects, CostGuide
│   └── data/              ← Content modules (roadmap, concepts, quizzes, flashcards, glossary, …)
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v20.19+ or v22.12+ (required by Vite 7)
- npm (comes with Node)

### Steps

```bash
npm install     # install dependencies
npm run dev     # start the dev server
```

Open your browser at **http://localhost:5173** — the app will be live with hot reload. ✅

Other scripts:

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

---

## 📤 Push to GitHub

### Step 1 — Initialize git (if not already done)

```bash
git init
git add .
git commit -m "feat: add LangChain 2-week mastery roadmap"
```

### Step 2 — Create a new repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name it `langchain-roadmap` (or any name you like)
3. Leave it **public** for portfolio visibility
4. Do **not** initialize with README (you already have one)
5. Click **Create repository**

### Step 3 — Connect and push

```bash
git remote add origin https://github.com/YOUR_USERNAME/langchain-roadmap.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🌐 Deploy for Free (Optional but recommended for portfolio)

### Vercel (easiest)

```bash
npm install -g vercel
vercel .
```

Follow the prompts. Your app will be live at `https://langchain-roadmap.vercel.app` in ~60 seconds.

Current URL: https://langchain-roadmap-93tlj66k2-bharteeshs-projects.vercel.app
---

## 🛠 Tech Stack

| Tool | Purpose |
|------|---------|
| React 19 | UI framework |
| Vite 7 | Dev server & bundler |
| CSS variables + inline styles | Theming (light/dark) — no CSS framework needed |
| localStorage | Progress & theme persistence |

No external UI dependencies beyond React — styling is a self-contained design system.

---

## 📋 The 5 Portfolio Projects Inside

| # | Project | Difficulty | Est. Cost |
|---|---------|-----------|-----------|
| 1 | DocuMind — PDF Q&A Bot | Beginner | ~$0.01/session |
| 2 | AutoResearcher — Web Agent | Intermediate | ~$0.05/query |
| 3 | MemoryBot — Persistent Chatbot | Beginner | ~$0.002/msg |
| 4 | CodeReviewer — AI Code Analyst | Intermediate | ~$0.02/review |
| 5 | MultiAgent Planner — LangGraph | Advanced | ~$0.10/task |

---

## 💡 Cost Tips

- **Free:** Use [Ollama](https://ollama.com) locally (Llama 3.2) or [Groq](https://groq.com) free tier
- **Cheap paid:** `gpt-3.5-turbo` ($0.001/1K tokens) or Claude Haiku ($0.25/1M input tokens)
- **Embeddings free:** `sentence-transformers/all-MiniLM-L6-v2` via HuggingFace

---

## 📄 License

MIT — free to use, fork, and build on.

---

*Built as part of an AI portfolio showcase. Star ⭐ if this helped you learn LangChain!*
