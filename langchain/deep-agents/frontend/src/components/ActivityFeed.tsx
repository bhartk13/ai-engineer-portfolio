import {
  AlertCircle,
  BookOpen,
  GitBranch,
  ListTodo,
  Loader2,
  Wrench,
} from "lucide-react";
import type { ActivityEvent } from "../types";
import { safeJsonStringify, toDisplayString } from "../utils/format";

const ICONS = {
  thought: BookOpen,
  tool: Wrench,
  delegation: GitBranch,
  skill_load: Loader2,
  plan: ListTodo,
  error: AlertCircle,
};

const LABELS = {
  thought: "Reasoning",
  tool: "Tool call",
  delegation: "Delegation",
  skill_load: "Skill loaded",
  plan: "Plan updated",
  error: "Error",
};

export function ActivityFeed({
  events,
  isRunning,
}: {
  events: ActivityEvent[];
  isRunning: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-3xl border border-white/5 bg-surface-900/70 shadow-2xl shadow-black/20">
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Live activity</h2>
            <p className="text-xs text-slate-400">
              Tool calls, skills, and delegation in real time
            </p>
          </div>
          {isRunning && (
            <span className="animate-pulse-glow rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              Running
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-surface-850/30 p-6 text-center text-sm text-slate-500">
            Agent steps will appear here as they run.
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-white/10 pl-4">
            {events.map((event) => {
              const Icon = ICONS[event.type] ?? Wrench;
              const label = LABELS[event.type] ?? "Event";
              return (
                <li key={event.id} className="animate-slide-up relative">
                  <span className="absolute -left-[1.35rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-800 ring-2 ring-surface-950">
                    <Icon className="h-3 w-3 text-emerald-400" />
                  </span>
                  <div className="rounded-xl border border-white/5 bg-surface-850/70 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        {label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <ActivityBody event={event} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function ActivityBody({ event }: { event: ActivityEvent }) {
  switch (event.type) {
    case "thought":
      return (
        <p className="whitespace-pre-wrap text-sm text-slate-300">
          {toDisplayString(event.content)}
        </p>
      );
    case "delegation":
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-slate-200">
            Subagent: {event.subagent}
          </p>
          {event.description && (
            <p className="text-slate-400">{event.description}</p>
          )}
        </div>
      );
    case "skill_load":
      return (
        <p className="text-sm text-slate-300">
          Loaded <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-emerald-300">{event.skill}</code> skill
        </p>
      );
    case "plan":
      return (
        <ul className="space-y-1 text-sm text-slate-300">
          {(event.todos ?? []).map((todo, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-emerald-400">{i + 1}.</span>
              <span>{toDisplayString(todo)}</span>
            </li>
          ))}
        </ul>
      );
    case "tool":
      return (
        <div className="space-y-1 text-sm">
          <p className="font-mono text-emerald-300">{toDisplayString(event.name)}</p>
          {event.args && (
            <pre className="overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-slate-400">
              {safeJsonStringify(event.args)}
            </pre>
          )}
        </div>
      );
    case "error":
      return <p className="text-sm text-rose-300">{toDisplayString(event.message)}</p>;
    default:
      return null;
  }
}
