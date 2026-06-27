import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearWorkspace,
  fetchAgentsMd,
  fetchLatestDeploy,
  fetchRun,
  fetchRuns,
  fetchSkills,
  fetchWorkspaceFile,
  fetchWorkspacePaths,
  streamChat,
} from "./api";
import { ActivityFeed } from "./components/ActivityFeed";
import { ChatPanel } from "./components/ChatPanel";
import { DeployBanner } from "./components/DeployBanner";
import { Header } from "./components/Header";
import { OrchestrationTimeline } from "./components/OrchestrationTimeline";
import { Sidebar } from "./components/Sidebar";
import type {
  ActivityEvent,
  ActivityType,
  ChatMessage,
  RunArtifacts,
  RunSummary,
  Skill,
  StreamEvent,
} from "./types";
import { createId, toDisplayString } from "./utils/format";

function uid() {
  return createId();
}

const RECORDABLE: ActivityType[] = [
  "thought",
  "tool",
  "delegation",
  "skill_load",
  "plan",
  "error",
  "deploy",
];

function activityFromRunRecords(
  records: Array<Record<string, unknown>>
): ActivityEvent[] {
  return records
    .filter((record) => RECORDABLE.includes(record.type as ActivityType))
    .map((record, index) => ({
      id: `history-${index}`,
      type: record.type as ActivityType,
      timestamp: new Date(String(record.timestamp)).getTime(),
      content: record.content as string | undefined,
      name: record.name as string | undefined,
      args: record.args as Record<string, unknown> | undefined,
      subagent: record.subagent as string | undefined,
      description: record.description as string | undefined,
      skill: record.skill as string | undefined,
      todos: record.todos as string[] | undefined,
      message: record.message as string | undefined,
      url: record.url as string | undefined,
      deployStatus: record.status as string | undefined,
    }));
}

export default function App() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agentsMd, setAgentsMd] = useState("");
  const [plan, setPlan] = useState<string[]>([]);
  const [workspacePaths, setWorkspacePaths] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runArtifacts, setRunArtifacts] = useState<RunArtifacts | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [deployUrl, setDeployUrl] = useState("");
  const [deployStatus, setDeployStatus] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const startSidebarResize = (event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onMove = (moveEvent: MouseEvent) => {
      setSidebarWidth(
        Math.min(560, Math.max(260, startWidth + moveEvent.clientX - startX))
      );
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const refreshDeploy = useCallback(async () => {
    const deploy = await fetchLatestDeploy();
    if (deploy.url) {
      setDeployUrl(deploy.url);
      setDeployStatus(deploy.status);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    const paths = await fetchWorkspacePaths();
    setWorkspacePaths(paths);
    if (selectedFile && !paths.includes(selectedFile)) {
      setSelectedFile(null);
      setFileContent("");
    }
    await refreshDeploy();
  }, [selectedFile, refreshDeploy]);

  const refreshRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      setRuns(await fetchRuns());
    } finally {
      setRunsLoading(false);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    const [skillList, memory] = await Promise.all([
      fetchSkills(),
      fetchAgentsMd(),
    ]);
    setSkills(skillList);
    setAgentsMd(memory);
    await Promise.all([refreshWorkspace(), refreshRuns()]);
  }, [refreshWorkspace, refreshRuns]);

  useEffect(() => {
    loadInitial().catch(console.error);
  }, [loadInitial]);

  const pushActivity = (event: StreamEvent) => {
    const base = { id: uid(), timestamp: Date.now() };

    switch (event.type) {
      case "run_start":
        setCurrentRunId(event.run_id);
        setSelectedRunId(event.run_id);
        setRunArtifacts(null);
        if (event.thread_id) setThreadId(event.thread_id);
        break;
      case "run_complete":
        setRunArtifacts(event.artifacts);
        setCurrentRunId(event.run_id);
        refreshRuns().catch(console.error);
        refreshWorkspace().catch(console.error);
        break;
      case "thought":
        setActivity((prev) => [
          ...prev,
          { ...base, type: "thought", content: toDisplayString(event.content) },
        ]);
        break;
      case "tool": {
        setActivity((prev) => [
          ...prev,
          { ...base, type: "tool", name: event.name, args: event.args },
        ]);
        if (
          ["write_file", "edit_file", "deploy_static_site"].includes(event.name)
        ) {
          refreshWorkspace().catch(console.error);
        }
        break;
      }
      case "delegation":
        setActivity((prev) => [
          ...prev,
          {
            ...base,
            type: "delegation",
            subagent: event.subagent,
            description: event.description,
          },
        ]);
        break;
      case "skill_load":
        setActivity((prev) => [
          ...prev,
          { ...base, type: "skill_load", skill: event.skill },
        ]);
        break;
      case "plan":
        setPlan(event.todos);
        setActivity((prev) => [
          ...prev,
          { ...base, type: "plan", todos: event.todos },
        ]);
        break;
      case "deploy":
        if (event.url) {
          setDeployUrl(event.url);
          setDeployStatus(event.status);
        }
        setActivity((prev) => [
          ...prev,
          {
            ...base,
            type: "deploy",
            url: event.url ?? undefined,
            deployStatus: event.status,
            message: event.message,
          },
        ]);
        break;
      case "error":
        setActivity((prev) => [
          ...prev,
          { ...base, type: "error", message: event.message },
        ]);
        break;
      default:
        break;
    }
  };

  const handleSend = async (prompt: string) => {
    if (isRunning) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: prompt },
    ]);
    setActivity([]);
    setRunArtifacts(null);
    setDeployUrl("");
    setDeployStatus("");
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";
    let errorMessage = "";

    try {
      const newThreadId = await streamChat(
        prompt,
        (event) => {
          pushActivity(event);
          if (event.type === "message") {
            assistantContent = toDisplayString(event.content);
          }
          if (event.type === "error") {
            errorMessage = toDisplayString(event.message);
          }
        },
        controller.signal,
        threadId
      );
      if (newThreadId) setThreadId(newThreadId);

      const finalContent = errorMessage
        ? `**Agent error**\n\n${errorMessage}\n\nUpdate \`OPENAI_MODEL\` in \`.env\` (try \`gpt-4o-mini\`) and restart the server.`
        : assistantContent || "Agent finished without a text response.";

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: finalContent,
        },
      ]);
      await refreshWorkspace();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `**Error:** ${(err as Error).message}`,
          },
        ]);
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleSelectFile = async (path: string) => {
    setSelectedFile(path);
    const file = await fetchWorkspaceFile(path);
    setFileContent(file.content);
  };

  const handleClearWorkspace = async () => {
    await clearWorkspace();
    setSelectedFile(null);
    setFileContent("");
    setDeployUrl("");
    setDeployStatus("");
    await refreshWorkspace();
  };

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    setCurrentRunId(runId);
    try {
      const detail = await fetchRun(runId);
      setActivity(activityFromRunRecords(detail.activity));
      setPlan(detail.metadata.plan ?? []);
      setRunArtifacts(detail.metadata.artifacts ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08),_transparent_50%),linear-gradient(180deg,#070b12_0%,#0a101a_100%)]">
      <Header />

      {deployUrl && (
        <div className="mx-auto w-full max-w-[1600px] shrink-0 px-4 lg:px-6">
          <DeployBanner url={deployUrl} status={deployStatus} />
        </div>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <div
          className="relative hidden shrink-0 lg:flex"
          style={{ width: sidebarWidth }}
        >
          <Sidebar
            width={sidebarWidth}
            skills={skills}
            agentsMd={agentsMd}
            plan={plan}
            workspacePaths={workspacePaths}
            selectedFile={selectedFile}
            fileContent={fileContent}
            runs={runs}
            selectedRunId={selectedRunId}
            runsLoading={runsLoading}
            onRefreshWorkspace={refreshWorkspace}
            onSelectFile={handleSelectFile}
            onClearWorkspace={handleClearWorkspace}
            onSelectRun={handleSelectRun}
            onRefreshRuns={refreshRuns}
          />
          <button
            type="button"
            aria-label="Resize sidebar"
            onMouseDown={startSidebarResize}
            className="absolute -right-2 top-0 z-10 h-full w-4 cursor-col-resize touch-none border-0 bg-transparent p-0 after:absolute after:inset-y-8 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-white/10 after:transition-colors hover:after:bg-emerald-400/50"
          />
        </div>
        <div className="flex min-h-0 w-full flex-col lg:hidden">
          <Sidebar
            skills={skills}
            agentsMd={agentsMd}
            plan={plan}
            workspacePaths={workspacePaths}
            selectedFile={selectedFile}
            fileContent={fileContent}
            runs={runs}
            selectedRunId={selectedRunId}
            runsLoading={runsLoading}
            onRefreshWorkspace={refreshWorkspace}
            onSelectFile={handleSelectFile}
            onClearWorkspace={handleClearWorkspace}
            onSelectRun={handleSelectRun}
            onRefreshRuns={refreshRuns}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
          <ChatPanel
            messages={messages}
            isRunning={isRunning}
            onSend={handleSend}
            onStop={handleStop}
          />
          <div className="flex min-h-0 min-w-0 flex-col xl:w-[400px]">
            <OrchestrationTimeline
              events={activity}
              artifacts={runArtifacts}
              isRunning={isRunning}
              currentRunId={currentRunId}
              deployUrl={deployUrl}
              onSelectFile={handleSelectFile}
            />
            <div className="min-h-[280px] flex-1">
              <ActivityFeed events={activity} isRunning={isRunning} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
