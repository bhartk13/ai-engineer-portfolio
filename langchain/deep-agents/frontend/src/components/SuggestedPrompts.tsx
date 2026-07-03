import { Zap } from "lucide-react";
import {
  SKILL_PROMPT_COLORS,
  SUGGESTED_PROMPTS,
} from "../data/suggestedPrompts";

export function SuggestedPrompts({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Sample tasks by skill
        </p>
        <p className="text-[11px] text-slate-600">
          {SUGGESTED_PROMPTS.length} prompts
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SUGGESTED_PROMPTS.map((item) => {
          const badgeClass =
            SKILL_PROMPT_COLORS[item.skill] ??
            "bg-slate-500/15 text-slate-300 border-slate-500/25";

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.prompt)}
              className="group rounded-2xl border border-white/5 bg-surface-850/60 p-4 text-left transition hover:border-emerald-500/30 hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
                >
                  {item.pipeline ? "multi-skill" : item.skill}
                </span>
                <Zap className="h-4 w-4 shrink-0 text-emerald-400/80 transition group-hover:scale-110 group-hover:text-emerald-400" />
              </div>
              <p className="mb-1.5 text-xs font-medium text-slate-200">
                {item.label}
              </p>
              <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
