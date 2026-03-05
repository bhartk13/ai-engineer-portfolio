/**
 * Example A2A Agents - Demonstrates exposing agents from different frameworks
 * as A2A-compliant servers
 */

import { ADKAgent, ADKTool } from './adk-agent';
import { A2AServer } from './a2a-server';
import { MCPServer } from '../mcp/mcp-client';
import express from 'express';

// ─── 1. Research Agent (ADK/LangChain style) ──────────────────────────────────

export function createResearchAgent(port = 8081) {
  const webSearchTool: ADKTool = {
    name: 'web_search',
    description: 'Search the web for current information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        maxResults: { type: 'number', description: 'Max results to return' },
      },
      required: ['query'],
    },
    execute: async (params) => {
      // In production: call actual search API
      return {
        query: params.query,
        results: [
          { title: 'Result 1', snippet: `Information about ${params.query}`, url: 'https://example.com/1' },
          { title: 'Result 2', snippet: `More details on ${params.query}`, url: 'https://example.com/2' },
        ],
      };
    },
  };

  const summarizeTool: ADKTool = {
    name: 'summarize_text',
    description: 'Summarize a long piece of text',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        maxLength: { type: 'number', description: 'Maximum summary length' },
      },
      required: ['text'],
    },
    execute: async (params) => {
      const text = params.text as string;
      return { summary: text.slice(0, (params.maxLength as number) || 200) + '...' };
    },
  };

  const agent = new ADKAgent(
    {
      id: 'research-agent-001',
      name: 'Research Agent',
      description: 'Researches topics using web search and synthesizes information',
      version: '1.0.0',
      framework: 'adk',
      capabilities: [
        { name: 'web_research', description: 'Research any topic using web search' },
        { name: 'summarization', description: 'Summarize and synthesize information' },
      ],
      inputSchema: {
        type: 'object',
        properties: { topic: { type: 'string' }, depth: { type: 'string', enum: ['shallow', 'deep'] } },
        required: ['topic'],
      },
      outputSchema: {
        type: 'object',
        properties: { summary: { type: 'string' }, sources: { type: 'array' }, confidence: { type: 'number' } },
      },
      endpoint: `http://localhost:${port}`,
      healthEndpoint: `http://localhost:${port}/health`,
      metadata: { specialty: 'research', language: 'en' },
      tags: ['research', 'web-search', 'summarization'],
    },
    {
      systemPrompt: `You are an expert research agent. When given a topic, you:
1. Search for relevant information using the web_search tool
2. Synthesize the findings into a comprehensive summary
3. Always cite your sources
4. Identify key insights and trends

Respond with structured JSON containing: summary, keyInsights, sources, confidence (0-1).`,
      tools: [webSearchTool, summarizeTool],
      maxIterations: 5,
    }
  );

  agent.listen(port);
  return agent;
}

// ─── 2. Data Analysis Agent (AutoGen style) ───────────────────────────────────

export function createDataAnalysisAgent(port = 8082) {
  const agent = new ADKAgent(
    {
      id: 'data-analysis-agent-001',
      name: 'Data Analysis Agent',
      description: 'Analyzes datasets and generates statistical insights',
      version: '1.0.0',
      framework: 'adk',
      capabilities: [
        { name: 'statistical_analysis', description: 'Compute statistics on datasets' },
        { name: 'trend_detection', description: 'Identify trends and patterns' },
        { name: 'visualization', description: 'Generate chart specifications' },
      ],
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'Dataset to analyze' },
          analysisType: { type: 'string', enum: ['summary', 'trend', 'anomaly', 'full'] },
        },
        required: ['data'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          statistics: { type: 'object' },
          trends: { type: 'array' },
          anomalies: { type: 'array' },
          charts: { type: 'array' },
          narrative: { type: 'string' },
        },
      },
      endpoint: `http://localhost:${port}`,
      healthEndpoint: `http://localhost:${port}/health`,
      metadata: { specialty: 'analytics' },
      tags: ['data-analysis', 'statistics', 'visualization'],
    },
    {
      systemPrompt: `You are a data analysis expert. Analyze the provided dataset and:
1. Compute key statistics (mean, median, std, percentiles)
2. Identify trends and patterns
3. Flag anomalies or outliers
4. Generate chart specifications in Vega-Lite format
5. Write a clear narrative summary

Always return valid JSON with: statistics, trends, anomalies, charts (Vega-Lite specs), narrative.`,
      tools: [
        {
          name: 'compute_statistics',
          description: 'Compute statistical measures for a dataset',
          parameters: {
            type: 'object',
            properties: {
              data: { type: 'array', description: 'Numeric data array' },
              measures: { type: 'array', description: 'Measures to compute' },
            },
            required: ['data'],
          },
          execute: async (params) => {
            const data = params.data as number[];
            const sorted = [...data].sort((a, b) => a - b);
            const sum = data.reduce((a, b) => a + b, 0);
            const mean = sum / data.length;
            const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;

            return {
              count: data.length,
              sum,
              mean,
              median: sorted[Math.floor(sorted.length / 2)],
              std: Math.sqrt(variance),
              min: sorted[0],
              max: sorted[sorted.length - 1],
              p25: sorted[Math.floor(sorted.length * 0.25)],
              p75: sorted[Math.floor(sorted.length * 0.75)],
              p95: sorted[Math.floor(sorted.length * 0.95)],
            };
          },
        },
      ],
      maxIterations: 8,
    }
  );

  agent.listen(port);
  return agent;
}

// ─── 3. Report Generator Agent (CrewAI style) ─────────────────────────────────

export function createReportAgent(port = 8083) {
  const agent = new ADKAgent(
    {
      id: 'report-agent-001',
      name: 'Report Generator Agent',
      description: 'Generates professional reports from structured data',
      version: '1.0.0',
      framework: 'adk',
      capabilities: [
        { name: 'report_generation', description: 'Generate structured reports' },
        { name: 'executive_summary', description: 'Write executive summaries' },
        { name: 'recommendations', description: 'Generate actionable recommendations' },
      ],
      inputSchema: {
        type: 'object',
        properties: {
          researchData: { type: 'object', description: 'Research findings from Research Agent' },
          analysisData: { type: 'object', description: 'Analysis from Data Analysis Agent' },
          reportType: { type: 'string', enum: ['executive', 'technical', 'summary'] },
          audience: { type: 'string', description: 'Target audience' },
        },
        required: ['reportType'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          executiveSummary: { type: 'string' },
          sections: { type: 'array' },
          recommendations: { type: 'array' },
          conclusion: { type: 'string' },
        },
      },
      endpoint: `http://localhost:${port}`,
      healthEndpoint: `http://localhost:${port}/health`,
      metadata: { specialty: 'reporting' },
      tags: ['reporting', 'writing', 'synthesis'],
    },
    {
      systemPrompt: `You are a professional report writer. Given research and analysis data, create:
1. A compelling executive summary
2. Well-structured sections with clear headings
3. Data-driven insights with supporting evidence
4. Concrete, actionable recommendations
5. A forward-looking conclusion

Tailor the tone and depth to the specified audience. Return valid JSON with:
title, executiveSummary, sections (array of {heading, content, keyPoints}), recommendations, conclusion.`,
      tools: [],
      maxIterations: 3,
    }
  );

  agent.listen(port);
  return agent;
}

// ─── 4. MCP Data Source Server ────────────────────────────────────────────────

export function createMCPDataServer(port = 9001) {
  const mcpServer = new MCPServer();

  // Register database query tool
  mcpServer.registerTool(
    {
      name: 'query_database',
      description: 'Query the internal database for structured data',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name to query' },
          filters: { type: 'object', description: 'Filter conditions' },
          limit: { type: 'number', description: 'Max records to return' },
        },
        required: ['table'],
      },
    },
    async (params) => {
      // Mock database query
      return {
        table: params.table,
        records: [
          { id: 1, value: 'Sample record 1', timestamp: new Date().toISOString() },
          { id: 2, value: 'Sample record 2', timestamp: new Date().toISOString() },
        ],
        total: 2,
        query: params,
      };
    }
  );

  // Register API call tool
  mcpServer.registerTool(
    {
      name: 'call_external_api',
      description: 'Make HTTP calls to external APIs',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'API endpoint URL' },
          method: { type: 'string', description: 'HTTP method' },
          headers: { type: 'object', description: 'Request headers' },
          body: { type: 'object', description: 'Request body' },
        },
        required: ['url'],
      },
    },
    async (params) => {
      // In production: make actual HTTP call
      return { status: 200, data: { message: `Mock response for ${params.url}` } };
    }
  );

  // Register data resource
  mcpServer.registerResource(
    {
      uri: 'data://company/metrics',
      name: 'Company Metrics',
      description: 'Real-time company performance metrics',
      mimeType: 'application/json',
    },
    async () => ({
      uri: 'data://company/metrics',
      mimeType: 'application/json',
      text: JSON.stringify({
        revenue: 1250000,
        users: 45832,
        retention: 0.89,
        nps: 72,
        timestamp: new Date().toISOString(),
      }),
    })
  );

  // Mount MCP server on Express
  const server = express();
  server.use(express.json());
  server.use(mcpServer.getRouter());
  server.get('/health', (_req, res) => res.json({ status: 'healthy', type: 'mcp-server' }));

  server.listen(port, () => {
    console.log(`[MCP] Data source server running on port ${port}`);
  });

  return mcpServer;
}

// ─── Start all example agents ─────────────────────────────────────────────────

if (require.main === module) {
  console.log('Starting example A2A agents...');
  createResearchAgent(8081);
  createDataAnalysisAgent(8082);
  createReportAgent(8083);
  createMCPDataServer(9001);

  console.log('\nA2A Agent endpoints:');
  console.log('  Research Agent:     http://localhost:8081/.well-known/agent.json');
  console.log('  Data Analysis:      http://localhost:8082/.well-known/agent.json');
  console.log('  Report Generator:   http://localhost:8083/.well-known/agent.json');
  console.log('  MCP Data Source:    http://localhost:9001/mcp');
}
