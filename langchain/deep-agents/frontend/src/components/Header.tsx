import {
  Bot,
  BrainCircuit,
  FileText,
  Layers3,
  Sparkles,
  Zap,
} from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-white/5 bg-surface-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-emerald-700 shadow-lg shadow-emerald-900/40">
            <BrainCircuit className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Deep Agents
            </h1>
            <p className="text-xs text-slate-400">
              LangChain orchestrator · SKILL.md · multi-agent
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <Stat icon={Layers3} label="Skills" hint="Runtime discovery" />
          <Stat icon={Bot} label="Subagents" hint="Delegated tasks" />
          <Stat icon={FileText} label="Workspace" hint="Shared artifacts" />
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live orchestration
        </div>
      </div>
    </header>
  );
}

function Stat({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Sparkles;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <Icon className="h-4 w-4 text-emerald-400/80" />
      <div>
        <div className="text-xs font-medium text-slate-300">{label}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {hint}
        </div>
      </div>
    </div>
  );
}

export function SuggestedPrompts({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const prompts = [
    "Research multi-agent orchestration trends, draft a blog post, save it, and deploy to a free cloud page.",
    "Review agent.py for production readiness and save findings.",
    "Research LangGraph patterns, write an executive summary, then review the draft.",
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="group rounded-2xl border border-white/5 bg-surface-850/60 p-4 text-left transition hover:border-emerald-500/30 hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="mb-2 h-4 w-4 text-emerald-400 transition group-hover:scale-110" />
          <p className="text-sm leading-relaxed text-slate-300">{prompt}</p>
        </button>
      ))}
    </div>
  );
}
