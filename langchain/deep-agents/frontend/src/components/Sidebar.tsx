import {
  BookMarked,
  CheckCircle2,
  Circle,
  Download,
  FileCode2,
  FolderOpen,
  History,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { RunSummary, Skill } from "../types";
import { RunHistoryPanel } from "./RunHistoryPanel";

type SidebarTab = "skills" | "memory" | "workspace" | "plan" | "runs";

export function Sidebar({
  skills,
  agentsMd,
  plan,
  workspacePaths,
  selectedFile,
  fileContent,
  runs,
  selectedRunId,
  runsLoading,
  onRefreshWorkspace,
  onSelectFile,
  onClearWorkspace,
  onSelectRun,
  onRefreshRuns,
}: {
  skills: Skill[];
  agentsMd: string;
  plan: string[];
  workspacePaths: string[];
  selectedFile: string | null;
  fileContent: string;
  runs: RunSummary[];
  selectedRunId: string | null;
  runsLoading: boolean;
  onRefreshWorkspace: () => void;
  onSelectFile: (path: string) => void;
  onClearWorkspace: () => void;
  onSelectRun: (runId: string) => void;
  onRefreshRuns: () => void;
}) {
  const [tab, setTab] = useState<SidebarTab>("skills");

  const tabs = [
    { id: "skills" as const, label: "Skills", icon: Sparkles },
    { id: "plan" as const, label: "Plan", icon: CheckCircle2 },
    { id: "workspace" as const, label: "Files", icon: FolderOpen },
    { id: "runs" as const, label: "Runs", icon: History },
    { id: "memory" as const, label: "Memory", icon: BookMarked },
  ];

  return (
    <aside className="flex min-h-0 w-full flex-col rounded-3xl border border-white/5 bg-surface-900/70 shadow-2xl shadow-black/20 lg:w-[340px]">
      <div className="grid grid-cols-5 gap-1 border-b border-white/5 p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-medium transition ${
              tab === id
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "skills" && (
          <div className="space-y-3">
            {skills.map((skill) => (
              <div
                key={skill.folder}
                className="rounded-2xl border border-white/5 bg-surface-850/70 p-4 transition hover:border-emerald-500/20"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-500/15 px-2 py-1 font-mono text-xs text-emerald-300">
                    {skill.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-2">
            {plan.length === 0 ? (
              <EmptyState text="No active plan yet. The orchestrator will create todos for complex tasks." />
            ) : (
              plan.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border border-white/5 bg-surface-850/70 p-3"
                >
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-slate-300">{item}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "runs" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onRefreshRuns}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface-850 px-3 py-2 text-xs text-slate-300 transition hover:bg-surface-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh history
            </button>
            <RunHistoryPanel
              runs={runs}
              selectedRunId={selectedRunId}
              loading={runsLoading}
              onSelectRun={onSelectRun}
            />
          </div>
        )}

        {tab === "workspace" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRefreshWorkspace}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface-850 px-3 py-2 text-xs text-slate-300 transition hover:bg-surface-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <button
                type="button"
                onClick={onClearWorkspace}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>

            {workspacePaths.length === 0 ? (
              <EmptyState text="No artifacts yet. Agents write research, drafts, and reviews here." />
            ) : (
              <>
                <div className="space-y-1">
                  {workspacePaths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => onSelectFile(path)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        selectedFile === path
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <FileCode2 className="h-4 w-4 shrink-0" />
                      <span className="truncate font-mono text-xs">{path}</span>
                    </button>
                  ))}
                </div>

                {selectedFile && fileContent && (
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="truncate font-mono text-xs text-emerald-300">
                        {selectedFile}
                      </span>
                      <a
                        href={`data:text/markdown;charset=utf-8,${encodeURIComponent(fileContent)}`}
                        download={selectedFile.split("/").pop()}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
                      >
                        <Download className="h-3 w-3" />
                        Save
                      </a>
                    </div>
                    <div className="prose-chat max-h-64 overflow-y-auto text-xs text-slate-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {fileContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "memory" && (
          <div className="rounded-2xl border border-white/5 bg-surface-850/70 p-4">
            <div className="prose-chat text-xs text-slate-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {agentsMd || "_No AGENTS.md loaded._"}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-surface-850/30 p-6 text-center text-xs leading-relaxed text-slate-500">
      {text}
    </div>
  );
}
