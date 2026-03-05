/**
 * A2A Server Base - Exposes agents from any framework as A2A-compliant servers
 * Implements the Agent-to-Agent (A2A) protocol for discoverability and interoperability
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

// ─── A2A Protocol Types ───────────────────────────────────────────────────────

export interface AgentCard {
  id: string;
  name: string;
  description: string;
  version: string;
  framework: 'adk' | 'langchain' | 'autogen' | 'crewai' | 'custom';
  capabilities: AgentCapability[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  endpoint: string;
  healthEndpoint: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  tags: string[];
}

export interface AgentCapability {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface A2AMessage {
  id: string;
  taskId: string;
  senderId: string;
  receiverId: string;
  type: 'task' | 'result' | 'error' | 'status' | 'stream';
  payload: unknown;
  timestamp: string;
  correlationId?: string;
}

export interface TaskRequest {
  taskId: string;
  input: unknown;
  config?: TaskConfig;
  context?: Record<string, unknown>;
}

export interface TaskConfig {
  timeout?: number;
  maxRetries?: number;
  streaming?: boolean;
  callbackUrl?: string;
}

export interface TaskResult {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

// ─── Task Store ───────────────────────────────────────────────────────────────

class InMemoryTaskStore {
  private tasks = new Map<string, TaskResult>();

  set(taskId: string, result: TaskResult): void {
    this.tasks.set(taskId, result);
  }

  get(taskId: string): TaskResult | undefined {
    return this.tasks.get(taskId);
  }

  update(taskId: string, updates: Partial<TaskResult>): void {
    const existing = this.tasks.get(taskId);
    if (existing) {
      this.tasks.set(taskId, { ...existing, ...updates });
    }
  }

  list(): TaskResult[] {
    return Array.from(this.tasks.values());
  }
}

// ─── A2A Server ───────────────────────────────────────────────────────────────

export abstract class A2AServer extends EventEmitter {
  protected app: Express;
  protected wss?: WebSocketServer;
  protected taskStore: InMemoryTaskStore;
  protected agentCard: AgentCard;
  private activeStreams = new Map<string, WebSocket>();

  constructor(agentCard: Omit<AgentCard, 'createdAt'>) {
    super();
    this.app = express();
    this.taskStore = new InMemoryTaskStore();
    this.agentCard = {
      ...agentCard,
      createdAt: new Date().toISOString(),
    };
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-ID');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[A2A] ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  private setupRoutes(): void {
    // ── Agent Discovery ──────────────────────────────────────────────────────
    this.app.get('/.well-known/agent.json', (_req: Request, res: Response) => {
      res.json(this.agentCard);
    });

    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'healthy', agentId: this.agentCard.id, timestamp: new Date().toISOString() });
    });

    // ── Task Management ──────────────────────────────────────────────────────
    this.app.post('/tasks', async (req: Request, res: Response) => {
      const taskId = uuidv4();
      const taskRequest: TaskRequest = {
        taskId,
        input: req.body.input,
        config: req.body.config,
        context: req.body.context,
      };

      const initialResult: TaskResult = {
        taskId,
        status: 'pending',
        startedAt: new Date().toISOString(),
      };
      this.taskStore.set(taskId, initialResult);

      if (taskRequest.config?.streaming) {
        res.json({ taskId, status: 'pending', streamUrl: `/tasks/${taskId}/stream` });
        this.executeTaskStreaming(taskRequest).catch(console.error);
      } else {
        res.json({ taskId, status: 'pending' });
        this.executeTask(taskRequest).catch(console.error);
      }
    });

    this.app.get('/tasks/:taskId', (req: Request, res: Response) => {
      const result = this.taskStore.get(req.params.taskId);
      if (!result) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json(result);
    });

    this.app.get('/tasks', (_req: Request, res: Response) => {
      res.json({ tasks: this.taskStore.list() });
    });

    this.app.delete('/tasks/:taskId', (req: Request, res: Response) => {
      this.taskStore.update(req.params.taskId, { status: 'cancelled' });
      res.json({ taskId: req.params.taskId, status: 'cancelled' });
    });

    // ── Synchronous Execute ──────────────────────────────────────────────────
    this.app.post('/execute', async (req: Request, res: Response) => {
      const taskId = uuidv4();
      try {
        this.taskStore.set(taskId, { taskId, status: 'running', startedAt: new Date().toISOString() });
        const result = await this.process(req.body.input, req.body.context || {});
        const taskResult: TaskResult = {
          taskId,
          status: 'completed',
          output: result,
          completedAt: new Date().toISOString(),
        };
        this.taskStore.set(taskId, taskResult);
        res.json(taskResult);
      } catch (error) {
        const taskResult: TaskResult = {
          taskId,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date().toISOString(),
        };
        this.taskStore.set(taskId, taskResult);
        res.status(500).json(taskResult);
      }
    });
  }

  private async executeTask(request: TaskRequest): Promise<void> {
    this.taskStore.update(request.taskId, { status: 'running' });
    try {
      const output = await this.process(request.input, request.context || {});
      this.taskStore.update(request.taskId, {
        status: 'completed',
        output,
        completedAt: new Date().toISOString(),
      });
      this.emit('task:completed', { taskId: request.taskId, output });

      if (request.config?.callbackUrl) {
        await this.sendCallback(request.config.callbackUrl, request.taskId, output);
      }
    } catch (error) {
      this.taskStore.update(request.taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
      });
      this.emit('task:failed', { taskId: request.taskId, error });
    }
  }

  private async executeTaskStreaming(request: TaskRequest): Promise<void> {
    this.taskStore.update(request.taskId, { status: 'running' });
    const ws = this.activeStreams.get(request.taskId);

    try {
      const chunks: unknown[] = [];
      for await (const chunk of this.processStream(request.input, request.context || {})) {
        chunks.push(chunk);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'stream', taskId: request.taskId, chunk }));
        }
      }

      this.taskStore.update(request.taskId, {
        status: 'completed',
        output: chunks,
        completedAt: new Date().toISOString(),
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'completed', taskId: request.taskId }));
        ws.close();
      }
    } catch (error) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', taskId: request.taskId, error: String(error) }));
        ws.close();
      }
    }
  }

  private async sendCallback(callbackUrl: string, taskId: string, output: unknown): Promise<void> {
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, output, timestamp: new Date().toISOString() }),
      });
    } catch (error) {
      console.error('[A2A] Callback failed:', error);
    }
  }

  // ── Abstract methods to implement ──────────────────────────────────────────

  /**
   * Core processing logic — implement this in your agent subclass
   */
  abstract process(input: unknown, context: Record<string, unknown>): Promise<unknown>;

  /**
   * Streaming version — override for streaming support
   */
  async *processStream(input: unknown, context: Record<string, unknown>): AsyncGenerator<unknown> {
    const result = await this.process(input, context);
    yield result;
  }

  // ── Server Lifecycle ───────────────────────────────────────────────────────

  listen(port: number): void {
    const server = this.app.listen(port, () => {
      console.log(`[A2A] Agent "${this.agentCard.name}" running on port ${port}`);
      console.log(`[A2A] Discovery: http://localhost:${port}/.well-known/agent.json`);
    });

    // WebSocket server for streaming
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', (ws, req) => {
      const taskId = req.url?.split('/').pop();
      if (taskId) {
        this.activeStreams.set(taskId, ws);
        ws.on('close', () => this.activeStreams.delete(taskId));
      }
    });
  }
}
