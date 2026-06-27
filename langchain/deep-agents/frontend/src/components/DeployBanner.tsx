import { ExternalLink, Globe } from "lucide-react";

export function DeployBanner({
  url,
  status,
  compact = false,
}: {
  url: string;
  status?: string;
  compact?: boolean;
}) {
  if (!url) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
        <Globe className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          {status === "live" || status === "deployed" ? "Live site" : "Deploy URL"}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block break-all font-mono text-xs text-emerald-100 underline decoration-emerald-400/40 underline-offset-2 hover:text-white"
        >
          {url}
        </a>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-[11px] font-medium text-emerald-100 transition hover:bg-emerald-500/30"
      >
        Open
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
