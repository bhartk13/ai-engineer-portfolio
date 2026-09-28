import { buildSession, canAdvance, evaluateAnswer, parseJob } from "./core/index.js";
import { SAMPLE_JD } from "./core/sampleJob.js";

const STORAGE_KEY = "prepme.v1";
const VERDICT_LABEL = {
  good: "Good",
  "needs-improvement": "Needs improvement",
  bad: "Bad",
};

const state = load() || fresh();
let recognition = null;
let shouldListen = false;
let finalText = "";
clearDrafts();

const app = document.querySelector("#app");
app.addEventListener("click", onClick);
app.addEventListener("input", onInput);
app.addEventListener("dragover", onDrag);
app.addEventListener("dragleave", (event) => {
  if (event.target.closest(".drop")) event.target.closest(".drop").classList.remove("is-hot");
});
app.addEventListener("drop", onDrop);
document.addEventListener("keydown", onKey);
window.addEventListener("pageshow", () => {
  clearDrafts();
  render();
});

render();

function fresh() {
  return {
    phase: "setup",
    jdText: "",
    fileName: "",
    profile: null,
    questions: [],
    index: 0,
    transcript: "",
    listening: false,
    speechError: "",
    feedback: null,
    passed: {},
    attempts: {},
    sheetOpen: true,
    sampleOpen: false,
    setupError: "",
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || !saved.phase) return null;
    const next = fresh();
    next.phase = saved.phase;
    next.jdText = saved.jdText || "";
    next.fileName = saved.fileName || "";
    next.index = saved.index || 0;
    next.passed = saved.passed || {};
    next.attempts = saved.attempts || {};
    next.sheetOpen = saved.sheetOpen !== false;
    if (next.phase === "setup") {
      next.jdText = "";
      next.fileName = "";
    } else {
      next.profile = parseJob(next.jdText);
      next.questions = buildSession(next.profile);
      if (!next.questions.length || next.index >= next.questions.length) return null;
    }
    return next;
  } catch {
    return null;
  }
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      phase: state.phase,
      jdText: state.jdText,
      fileName: state.fileName,
      index: state.index,
      passed: state.passed,
      attempts: state.attempts,
      sheetOpen: state.sheetOpen,
    }),
  );
}

function clearDrafts() {
  state.transcript = "";
  state.feedback = null;
  state.speechError = "";
  state.setupError = "";
  state.sampleOpen = false;
  finalText = "";
  if (state.phase === "setup") {
    state.jdText = "";
    state.fileName = "";
  }
  save();
}

function render() {
  if (state.phase === "setup") app.innerHTML = setupHtml();
  else if (state.phase === "summary") app.innerHTML = summaryHtml();
  else app.innerHTML = practiceHtml();

  const jd = document.querySelector("#jd");
  if (jd) jd.value = state.jdText;
  const transcript = document.querySelector("#transcript");
  if (transcript) transcript.value = state.transcript;
}

function setupHtml() {
  return `
    <section class="setup">
      <aside class="setup-side">
        <div>
          <p class="mark">PrepMe</p>
          <p class="lede">Practice the interview for the job in front of you. Move on only when the answer is good.</p>
          <ul class="rules">
            <li><strong>1. Drop the role</strong><span>Paste the description. PrepMe matches drills to the skills in it.</span></li>
            <li><strong>2. Answer out loud</strong><span>Use the voice button, or type the words you would say.</span></li>
            <li><strong>3. Earn the next question</strong><span>Next stays locked until the verdict is Good.</span></li>
          </ul>
        </div>
        <p class="fine">Original drills, matched to the description. PrepMe does not copy question banks off the internet.</p>
      </aside>
      <main class="setup-main">
        <p class="kicker">Interview studio</p>
        <h1>Prep the role you actually want.</h1>
        <p class="sub">Upload the job description and hit PrepMe. Each question has a voice button, instant feedback, and a cheat sheet. You retry until it is good.</p>
        <div class="drop" id="drop">
          <label class="sr-only" for="jd">Job description</label>
          <textarea id="jd" autocomplete="off" placeholder="Paste the job description here."></textarea>
          <div class="row">
            <button class="btn" type="button" data-action="sample">Use a sample role</button>
            <button class="btn" type="button" data-action="browse">Upload text</button>
            <input id="jd-file" type="file" accept=".txt,.md,.markdown,text/plain" hidden />
            <span class="file-name">${escapeHtml(state.fileName)}</span>
            <span class="grow"></span>
            <button class="btn btn-primary" type="button" data-action="prep">PrepMe</button>
          </div>
        </div>
        ${state.setupError ? `<p class="error">${escapeHtml(state.setupError)}</p>` : ""}
      </main>
    </section>
  `;
}

function practiceHtml() {
  const question = current();
  const already = Boolean(state.passed[question.id]);
  const can = canAdvance(state.feedback?.verdict, already);
  const last = state.index === state.questions.length - 1;
  const skills = state.profile.skills.slice(0, 8);

  return `
    <section class="studio">
      <aside class="rail">
        <div class="rail-top">
          <p class="word">PrepMe</p>
          <button class="quiet" type="button" data-action="reset">Start over</button>
        </div>
        <div class="q-list">
          ${state.questions
            .map((item, index) => {
              const open = index <= state.index || state.passed[item.id] || index === state.index;
              const passed = Boolean(state.passed[item.id]);
              const cls = [
                "q-pill",
                index === state.index ? "is-current" : "",
                passed ? "is-done" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const status = passed ? "Passed" : index === state.index ? "Now" : "Locked";
              return `<button class="${cls}" type="button" data-action="jump" data-index="${index}" ${open ? "" : "disabled"}>
                <span class="num">${index + 1}</span>
                <span>${escapeHtml(clip(item.prompt, 42))}<small>${status}</small></span>
              </button>`;
            })
            .join("")}
        </div>
      </aside>
      <main class="stage">
        <p class="meta">Question ${state.index + 1} of ${state.questions.length} · ${escapeHtml(state.profile.roleLabel)} · ${escapeHtml(state.profile.seniority)}</p>
        <div class="chips">${skills.map((skill) => `<span class="chip">${escapeHtml(skill.label)}</span>`).join("")}</div>
        <h1 class="prompt">${escapeHtml(question.prompt)}</h1>
        <p class="why">${escapeHtml(question.why)}</p>
        <button class="btn hear" type="button" data-action="speak">Hear the question</button>
        <div class="answer-box">
          <label class="sr-only" for="transcript">Your answer</label>
          <textarea id="transcript" autocomplete="off" placeholder="Speak, or type the answer you would give out loud."></textarea>
          <div class="controls">
            <button class="mic ${state.listening ? "is-live" : ""}" type="button" data-action="mic" aria-pressed="${state.listening ? "true" : "false"}" aria-label="${state.listening ? "Stop and check" : "Speak your answer"}">
              ${micIcon()}
            </button>
            <span class="mic-label">${state.listening ? "Listening… stop to check" : "Speak your answer"}</span>
            <span class="grow"></span>
            <button class="btn" type="button" data-action="sample-answer" aria-expanded="${state.sampleOpen ? "true" : "false"}">${state.sampleOpen ? "Hide sample" : "Sample answer"}</button>
            <button class="btn" type="button" data-action="grade">Check answer</button>
            <button class="btn btn-primary" type="button" data-action="next" ${can ? "" : "disabled"}>${can ? (last ? "Finish session" : "Next question") : "Next is locked"}</button>
          </div>
          ${
            already
              ? `<p class="passed-note">You already passed this question. Next is available.</p>`
              : can
                ? ""
                : `<p class="lock-note">Next stays locked until this answer is Good.</p>`
          }
          ${state.speechError ? `<p class="error">${escapeHtml(state.speechError)}</p>` : ""}
        </div>
        ${sampleHtml(question)}
        ${feedbackHtml()}
      </main>
      ${sheetHtml(question)}
    </section>
  `;
}

function feedbackHtml() {
  if (!state.feedback) return "";
  const result = state.feedback;
  return `
    <section class="verdict verdict-${result.verdict}" id="feedback" aria-live="polite">
      <h2>${VERDICT_LABEL[result.verdict]}</h2>
      <ul>${result.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
      <ul class="signals">
        ${result.hits
          .map(
            (hit) =>
              `<li class="${hit.hit ? "hit" : "miss"}">${escapeHtml(hit.label)}</li>`,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function sampleHtml(question) {
  if (!state.sampleOpen) return "";
  return `
    <section class="sample" id="sample">
      <h2>Sample answer</h2>
      <p class="sample-note">One way to answer this. Use it as a reference, then say it in your own words.</p>
      <p class="sketch">${escapeHtml(question.cheat.sketch)}</p>
    </section>
  `;
}

function sheetHtml(question) {
  const cheat = question.cheat;
  return `
    <aside class="sheet">
      <div class="sheet-top">
        <h2>Cheat sheet</h2>
        <button class="quiet" type="button" data-action="sheet">${state.sheetOpen ? "Cover" : "Show"}</button>
      </div>
      <div class="sheet-body ${state.sheetOpen ? "" : "hidden"}">
        <span class="framework">${escapeHtml(cheat.framework)}</span>
        <h3>Hit these ideas</h3>
        <ul>${cheat.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <h3>Avoid</h3>
        <ul>${cheat.pitfalls.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <p class="sample-hint">The full example is under Sample answer.</p>
      </div>
    </aside>
  `;
}

function summaryHtml() {
  const passed = Object.keys(state.passed).length;
  const firstTry = Object.values(state.passed).filter((item) => item.firstTry).length;
  const tries = Object.values(state.attempts).reduce((sum, n) => sum + n, 0);
  return `
    <main class="summary">
      <p class="kicker">${escapeHtml(state.profile.title)}</p>
      <h1>Session cleared.</h1>
      <p class="sub">You passed ${passed} of ${state.questions.length} questions. ${firstTry} of those were good on the first try.</p>
      <div class="stats">
        <div class="stat"><b>${passed}</b> passed</div>
        <div class="stat"><b>${firstTry}</b> first try</div>
        <div class="stat"><b>${tries}</b> attempts</div>
      </div>
      <ul class="summary-list">
        ${state.questions
          .map((question) => {
            const info = state.passed[question.id];
            const triesForQ = state.attempts[question.id] || 0;
            const label = info ? (info.firstTry ? "Good on the first try" : `Good after ${triesForQ} tries`) : "Not passed";
            return `<li><span>${escapeHtml(clip(question.prompt, 80))}</span><span>${label}</span></li>`;
          })
          .join("")}
      </ul>
      <button class="btn btn-primary" type="button" data-action="reset">Prep another role</button>
    </main>
  `;
}

function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "sample") {
    state.jdText = SAMPLE_JD;
    state.fileName = "Sample frontend role";
    state.setupError = "";
    render();
  } else if (action === "browse") {
    document.querySelector("#jd-file").click();
    document.querySelector("#jd-file").onchange = async (change) => {
      const file = change.target.files?.[0];
      if (file) await readJobFile(file);
    };
  } else if (action === "prep") {
    prep();
  } else if (action === "mic") {
    if (state.listening) stopListening(true);
    else startListening();
  } else if (action === "grade") {
    grade();
  } else if (action === "next") {
    goNext();
  } else if (action === "jump") {
    goTo(Number(button.dataset.index));
  } else if (action === "speak") {
    speakQuestion();
  } else if (action === "sample-answer") {
    state.sampleOpen = !state.sampleOpen;
    render();
    if (state.sampleOpen) document.getElementById("sample")?.scrollIntoView({ block: "nearest" });
  } else if (action === "sheet") {
    state.sheetOpen = !state.sheetOpen;
    save();
    render();
  } else if (action === "reset") {
    silence();
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, fresh());
    render();
  }
}

function onInput(event) {
  if (event.target.id === "jd") state.jdText = event.target.value;
  if (event.target.id === "transcript") state.transcript = event.target.value;
}

function onKey(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && state.phase === "practice") {
    event.preventDefault();
    grade();
  }
}

function onDrag(event) {
  const drop = event.target.closest?.(".drop");
  if (!drop || state.phase !== "setup") return;
  event.preventDefault();
  drop.classList.add("is-hot");
}

async function onDrop(event) {
  const drop = event.target.closest?.(".drop");
  if (!drop || state.phase !== "setup") return;
  event.preventDefault();
  drop.classList.remove("is-hot");
  const file = event.dataTransfer.files?.[0];
  if (file) await readJobFile(file);
}

async function readJobFile(file) {
  const text = await file.text();
  const looksBinary = text.includes("\u0000") || /%PDF/.test(text.slice(0, 20));
  if (looksBinary) {
    state.setupError = "Paste the description as text. PrepMe reads the words, not a PDF layout.";
    render();
    return;
  }
  state.jdText = text;
  state.fileName = file.name;
  state.setupError = "";
  render();
}

function prep() {
  const jd = document.querySelector("#jd");
  if (jd) state.jdText = jd.value;
  const text = state.jdText.trim();
  const profile = parseJob(text);
  const recognized = profile.skillIds.length > 0 || profile.role !== "swe";
  if (text.length < 8 || (text.length < 40 && !recognized)) {
    state.setupError = "Paste a fuller job description, or name the role. A title like Agentic AI engineer is enough.";
    render();
    return;
  }
  const questions = buildSession(profile);
  if (!questions.length) {
    state.setupError = "No drills matched. Add more of the role's skills and try again.";
    render();
    return;
  }
  state.profile = profile;
  state.questions = questions;
  state.index = 0;
  state.transcript = "";
  state.feedback = null;
  state.passed = {};
  state.attempts = {};
  state.speechError = "";
  state.sampleOpen = false;
  state.phase = "practice";
  state.setupError = "";
  save();
  render();
}

function grade() {
  const box = document.querySelector("#transcript");
  if (box) state.transcript = box.value;
  const question = current();
  const transcript = state.transcript.trim();
  if (!transcript) {
    state.speechError = "Say or type an answer first.";
    render();
    return;
  }
  state.speechError = "";
  state.attempts[question.id] = (state.attempts[question.id] || 0) + 1;
  const result = evaluateAnswer(question, transcript);
  state.feedback = result;
  if (result.verdict === "good" && !state.passed[question.id]) {
    state.passed[question.id] = {
      attempts: state.attempts[question.id],
      firstTry: state.attempts[question.id] === 1,
    };
  }
  save();
  render();
  document.getElementById("feedback")?.scrollIntoView({ block: "nearest" });
}

function goNext() {
  const question = current();
  if (!canAdvance(state.feedback?.verdict, state.passed[question.id])) return;
  silence();
  if (state.index >= state.questions.length - 1) state.phase = "summary";
  else {
    state.index += 1;
    state.transcript = "";
    state.feedback = null;
    state.speechError = "";
    state.sampleOpen = false;
  }
  save();
  render();
}

function goTo(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.questions.length) return;
  const target = state.questions[index];
  const open = index === state.index || Boolean(state.passed[target.id]) || index < state.index;
  if (!open || index === state.index) return;
  silence();
  state.index = index;
  state.transcript = "";
  state.feedback = null;
  state.speechError = "";
  state.sampleOpen = false;
  save();
  render();
}

function current() {
  return state.questions[state.index];
}

function startListening() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    state.speechError = "This browser has no speech recognition. Type your answer, or open PrepMe in Chrome or Edge.";
    render();
    document.querySelector("#transcript")?.focus();
    return;
  }
  silence();
  recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  finalText = state.transcript.trim();
  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText = `${finalText} ${piece}`.trim();
      else interim += piece;
    }
    state.transcript = `${finalText} ${interim}`.replace(/\s+/g, " ").trim();
    const box = document.querySelector("#transcript");
    if (box) box.value = state.transcript;
  };
  recognition.onerror = (event) => {
    if (event.error === "aborted" || event.error === "no-speech") return;
    shouldListen = false;
    state.listening = false;
    state.speechError =
      event.error === "not-allowed"
        ? "Microphone permission is blocked. Allow it, or type your answer."
        : "Voice capture stopped. You can keep typing.";
    render();
  };
  recognition.onend = () => {
    if (!shouldListen) return;
    try {
      recognition.start();
    } catch {
      shouldListen = false;
      state.listening = false;
    }
  };
  shouldListen = true;
  state.listening = true;
  state.speechError = "";
  try {
    recognition.start();
  } catch {
    state.listening = false;
    shouldListen = false;
    state.speechError = "The microphone did not start. Type your answer instead.";
  }
  render();
}

function stopListening(autoGrade) {
  shouldListen = false;
  state.listening = false;
  if (recognition) {
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  }
  if (autoGrade) grade();
  else render();
}

function silence() {
  shouldListen = false;
  state.listening = false;
  if (recognition) {
    recognition.onend = null;
    recognition.onresult = null;
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  }
  recognition = null;
  window.speechSynthesis?.cancel();
}

function speakQuestion() {
  const question = current();
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(question.prompt);
  utterance.rate = 0.96;
  window.speechSynthesis.speak(utterance);
}

function micIcon() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
    <rect x="9" y="3" width="6" height="11" rx="3"></rect>
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8"></path>
  </svg>`;
}

function clip(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
