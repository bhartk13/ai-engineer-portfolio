import type { DeployInfo, RunDetail, RunSummary, Skill, StreamEvent, WorkspaceFile } from "./types";

const API = "/api";

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch(`${API}/skills`);
  const data = await res.json();
  return data.skills ?? [];
}

export async function fetchAgentsMd(): Promise<string> {
  const res = await fetch(`${API}/agents-md`);
  const data = await res.json();
  return data.content ?? "";
}

export async function fetchWorkspacePaths(): Promise<string[]> {
  const res = await fetch(`${API}/workspace`);
  const data = await res.json();
  return data.files ?? [];
}

export async function fetchWorkspaceFile(path: string): Promise<WorkspaceFile> {
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const res = await fetch(`${API}/workspace/${encoded}`);
  if (!res.ok) throw new Error("File not found");
  return res.json();
}

export async function clearWorkspace(): Promise<void> {
  await fetch(`${API}/workspace`, { method: "DELETE" });
}

export async function fetchLatestDeploy(): Promise<DeployInfo> {
  const res = await fetch(`${API}/deploy/latest`);
  const data = await res.json();
  return {
    url: data.url ?? "",
    status: data.status ?? "none",
    report_path: data.report_path ?? "",
  };
}

export async function fetchRuns(limit = 20): Promise<RunSummary[]> {
  const res = await fetch(`${API}/runs?limit=${limit}`);
  const data = await res.json();
  return data.runs ?? [];
}

export async function fetchRun(runId: string): Promise<RunDetail> {
  const res = await fetch(`${API}/runs/${runId}`);
  if (!res.ok) throw new Error("Run not found");
  return res.json();
}

export async function streamChat(
  prompt: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
  threadId?: string | null
): Promise<string> {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, thread_id: threadId ?? undefined }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  let resolvedThreadId = threadId ?? null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as StreamEvent;
        if (event.type === "run_start" && event.thread_id) {
          resolvedThreadId = event.thread_id;
        }
        onEvent(event);
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return resolvedThreadId ?? "";
}
