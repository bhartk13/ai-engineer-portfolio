# ⛓ LangChain Mastery Roadmap

An interactive 2-week learning roadmap for LangChain & Agentic AI development — built as a React component. Includes day-by-day plans, copy-ready code samples, 5 portfolio project blueprints, key concepts, and a low-cost API strategy.

> **Live preview:** Open `langchain-roadmap.jsx` directly on [Claude.ai](https://claude.ai) as an Artifact, or run locally with Vite (instructions below).

---

## 📸 Features

- 📅 **7-block 2-week roadmap** with copyable code for each day
- 🚀 **5 portfolio project blueprints** with GitHub folder structure
- 🧠 **8 core LangChain concepts** explained simply
- 💰 **Cost guide** — complete this roadmap for under $3 in API costs
- 🎨 Dark terminal aesthetic, fully responsive

---

## 🗂 Project Structure

```
langchain-roadmap/
├── src/
│   └── App.jsx              ← Main component (paste langchain-roadmap.jsx here)
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node)

### Step 1 — Create a new Vite + React project

```bash
npm create vite@latest langchain-roadmap -- --template react
cd langchain-roadmap
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Replace the default App

Copy `langchain-roadmap.jsx` into the project and replace `src/App.jsx`:

```bash
# If you downloaded langchain-roadmap.jsx to your Downloads folder:
cp ~/Downloads/langchain-roadmap.jsx src/App.jsx
```

Or open `src/App.jsx` in your editor, delete all contents, and paste in the full code from `langchain-roadmap.jsx`.

### Step 4 — Start the dev server

```bash
npm run dev
```

Open your browser at **http://localhost:5173** — the roadmap will be live with hot reload. ✅

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

### Option A — Vercel (easiest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Your app will be live at `https://langchain-roadmap.vercel.app` in ~60 seconds.

### Option B — GitHub Pages

```bash
npm install --save-dev gh-pages
```

Add to `package.json`:

```json
"homepage": "https://YOUR_USERNAME.github.io/langchain-roadmap",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

Then run:

```bash
npm run deploy
```

---

## 🛠 Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite | Dev server & bundler |
| Tailwind (inline styles) | Styling — no install needed |
| lucide-react (optional) | Icons |

No external dependencies beyond React — this is a zero-config component.

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
