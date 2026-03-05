# A2A Agent Platform

Production-ready multi-agent platform implementing the Agent-to-Agent (A2A) protocol with ADK sequential chaining, MCP data integration, and IBM Agent Stack deployment.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    A2A Platform                              │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Research │───▶│ Analysis │───▶│  Report  │  ADK Chain   │
│  │  Agent   │    │  Agent   │    │  Agent   │              │
│  │ (A2A+ADK)│    │ (A2A+ADK)│    │ (A2A+ADK)│              │
│  └────┬─────┘    └────┬─────┘    └──────────┘              │
│       │               │                                     │
│       └───────────────┤                                     │
│                       │ MCP                                 │
│              ┌────────▼────────┐                            │
│              │   MCP Server    │                            │
│              │  ┌───────────┐  │                            │
│              │  │  Database │  │                            │
│              │  │ Ext. APIs │  │                            │
│              │  │   Files   │  │                            │
│              │  └───────────┘  │                            │
│              └─────────────────┘                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Platform API (Orchestrator)              │   │
│  │  • Agent Registry  • Chain Execution  • MCP Mgmt    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              IBM Agent Stack                          │   │
│  │  IBM Code Engine │ OpenShift │ Kubernetes            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. A2A Server (`src/agents/a2a-server.ts`)
- Exposes any agent as an A2A-compliant server
- Agent discovery via `/.well-known/agent.json`
- Async task management with polling
- WebSocket streaming support
- Framework-agnostic base class

### 2. ADK Agent Chain (`src/agents/adk-agent.ts`)
- `ADKAgent`: Tool-using agent with agentic loop
- `AgentChain`: Sequential chaining (output → input)
- Input/output transforms between steps
- Conditional step execution
- Retry with exponential backoff
- `ParallelAgentGroup`: Fan-out execution

### 3. MCP Integration (`src/mcp/mcp-client.ts`)
- `MCPClient`: Connect to MCP data sources
- Tool calling, resource reading, prompt fetching
- Multi-server management
- `MCPServer`: Expose data sources as MCP servers

### 4. IBM Agent Stack (`src/deployment/ibm-agent-stack.ts`)
- IBM Cloud Code Engine deployment
- OpenShift deployment with DeploymentConfig + Routes
- Kubernetes manifest generation (Deployment, Service, HPA, Ingress)
- Auto-scaling configuration
- Agent registry integration

### 5. Platform API (`src/api/server.ts`)
- Agent registry (register, discover, health check)
- Chain orchestration endpoint
- MCP connection management
- Deployment management
- Metrics and monitoring

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
export ANTHROPIC_API_KEY=your_key
export IBM_API_KEY=your_ibm_key  # optional

# Start all services
docker-compose up -d

# Or run locally
npm run dev
```

## API Reference

### Agent Registry
```
POST /api/agents/register       Register an agent
GET  /api/agents                List all agents
GET  /api/agents/:id            Get agent details
POST /api/agents/health-check   Check all agent health
```

### Chain Execution
```
POST /api/chains/execute        Execute a sequential chain
POST /api/chains/validate       Validate chain without executing
GET  /api/chains                List chain history
GET  /api/chains/:chainId       Get chain result
```

### MCP
```
POST /api/mcp/connect           Connect to MCP server
GET  /api/mcp/connections       List connections
GET  /api/mcp/tools             List available tools
POST /api/mcp/tools/call        Call a tool
GET  /api/mcp/resources         List resources
POST /api/mcp/resources/read    Read a resource
```

### Deployments
```
POST /api/deployments/code-engine    Deploy to IBM Code Engine
POST /api/deployments/openshift      Deploy to OpenShift
POST /api/deployments/manifests      Generate K8s manifests
GET  /api/deployments                List deployments
```

## Execute a Chain (Example)

```bash
curl -X POST http://localhost:3000/api/chains/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "steps": [
      { "agentId": "research-agent-001", "name": "Research" },
      { "agentId": "data-analysis-agent-001", "name": "Analysis" },
      { "agentId": "report-agent-001", "name": "Report" }
    ],
    "input": { "topic": "AI agent frameworks 2025", "depth": "deep" },
    "context": { "sessionId": "user_123" }
  }'
```

## Register a New Framework Agent

Any HTTP server implementing the A2A protocol can be registered:

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H 'Content-Type: application/json' \
  -d '{ "endpoint": "http://my-langchain-agent:8085" }'
```

The platform auto-fetches the agent card from `endpoint/.well-known/agent.json`.

## Deploy to IBM Agent Stack

```bash
curl -X POST http://localhost:3000/api/deployments/code-engine \
  -H 'Content-Type: application/json' \
  -d '{
    "agentCard": { "id": "my-agent", "name": "My Agent", ... },
    "image": "us.icr.io/myns/my-agent:latest",
    "replicas": 2,
    "resources": { "cpu": "500m", "memory": "512Mi" },
    "env": { "ANTHROPIC_API_KEY": "..." },
    "autoscaling": { "minReplicas": 1, "maxReplicas": 10, "targetCPU": 70 }
  }'
```

## Project Structure

```
a2a-platform/
├── src/
│   ├── agents/
│   │   ├── a2a-server.ts          # A2A protocol base server
│   │   ├── adk-agent.ts           # ADK agent + chain orchestration
│   │   └── example-agents.ts      # Example agents (research, analysis, report)
│   ├── mcp/
│   │   └── mcp-client.ts          # MCP client + server
│   ├── deployment/
│   │   └── ibm-agent-stack.ts     # IBM deployment module
│   └── api/
│       └── server.ts              # Platform orchestration API
├── frontend/
│   └── index.html                 # Dashboard UI
├── k8s/
│   └── platform.yaml              # Kubernetes manifests
├── docker-compose.yml             # Local development stack
└── README.md
```
