## Business Idea Generator (SAAS Sample)

An AI-powered **business idea generator** built with Next.js (Pages Router) and a FastAPI backend that streams ideas from an OpenAI chat model using Server‑Sent Events (SSE).

The app renders a modern, responsive UI and continuously updates the page with a freshly generated AI business idea for AI agents.

---

## Features

- **AI-generated ideas**: Uses OpenAI’s chat completions API to generate new business ideas for AI agents.
- **Streaming UX**: Backend streams tokens over SSE so ideas appear progressively on the page.
- **Markdown rendering**: Ideas are formatted with headings, sub‑headings, and bullet points and rendered with `react-markdown` + GFM.
- **Modern UI**: Gradient background, centered content card, and loading state for a polished SaaS-style experience.
- **Vercel-ready**: Frontend (Next.js) and backend (FastAPI) are both deployable on Vercel.

---

## Tech Stack

- **Frontend**
  - Next.js (Pages Router)
  - React, TypeScript
  - `react-markdown`, `remark-gfm`, `remark-breaks` for rich text rendering
- **Backend**
  - FastAPI (`samples/saas/api/index.py`)
  - OpenAI Python SDK
  - Server-Sent Events via `StreamingResponse`

---

## Project Structure

- `pages/index.tsx` – Main UI for the business idea generator. Connects to `/api` using `EventSource` and renders streaming markdown.
- `api/index.py` – FastAPI app that:
  - Calls `OpenAI().chat.completions.create(..., stream=True)` with model `gpt-5-nano`.
  - Streams chunks as SSE lines so the frontend can update in real time.
- `styles/globals.css` – Global styling and Tailwind-like utility classes.
- `requirements.txt` – Python dependencies for the FastAPI route (FastAPI, uvicorn, openai).

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **Python** (3.10+ recommended) – for the FastAPI backend when running locally
- An **OpenAI API key**

---

## Environment Variables

Set your OpenAI API key so both the backend and any local tools can access it.

Create a `.env` file at the repo root (or in `samples/saas` if you prefer) with:

```bash
OPENAI_API_KEY=sk-...
```

When deploying to Vercel, configure the same variable in **Project Settings → Environment Variables**:

- **Name**: `OPENAI_API_KEY`
- **Value**: your secret key
- **Environment**: Production (and Preview/Development if needed)

---

## Running Locally

### 1. Install Node dependencies

From the `samples/saas` directory:

```bash
npm install
```

### 2. Install Python dependencies (optional, for local FastAPI)

Still in `samples/saas`:

```bash
pip install -r requirements.txt
```

> On Vercel you do **not** need to do this manually; Vercel installs from `requirements.txt` automatically for the Python function.

### 3. Start the Next.js development server

From `samples/saas`:

```bash
npm run dev
```

Then open:

- `http://localhost:3000` – main Business Idea Generator UI

The frontend will call the `/api` endpoint, which is wired to the FastAPI function in `api/index.py` when deployed on Vercel.

---

## Deployment to Vercel

1. **Push** this project to GitHub (or another Git provider).
2. In Vercel, **Import Project** and select `samples/saas` as the project root (if needed).
3. Ensure Vercel detects:
   - Framework: **Next.js**
   - Build command: `npm run build`
   - Output directory: `.next`
4. Verify that `samples/saas/requirements.txt` is present so Vercel installs:
   - `fastapi`
   - `uvicorn`
   - `openai`
5. Add the `OPENAI_API_KEY` environment variable in Vercel.
6. Click **Deploy**.

On successful deployment:

- `https://your-project.vercel.app/` – main UI
- The backend FastAPI function will be available at the `/api` path and stream ideas to the frontend.


