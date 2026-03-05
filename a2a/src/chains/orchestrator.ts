/**
 * Chain Orchestrator - Higher-level chain management
 * Pre-built chain templates for common A2A patterns
 */
import { AgentChain, ChainStep, ChainResult } from "../agents/adk-agent";

export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  steps: ChainStep[];
  tags: string[];
}

export class ChainOrchestrator {
  private templates = new Map<string, ChainTemplate>();
  private history: ChainResult[] = [];

  registerTemplate(template: ChainTemplate): void {
    this.templates.set(template.id, template);
    console.log("[Orchestrator] Registered chain template:", template.name);
  }

  async executeTemplate(
    templateId: string,
    input: unknown,
    context: Record<string, unknown> = {}
  ): Promise<ChainResult> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error("Chain template not found: " + templateId);
    const chain = new AgentChain(template.steps);
    const result = await chain.execute(input, { ...context, templateId });
    this.history.push(result);
    return result;
  }

  listTemplates(): ChainTemplate[] {
    return Array.from(this.templates.values());
  }

  getHistory(limit = 50): ChainResult[] {
    return this.history.slice(-limit);
  }
}

export const defaultOrchestrator = new ChainOrchestrator();
