/**
 * MCP (Model Context Protocol) Client
 * Connects A2A agents to external data sources and tools
 * Implements the MCP specification for resource and tool access
 */

import { EventEmitter } from 'events';

// ─── MCP Protocol Types ───────────────────────────────────────────────────────

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
}

export interface MCPCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

// ─── MCP Connection ───────────────────────────────────────────────────────────

interface MCPConnection {
  serverUrl: string;
  serverInfo?: MCPServerInfo;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

// ─── MCP Client ───────────────────────────────────────────────────────────────

export class MCPClient extends EventEmitter {
  private connections = new Map<string, MCPConnection>();
  private requestId = 0;

  async connect(serverUrl: string): Promise<MCPServerInfo> {
    console.log(`[MCP] Connecting to server: ${serverUrl}`);

    // Initialize connection
    const initResponse = await this.sendRequest(serverUrl, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: 'a2a-platform-mcp-client',
        version: '1.0.0',
      },
    });

    const serverInfo = initResponse as MCPServerInfo;

    // Send initialized notification
    await this.sendNotification(serverUrl, 'notifications/initialized', {});

    // Load available tools, resources, prompts
    const [tools, resources, prompts] = await Promise.all([
      this.fetchTools(serverUrl),
      this.fetchResources(serverUrl),
      this.fetchPrompts(serverUrl),
    ]);

    this.connections.set(serverUrl, {
      serverUrl,
      serverInfo,
      tools,
      resources,
      prompts,
    });

    console.log(`[MCP] Connected to "${serverInfo.name}" - ${tools.length} tools, ${resources.length} resources`);
    this.emit('connected', { serverUrl, serverInfo });

    return serverInfo;
  }

  async disconnect(serverUrl: string): Promise<void> {
    this.connections.delete(serverUrl);
    this.emit('disconnected', { serverUrl });
  }

  // ── Tool Operations ────────────────────────────────────────────────────────

  async listTools(serverUrl?: string): Promise<MCPTool[]> {
    if (serverUrl) {
      const conn = this.connections.get(serverUrl);
      return conn?.tools || [];
    }
    // All tools from all connections
    const allTools: MCPTool[] = [];
    for (const conn of this.connections.values()) {
      allTools.push(...conn.tools);
    }
    return allTools;
  }

  async callTool(toolName: string, params: Record<string, unknown>, serverUrl?: string): Promise<unknown> {
    const targetServer = serverUrl || this.findServerWithTool(toolName);
    if (!targetServer) {
      throw new Error(`Tool "${toolName}" not found in any connected MCP server`);
    }

    console.log(`[MCP] Calling tool "${toolName}" on ${targetServer}`);

    const result = await this.sendRequest(targetServer, 'tools/call', {
      name: toolName,
      arguments: params,
    });

    this.emit('tool:called', { toolName, params, result });
    return result;
  }

  // ── Resource Operations ────────────────────────────────────────────────────

  async listResources(serverUrl?: string): Promise<MCPResource[]> {
    if (serverUrl) {
      const conn = this.connections.get(serverUrl);
      return conn?.resources || [];
    }
    const allResources: MCPResource[] = [];
    for (const conn of this.connections.values()) {
      allResources.push(...conn.resources);
    }
    return allResources;
  }

  async readResource(uri: string, serverUrl?: string): Promise<MCPResourceContent[]> {
    const targetServer = serverUrl || this.findServerWithResource(uri);
    if (!targetServer) {
      throw new Error(`Resource "${uri}" not found in any connected MCP server`);
    }

    console.log(`[MCP] Reading resource "${uri}" from ${targetServer}`);

    const result = await this.sendRequest(targetServer, 'resources/read', { uri }) as { contents: MCPResourceContent[] };
    return result.contents;
  }

  async subscribeResource(uri: string, serverUrl: string): Promise<void> {
    await this.sendRequest(serverUrl, 'resources/subscribe', { uri });
    console.log(`[MCP] Subscribed to resource "${uri}"`);
  }

  // ── Prompt Operations ──────────────────────────────────────────────────────

  async listPrompts(serverUrl?: string): Promise<MCPPrompt[]> {
    if (serverUrl) {
      const conn = this.connections.get(serverUrl);
      return conn?.prompts || [];
    }
    const allPrompts: MCPPrompt[] = [];
    for (const conn of this.connections.values()) {
      allPrompts.push(...conn.prompts);
    }
    return allPrompts;
  }

  async getPrompt(name: string, args: Record<string, string>, serverUrl?: string): Promise<{
    description?: string;
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  }> {
    const targetServer = serverUrl || this.findServerWithPrompt(name);
    if (!targetServer) {
      throw new Error(`Prompt "${name}" not found in any connected MCP server`);
    }

    return this.sendRequest(targetServer, 'prompts/get', { name, arguments: args }) as Promise<{
      description?: string;
      messages: Array<{ role: string; content: { type: string; text: string } }>;
    }>;
  }

  // ── Connection Info ────────────────────────────────────────────────────────

  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  isConnected(serverUrl: string): boolean {
    return this.connections.has(serverUrl);
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private async fetchTools(serverUrl: string): Promise<MCPTool[]> {
    try {
      const result = await this.sendRequest(serverUrl, 'tools/list', {}) as { tools: MCPTool[] };
      return result.tools || [];
    } catch {
      return [];
    }
  }

  private async fetchResources(serverUrl: string): Promise<MCPResource[]> {
    try {
      const result = await this.sendRequest(serverUrl, 'resources/list', {}) as { resources: MCPResource[] };
      return result.resources || [];
    } catch {
      return [];
    }
  }

  private async fetchPrompts(serverUrl: string): Promise<MCPPrompt[]> {
    try {
      const result = await this.sendRequest(serverUrl, 'prompts/list', {}) as { prompts: MCPPrompt[] };
      return result.prompts || [];
    } catch {
      return [];
    }
  }

  private findServerWithTool(toolName: string): string | undefined {
    for (const conn of this.connections.values()) {
      if (conn.tools.some(t => t.name === toolName)) {
        return conn.serverUrl;
      }
    }
  }

  private findServerWithResource(uri: string): string | undefined {
    for (const conn of this.connections.values()) {
      if (conn.resources.some(r => r.uri === uri)) {
        return conn.serverUrl;
      }
    }
  }

  private findServerWithPrompt(name: string): string | undefined {
    for (const conn of this.connections.values()) {
      if (conn.prompts.some(p => p.name === name)) {
        return conn.serverUrl;
      }
    }
  }

  private async sendRequest(serverUrl: string, method: string, params: unknown): Promise<unknown> {
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const response = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status}`);
    }

    const result = await response.json() as { result?: unknown; error?: { message: string } };
    if (result.error) {
      throw new Error(`MCP error: ${result.error.message}`);
    }

    return result.result;
  }

  private async sendNotification(serverUrl: string, method: string, params: unknown): Promise<void> {
    await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    });
  }
}

// ─── MCP Server (for exposing data sources) ───────────────────────────────────

export class MCPServer {
  private tools = new Map<string, {
    definition: MCPTool;
    handler: (params: Record<string, unknown>) => Promise<unknown>;
  }>();

  private resources = new Map<string, {
    definition: MCPResource;
    handler: () => Promise<MCPResourceContent>;
  }>();

  registerTool(
    definition: MCPTool,
    handler: (params: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.tools.set(definition.name, { definition, handler });
  }

  registerResource(
    definition: MCPResource,
    handler: () => Promise<MCPResourceContent>
  ): void {
    this.resources.set(definition.uri, { definition, handler });
  }

  getRouter() {
    // Returns an Express router for mounting
    const { Router } = require('express');
    const router = Router();

    router.post('/mcp', async (req: import('express').Request, res: import('express').Response) => {
      const { method, params, id } = req.body;

      try {
        let result: unknown;

        switch (method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {}, resources: {} },
              serverInfo: { name: 'a2a-mcp-server', version: '1.0.0' },
            };
            break;

          case 'tools/list':
            result = { tools: Array.from(this.tools.values()).map(t => t.definition) };
            break;

          case 'tools/call': {
            const tool = this.tools.get(params.name);
            if (!tool) throw new Error(`Tool "${params.name}" not found`);
            const output = await tool.handler(params.arguments || {});
            result = {
              content: [{ type: 'text', text: JSON.stringify(output) }],
            };
            break;
          }

          case 'resources/list':
            result = { resources: Array.from(this.resources.values()).map(r => r.definition) };
            break;

          case 'resources/read': {
            const resource = this.resources.get(params.uri);
            if (!resource) throw new Error(`Resource "${params.uri}" not found`);
            const content = await resource.handler();
            result = { contents: [content] };
            break;
          }

          case 'prompts/list':
            result = { prompts: [] };
            break;

          case 'notifications/initialized':
            res.json({ jsonrpc: '2.0' });
            return;

          default:
            throw new Error(`Unknown method: ${method}`);
        }

        if (id !== undefined) {
          res.json({ jsonrpc: '2.0', id, result });
        } else {
          res.json({ jsonrpc: '2.0' });
        }
      } catch (error) {
        res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
        });
      }
    });

    return router;
  }
}
