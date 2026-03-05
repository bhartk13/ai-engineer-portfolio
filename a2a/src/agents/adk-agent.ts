/**
 * ADK (Agent Development Kit) Agent Implementation
 * Supports sequential chaining where one agent's output feeds into the next
 */

import { A2AServer, AgentCard, TaskResult } from './a2a-server';
import { MCPClient } from '../mcp/mcp-client';

// ─── ADK Tool Types ───────────────────────────────────────────────────────────

export interface ADKTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  execute: (params: Record<string, unknown>, context: ADKContext) => Promise<unknown>;
}

export interface ADKContext {
  sessionId: string;
  agentId: string;
  memory: Record<string, unknown>;
  mcpClient?: MCPClient;
  metadata: Record<string, unknown>;
}

export interface ADKAgentConfig {
  systemPrompt: string;
  tools?: ADKTool[];
  maxIterations?: number;
  temperature?: number;
  model?: string;
  mcpServers?: string[];
}

// ─── ADK Agent Base ───────────────────────────────────────────────────────────

export class ADKAgent extends A2AServer {
  protected config: ADKAgentConfig;
  protected tools: Map<string, ADKTool>;
  protected mcpClient?: MCPClient;

  constructor(agentCard: Omit<AgentCard, 'createdAt'>, config: ADKAgentConfig) {
    super(agentCard);
    this.config = {
      maxIterations: 10,
      temperature: 0.7,
      model: 'claude-sonnet-4-20250514',
      ...config,
    };
    this.tools = new Map();
    config.tools?.forEach(tool => this.tools.set(tool.name, tool));
  }

  async initialize(): Promise<void> {
    if (this.config.mcpServers?.length) {
      this.mcpClient = new MCPClient();
      for (const serverUrl of this.config.mcpServers) {
        await this.mcpClient.connect(serverUrl);
        console.log(`[ADK] Connected to MCP server: ${serverUrl}`);
      }
      // Register MCP tools as ADK tools
      const mcpTools = await this.mcpClient.listTools();
      for (const tool of mcpTools) {
        this.registerTool({
          name: `mcp_${tool.name}`,
          description: tool.description,
          parameters: tool.inputSchema as ADKTool['parameters'],
          execute: async (params) => {
            return this.mcpClient!.callTool(tool.name, params);
          },
        });
      }
    }
  }

  registerTool(tool: ADKTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[ADK] Registered tool: ${tool.name}`);
  }

  async process(input: unknown, context: Record<string, unknown>): Promise<unknown> {
    const adkContext: ADKContext = {
      sessionId: context.sessionId as string || `session_${Date.now()}`,
      agentId: this.agentCard.id,
      memory: context.memory as Record<string, unknown> || {},
      mcpClient: this.mcpClient,
      metadata: context,
    };

    const messages: Array<{ role: string; content: string | Array<{type: string; [key: string]: unknown}> }> = [
      {
        role: 'user',
        content: typeof input === 'string' ? input : JSON.stringify(input),
      },
    ];

    // Agentic loop
    for (let iteration = 0; iteration < (this.config.maxIterations || 10); iteration++) {
      const toolDefinitions = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 4096,
          system: this.config.systemPrompt,
          messages,
          tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
      }

      const result = await response.json() as {
        stop_reason: string;
        content: Array<{ type: string; text?: string; name?: string; id?: string; input?: Record<string, unknown> }>;
      };

      messages.push({ role: 'assistant', content: result.content });

      // If no tool calls, we're done
      if (result.stop_reason === 'end_turn') {
        const textBlock = result.content.find(b => b.type === 'text');
        return {
          text: textBlock?.text || '',
          iterations: iteration + 1,
          toolsUsed: this.extractToolNames(messages),
        };
      }

      // Process tool calls
      if (result.stop_reason === 'tool_use') {
        const toolResults: Array<{type: string; tool_use_id: string; content: string}> = [];

        for (const block of result.content) {
          if (block.type === 'tool_use') {
            const tool = this.tools.get(block.name!);
            if (!tool) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id!,
                content: `Error: Tool "${block.name}" not found`,
              });
              continue;
            }

            try {
              const toolOutput = await tool.execute(block.input as Record<string, unknown>, adkContext);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id!,
                content: JSON.stringify(toolOutput),
              });
              console.log(`[ADK] Tool "${block.name}" executed successfully`);
            } catch (error) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id!,
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              });
            }
          }
        }

        messages.push({ role: 'user', content: toolResults });
      }
    }

    throw new Error('Max iterations reached');
  }

  private extractToolNames(messages: Array<{ role: string; content: unknown }>): string[] {
    const tools = new Set<string>();
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (typeof block === 'object' && block !== null && 'type' in block && (block as {type: string}).type === 'tool_use') {
            tools.add((block as {name: string}).name);
          }
        }
      }
    }
    return Array.from(tools);
  }
}

// ─── Sequential Agent Chain ───────────────────────────────────────────────────

export interface ChainStep {
  agentId: string;
  agentUrl: string;
  name: string;
  inputTransform?: (output: unknown, context: Record<string, unknown>) => unknown;
  outputTransform?: (output: unknown, context: Record<string, unknown>) => unknown;
  condition?: (output: unknown, context: Record<string, unknown>) => boolean;
  retryConfig?: { maxRetries: number; backoffMs: number };
}

export interface ChainResult {
  chainId: string;
  steps: ChainStepResult[];
  finalOutput: unknown;
  totalDuration: number;
  status: 'completed' | 'failed' | 'partial';
}

export interface ChainStepResult {
  stepName: string;
  agentId: string;
  input: unknown;
  output: unknown;
  duration: number;
  status: 'completed' | 'failed' | 'skipped';
  error?: string;
}

export class AgentChain {
  private steps: ChainStep[];
  private chainId: string;

  constructor(steps: ChainStep[]) {
    this.steps = steps;
    this.chainId = `chain_${Date.now()}`;
  }

  async execute(
    initialInput: unknown,
    context: Record<string, unknown> = {}
  ): Promise<ChainResult> {
    const startTime = Date.now();
    const stepResults: ChainStepResult[] = [];
    let currentOutput: unknown = initialInput;
    const chainContext = { ...context, chainId: this.chainId };

    console.log(`[Chain] Starting chain ${this.chainId} with ${this.steps.length} steps`);

    for (const step of this.steps) {
      const stepStart = Date.now();

      // Check condition
      if (step.condition && !step.condition(currentOutput, chainContext)) {
        stepResults.push({
          stepName: step.name,
          agentId: step.agentId,
          input: currentOutput,
          output: currentOutput,
          duration: 0,
          status: 'skipped',
        });
        console.log(`[Chain] Step "${step.name}" skipped (condition false)`);
        continue;
      }

      // Apply input transform
      const stepInput = step.inputTransform
        ? step.inputTransform(currentOutput, chainContext)
        : currentOutput;

      let stepOutput: unknown;
      let retries = 0;
      const maxRetries = step.retryConfig?.maxRetries || 0;

      while (retries <= maxRetries) {
        try {
          console.log(`[Chain] Executing step "${step.name}" on agent ${step.agentId}`);
          stepOutput = await this.callAgent(step.agentUrl, stepInput, chainContext);
          break;
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            const duration = Date.now() - stepStart;
            stepResults.push({
              stepName: step.name,
              agentId: step.agentId,
              input: stepInput,
              output: null,
              duration,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            });

            return {
              chainId: this.chainId,
              steps: stepResults,
              finalOutput: null,
              totalDuration: Date.now() - startTime,
              status: 'failed',
            };
          }
          console.log(`[Chain] Step "${step.name}" retry ${retries}/${maxRetries}`);
          await new Promise(r => setTimeout(r, step.retryConfig?.backoffMs || 1000 * retries));
        }
      }

      // Apply output transform
      currentOutput = step.outputTransform
        ? step.outputTransform(stepOutput, chainContext)
        : stepOutput;

      stepResults.push({
        stepName: step.name,
        agentId: step.agentId,
        input: stepInput,
        output: currentOutput,
        duration: Date.now() - stepStart,
        status: 'completed',
      });

      console.log(`[Chain] Step "${step.name}" completed in ${Date.now() - stepStart}ms`);
    }

    return {
      chainId: this.chainId,
      steps: stepResults,
      finalOutput: currentOutput,
      totalDuration: Date.now() - startTime,
      status: 'completed',
    };
  }

  private async callAgent(
    agentUrl: string,
    input: unknown,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const response = await fetch(`${agentUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, context }),
    });

    if (!response.ok) {
      throw new Error(`Agent at ${agentUrl} returned ${response.status}`);
    }

    const result = await response.json() as TaskResult;
    if (result.status === 'failed') {
      throw new Error(result.error || 'Agent execution failed');
    }

    return result.output;
  }

  // ── Async polling version for long-running tasks ──────────────────────────
  private async callAgentAsync(
    agentUrl: string,
    input: unknown,
    context: Record<string, unknown>,
    pollIntervalMs = 1000,
    timeoutMs = 300000
  ): Promise<unknown> {
    // Submit task
    const submitResponse = await fetch(`${agentUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, context }),
    });

    if (!submitResponse.ok) {
      throw new Error(`Failed to submit task to ${agentUrl}`);
    }

    const { taskId } = await submitResponse.json() as { taskId: string };
    const deadline = Date.now() + timeoutMs;

    // Poll for result
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, pollIntervalMs));

      const statusResponse = await fetch(`${agentUrl}/tasks/${taskId}`);
      const status = await statusResponse.json() as TaskResult;

      if (status.status === 'completed') return status.output;
      if (status.status === 'failed') throw new Error(status.error || 'Task failed');
    }

    throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
  }
}

// ─── Parallel Agent Execution ─────────────────────────────────────────────────

export class ParallelAgentGroup {
  constructor(private agents: Array<{ url: string; name: string; weight?: number }>) {}

  async execute(input: unknown, context: Record<string, unknown> = {}): Promise<{
    results: Array<{ agentName: string; output: unknown; duration: number }>;
    merged: unknown;
  }> {
    const results = await Promise.allSettled(
      this.agents.map(async agent => {
        const start = Date.now();
        const response = await fetch(`${agent.url}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, context }),
        });
        const result = await response.json() as TaskResult;
        return { agentName: agent.name, output: result.output, duration: Date.now() - start };
      })
    );

    const successResults = results
      .filter((r): r is PromiseFulfilledResult<{ agentName: string; output: unknown; duration: number }> => r.status === 'fulfilled')
      .map(r => r.value);

    return {
      results: successResults,
      merged: successResults.map(r => r.output),
    };
  }
}
