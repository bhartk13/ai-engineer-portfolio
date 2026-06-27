import {
  AlertCircle,
  BookOpen,
  FilePlus2,
  GitBranch,
  ListTodo,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { ActivityEvent, RunArtifacts, TimelineStep } from "../types";
import { toDisplayString } from "../utils/format";

const STEP_META = {
  plan: { icon: ListTodo, color: "text-sky-300", bg: "bg-sky-500/15" },
  skill: { icon: Sparkles, color: "text-violet-300", bg: "bg-violet-500/15" },
  delegate: { icon: GitBranch, color: "text-amber-300", bg: "bg-amber-500/15" },
  tool: { icon: Wrench, color: "text-emerald-300", bg: "bg-emerald-500/15" },
  thought: { icon: BookOpen, color: "text-slate-400", bg: "bg-white/5" },
  error: { icon: AlertCircle, color: "text-rose-300", bg: "bg-rose-500/15" },
};

function eventToStep(event: ActivityEvent): TimelineStep | null {
  switch (event.type) {
    case "plan":
      return {
        id: event.id,
        kind: "plan",
        label: "Plan updated",
        detail: (event.todos ?? []).join(" · "),
        timestamp: event.timestamp,
      };
    case "skill_load":
      return {
        id: event.id,
        kind: "skill",
        label: `Skill: ${event.skill}`,
        detail: "Progressive disclosure — full SKILL.md loaded on demand",
        timestamp: event.timestamp,
      };
    case "delegation":
      return {
        id: event.id,
        kind: "delegate",
        label: `Subagent: ${event.subagent}`,
        detail: event.description,
        timestamp: event.timestamp,
      };
    case "tool": {
      const name = toDisplayString(event.name);
      const path = toDisplayString(event.args?.path ?? event.args?.file_path);
      const isWrite = ["write_file", "edit_file"].includes(name);
      return {
        id: event.id,
        kind: "tool",
        label: isWrite ? `Write: ${path || name}` : `Tool: ${name}`,
        detail: isWrite ? "Artifact persisted to workspace" : undefined,
        timestamp: event.timestamp,
      };
    }
    case "error":
      return {
        id: event.id,
        kind: "error",
        label: "Error",
        detail: event.message,
        timestamp: event.timestamp,
      };
    default:
      return null;
  }
}

export function OrchestrationTimeline({
  events,
  artifacts,
  isRunning,
  currentRunId,
  onSelectFile,
}: {
  events: ActivityEvent[];
  artifacts: RunArtifacts | null;
  isRunning: boolean;
  currentRunId: string | null;
  onSelectFile: (path: string) => void;
}) {
  const steps = events
    .map(eventToStep)
    .filter((step): step is TimelineStep => step !== null);

  const showArtifacts =
    artifacts &&
    (artifacts.created.length > 0 || artifacts.modified.length > 0);

  return (
    <section className="mb-4 rounded-3xl border border-white/5 bg-surface-900/70 shadow-xl shadow-black/20">
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Orchestration pipeline
            </h2>
            <p className="text-xs text-slate-400">
              Plan → skills → subagents → workspace
            </p>
          </div>
          {currentRunId && (
            <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400">
              run:{currentRunId}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {showArtifacts && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-300">
              <FilePlus2 className="h-3.5 w-3.5" />
              Workspace changes
            </div>
            <div className="flex flex-wrap gap-2">
              {artifacts.created.map((path) => (
                <button
                  key={`c-${path}`}
                  type="button"
                  onClick={() => onSelectFile(path)}
                  className="rounded-lg bg-emerald-500/15 px-2 py-1 font-mono text-[10px] text-emerald-200 hover:bg-emerald-500/25"
                >
                  + {path}
                </button>
              ))}
              {artifacts.modified.map((path) => (
                <button
                  key={`m-${path}`}
                  type="button"
                  onClick={() => onSelectFile(path)}
                  className="rounded-lg bg-amber-500/15 px-2 py-1 font-mono text-[10px] text-amber-200 hover:bg-amber-500/25"
                >
                  ~ {path}
                </button>
              ))}
            </div>
          </div>
        )}

        {steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-surface-850/30 p-6 text-center text-xs text-slate-500">
            {isRunning
              ? "Orchestration steps will appear as the agent runs…"
              : "Send a prompt to see the deep agent loop."}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {steps.map((step, index) => {
              const meta = STEP_META[step.kind];
              const Icon = meta.icon;
              return (
                <div key={step.id} className="flex min-w-[140px] shrink-0 items-start gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.bg}`}
                    >
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    {index < steps.length - 1 && (
                      <div className="my-1 h-6 w-px bg-white/10" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <p className={`text-xs font-semibold ${meta.color}`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="mt-0.5 line-clamp-3 text-[10px] leading-relaxed text-slate-500">
                        {step.detail}
                      </p>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <span className="mt-3 text-slate-600">→</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
