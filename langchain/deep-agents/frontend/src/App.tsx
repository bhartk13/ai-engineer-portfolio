import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearWorkspace,
  fetchAgentsMd,
  fetchRun,
  fetchRuns,
  fetchSkills,
  fetchWorkspaceFile,
  fetchWorkspacePaths,
  streamChat,
} from "./api";
import { ActivityFeed } from "./components/ActivityFeed";
import { ChatPanel } from "./components/ChatPanel";
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
  const abortRef = useRef<AbortController | null>(null);

  const refreshWorkspace = useCallback(async () => {
    const paths = await fetchWorkspacePaths();
    setWorkspacePaths(paths);
    if (selectedFile && !paths.includes(selectedFile)) {
      setSelectedFile(null);
      setFileContent("");
    }
  }, [selectedFile]);

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
        break;
      case "run_complete":
        setRunArtifacts(event.artifacts);
        setCurrentRunId(event.run_id);
        refreshRuns().catch(console.error);
        break;
      case "thought":
        setActivity((prev) => [
          ...prev,
          { ...base, type: "thought", content: toDisplayString(event.content) },
        ]);
        break;
      case "tool":
        setActivity((prev) => [
          ...prev,
          { ...base, type: "tool", name: event.name, args: event.args },
        ]);
        break;
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
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";
    let errorMessage = "";

    try {
      await streamChat(
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
        controller.signal
      );

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

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
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
