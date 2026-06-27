export interface Skill {
  name: string;
  description: string;
  folder: string;
  license?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ActivityType =
  | "thought"
  | "tool"
  | "delegation"
  | "skill_load"
  | "plan"
  | "error";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: number;
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
  subagent?: string;
  description?: string;
  skill?: string;
  todos?: string[];
  message?: string;
}

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface RunArtifacts {
  created: string[];
  modified: string[];
}

export interface RunStats {
  skills_loaded: number;
  delegations: number;
  tool_calls: number;
  errors: number;
}

export interface RunSummary {
  id: string;
  prompt: string;
  started_at: string;
  ended_at: string | null;
  status: "running" | "completed" | "failed";
  duration_ms: number | null;
  plan: string[];
  stats: RunStats;
  artifacts: RunArtifacts;
}

export interface RunDetail {
  metadata: RunSummary;
  activity: Array<Record<string, unknown>>;
  response: string;
}

export type StreamEvent =
  | { type: "run_start"; run_id: string; prompt: string }
  | { type: "run_complete"; run_id: string; status: string; duration_ms: number; artifacts: RunArtifacts; stats: RunStats }
  | { type: "thought"; content: string }
  | { type: "tool"; name: string; args: Record<string, unknown> }
  | { type: "delegation"; subagent: string; description: string }
  | { type: "skill_load"; skill: string }
  | { type: "plan"; todos: string[] }
  | { type: "message"; content: string }
  | { type: "error"; message: string; trace?: string }
  | { type: "done" };

export interface TimelineStep {
  id: string;
  kind: "plan" | "skill" | "delegate" | "tool" | "thought" | "error";
  label: string;
  detail?: string;
  timestamp: number;
}
