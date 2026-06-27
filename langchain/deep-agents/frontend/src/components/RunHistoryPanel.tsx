import { Clock3, History, Loader2 } from "lucide-react";
import type { RunSummary } from "../types";

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "running…";
  return new Date(iso).toLocaleString();
}

export function RunHistoryPanel({
  runs,
  selectedRunId,
  loading,
  onSelectRun,
}: {
  runs: RunSummary[];
  selectedRunId: string | null;
  loading: boolean;
  onSelectRun: (runId: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading runs…
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-surface-850/30 p-6 text-center text-xs leading-relaxed text-slate-500">
        Run history is saved under <code className="text-slate-400">./runs/</code>.
        Complete a chat to create your first record.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <button
          key={run.id}
          type="button"
          onClick={() => onSelectRun(run.id)}
          className={`w-full rounded-2xl border p-3 text-left transition ${
            selectedRunId === run.id
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-white/5 bg-surface-850/70 hover:border-white/10"
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-emerald-300">{run.id}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                run.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : run.status === "failed"
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {run.status}
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-slate-300">{run.prompt}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {formatDuration(run.duration_ms)}
            </span>
            <span className="inline-flex items-center gap-1">
              <History className="h-3 w-3" />
              {formatWhen(run.ended_at ?? run.started_at)}
            </span>
            <span>{run.stats.skills_loaded} skills</span>
            <span>{run.stats.delegations} delegates</span>
            <span>{run.artifacts.created.length} new files</span>
          </div>
        </button>
      ))}
    </div>
  );
}
