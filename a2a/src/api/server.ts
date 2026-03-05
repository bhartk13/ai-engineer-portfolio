/**
 * A2A Platform API - Main orchestration server
 * Registry, chain orchestration, monitoring, and management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AgentCard } from '../agents/a2a-server';
import { AgentChain, ChainStep, ChainResult } from '../agents/adk-agent';
import { MCPClient } from '../mcp/mcp-client';
import { IBMAgentStack, AgentDeploymentSpec, DeploymentResult } from '../deployment/ibm-agent-stack';

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

// ─── In-Memory State ──────────────────────────────────────────────────────────

const agentRegistry = new Map<string, AgentCard & { endpoint: string; lastSeen?: string; health?: 'healthy' | 'unhealthy' | 'unknown' }>();
const chainHistory = new Map<string, ChainResult>();
const deploymentRegistry = new Map<string, DeploymentResult>();
const mcpConnections = new Map<string, { url: string; connectedAt: string; tools: number }>();

const mcpClient = new MCPClient();
const ibmStack = new IBMAgentStack({
  registry: { server: process.env.REGISTRY_SERVER || 'us.icr.io', namespace: process.env.REGISTRY_NAMESPACE || 'a2a-platform' },
  ibmCloud: process.env.IBM_API_KEY ? {
    apiKey: process.env.IBM_API_KEY,
    region: process.env.IBM_REGION || 'us-south',
    resourceGroup: process.env.IBM_RESOURCE_GROUP || 'default',
  } : undefined,
});

// ─── Agent Registry ───────────────────────────────────────────────────────────

app.post('/api/agents/register', async (req, res) => {
  try {
    const { endpoint, agentCard } = req.body as { endpoint: string; agentCard: AgentCard };

    // Fetch agent card from endpoint if not provided
    let card = agentCard;
    if (!card && endpoint) {
      const response = await fetch(`${endpoint}/.well-known/agent.json`);
      if (!response.ok) throw new Error('Failed to fetch agent card');
      card = await response.json() as AgentCard;
    }

    agentRegistry.set(card.id, { ...card, endpoint, lastSeen: new Date().toISOString(), health: 'unknown' });
    console.log(`[Registry] Registered agent: ${card.name} (${card.id})`);

    res.json({ success: true, agentId: card.id, agent: agentRegistry.get(card.id) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/agents', (_req, res) => {
  res.json({ agents: Array.from(agentRegistry.values()), count: agentRegistry.size });
});

app.get('/api/agents/:agentId', (req, res) => {
  const agent = agentRegistry.get(req.params.agentId);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
  res.json(agent);
});

app.delete('/api/agents/:agentId', (req, res) => {
  agentRegistry.delete(req.params.agentId);
  res.json({ success: true });
});

// Health check all registered agents
app.post('/api/agents/health-check', async (_req, res) => {
  const results: Record<string, string> = {};

  await Promise.allSettled(
    Array.from(agentRegistry.entries()).map(async ([id, agent]) => {
      try {
        const response = await fetch(`${agent.endpoint}/health`, { signal: AbortSignal.timeout(5000) });
        const health = response.ok ? 'healthy' : 'unhealthy';
        agentRegistry.set(id, { ...agent, health, lastSeen: new Date().toISOString() });
        results[id] = health;
      } catch {
        agentRegistry.set(id, { ...agent, health: 'unhealthy' });
        results[id] = 'unhealthy';
      }
    })
  );

  res.json({ results, checkedAt: new Date().toISOString() });
});

// ─── Agent Chain Orchestration ────────────────────────────────────────────────

app.post('/api/chains/execute', async (req, res) => {
  try {
    const { steps, input, context } = req.body as {
      steps: Array<{
        agentId: string;
        name?: string;
        inputTransform?: string;   // JS expression as string
        outputTransform?: string;
        condition?: string;
        retryConfig?: { maxRetries: number; backoffMs: number };
      }>;
      input: unknown;
      context?: Record<string, unknown>;
    };

    // Resolve agent endpoints
    const chainSteps: ChainStep[] = steps.map(step => {
      const agent = agentRegistry.get(step.agentId);
      if (!agent) throw new Error(`Agent "${step.agentId}" not found in registry`);

      return {
        agentId: step.agentId,
        agentUrl: agent.endpoint,
        name: step.name || agent.name,
        retryConfig: step.retryConfig,
        inputTransform: step.inputTransform
          ? (output: unknown, ctx: Record<string, unknown>) =>
              // eslint-disable-next-line no-new-func
              new Function('output', 'context', `return ${step.inputTransform}`)(output, ctx)
          : undefined,
        outputTransform: step.outputTransform
          ? (output: unknown, ctx: Record<string, unknown>) =>
              // eslint-disable-next-line no-new-func
              new Function('output', 'context', `return ${step.outputTransform}`)(output, ctx)
          : undefined,
        condition: step.condition
          ? (output: unknown, ctx: Record<string, unknown>) =>
              // eslint-disable-next-line no-new-func
              new Function('output', 'context', `return ${step.condition}`)(output, ctx)
          : undefined,
      };
    });

    const chain = new AgentChain(chainSteps);
    const result = await chain.execute(input, context || {});

    chainHistory.set(result.chainId, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/chains', (_req, res) => {
  res.json({ chains: Array.from(chainHistory.values()), count: chainHistory.size });
});

app.get('/api/chains/:chainId', (req, res) => {
  const chain = chainHistory.get(req.params.chainId);
  if (!chain) { res.status(404).json({ error: 'Chain not found' }); return; }
  res.json(chain);
});

// Validate a chain without executing
app.post('/api/chains/validate', (req, res) => {
  const { steps } = req.body as { steps: Array<{ agentId: string }> };
  const issues: string[] = [];

  for (const step of steps) {
    if (!agentRegistry.has(step.agentId)) {
      issues.push(`Agent "${step.agentId}" not found in registry`);
    }
  }

  res.json({ valid: issues.length === 0, issues });
});

// ─── MCP Management ───────────────────────────────────────────────────────────

app.post('/api/mcp/connect', async (req, res) => {
  try {
    const { serverUrl } = req.body as { serverUrl: string };
    const serverInfo = await mcpClient.connect(serverUrl);
    const tools = await mcpClient.listTools(serverUrl);

    mcpConnections.set(serverUrl, {
      url: serverUrl,
      connectedAt: new Date().toISOString(),
      tools: tools.length,
    });

    res.json({ success: true, serverInfo, toolCount: tools.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/mcp/connections', (_req, res) => {
  res.json({ connections: Array.from(mcpConnections.values()) });
});

app.get('/api/mcp/tools', async (_req, res) => {
  const tools = await mcpClient.listTools();
  res.json({ tools, count: tools.length });
});

app.get('/api/mcp/resources', async (_req, res) => {
  const resources = await mcpClient.listResources();
  res.json({ resources, count: resources.length });
});

app.post('/api/mcp/tools/call', async (req, res) => {
  try {
    const { toolName, params, serverUrl } = req.body as { toolName: string; params: Record<string, unknown>; serverUrl?: string };
    const result = await mcpClient.callTool(toolName, params, serverUrl);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/mcp/resources/read', async (req, res) => {
  try {
    const { uri, serverUrl } = req.body as { uri: string; serverUrl?: string };
    const contents = await mcpClient.readResource(uri, serverUrl);
    res.json({ contents });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ─── IBM Agent Stack Deployment ───────────────────────────────────────────────

app.post('/api/deployments/code-engine', async (req, res) => {
  try {
    const spec = req.body as AgentDeploymentSpec;
    const result = await ibmStack.deployToCodeEngine(spec);
    deploymentRegistry.set(result.deploymentId, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/deployments/openshift', async (req, res) => {
  try {
    const spec = req.body as AgentDeploymentSpec;
    const result = await ibmStack.deployToOpenShift(spec);
    deploymentRegistry.set(result.deploymentId, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/deployments/manifests', (req, res) => {
  try {
    const spec = req.body as AgentDeploymentSpec;
    const manifests = ibmStack.generateKubernetesManifests(spec);
    res.json({ manifests });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/deployments', (_req, res) => {
  const allDeployments = [
    ...Array.from(deploymentRegistry.values()),
    ...ibmStack.listDeployments(),
  ];
  res.json({ deployments: allDeployments, count: allDeployments.length });
});

app.get('/api/deployments/:deploymentId', (req, res) => {
  const d = deploymentRegistry.get(req.params.deploymentId) || ibmStack.getDeployment(req.params.deploymentId);
  if (!d) { res.status(404).json({ error: 'Deployment not found' }); return; }
  res.json(d);
});

// ─── Platform Health & Metrics ────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      registeredAgents: agentRegistry.size,
      chainExecutions: chainHistory.size,
      mcpConnections: mcpConnections.size,
      deployments: deploymentRegistry.size,
    },
  });
});

app.get('/api/metrics', (_req, res) => {
  const agents = Array.from(agentRegistry.values());
  const chains = Array.from(chainHistory.values());

  res.json({
    agents: {
      total: agents.length,
      healthy: agents.filter(a => a.health === 'healthy').length,
      unhealthy: agents.filter(a => a.health === 'unhealthy').length,
      byFramework: agents.reduce((acc, a) => {
        acc[a.framework] = (acc[a.framework] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
    chains: {
      total: chains.length,
      completed: chains.filter(c => c.status === 'completed').length,
      failed: chains.filter(c => c.status === 'failed').length,
      avgDuration: chains.reduce((sum, c) => sum + c.totalDuration, 0) / (chains.length || 1),
    },
    mcp: {
      connections: mcpConnections.size,
      totalTools: Array.from(mcpConnections.values()).reduce((sum, c) => sum + c.tools, 0),
    },
    deployments: {
      total: deploymentRegistry.size,
      running: Array.from(deploymentRegistry.values()).filter(d => d.status === 'running').length,
    },
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[A2A Platform] API Server running on port ${PORT}`);
  console.log(`[A2A Platform] Health: http://localhost:${PORT}/health`);
  console.log(`[A2A Platform] Metrics: http://localhost:${PORT}/api/metrics`);
});

export default app;
