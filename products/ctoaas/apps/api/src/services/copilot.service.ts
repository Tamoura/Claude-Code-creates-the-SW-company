/**
 * Copilot Service — Orchestrates advisory agent invocation
 *
 * Connects the Fastify request layer to the advisory agent graph.
 * Handles org context building, agent creation, and response formatting.
 *
 * [IMPL-034][FR-002][FR-029][US-01][US-02]
 */

import { PrismaClient } from '@prisma/client';
import { RAGQueryService } from './rag-query.service';
import { DataSanitizer } from './data-sanitizer';
import { ProfileService } from './profile.service';
import {
  createAdvisoryAgent,
  AgentResponse,
  AdvisoryAgentDeps,
} from '../agent/graph';
import { LLMProvider } from '../agent/nodes/synthesizer';

// --------------- types ---------------

export interface CopilotRunInput {
  message: string;
  conversationId: string | null;
  userId: string;
}

// --------------- default LLM provider ---------------

/**
 * Default LLM provider that returns a placeholder response.
 * In production, this would call the Anthropic Claude API.
 * The placeholder allows the system to function without API keys.
 */
const defaultLLMProvider: LLMProvider = async (
  _systemPrompt: string,
  userMessage: string
) => {
  return (
    `I understand you're asking about: "${userMessage}". ` +
    'As the advisory agent, I would provide strategic guidance here based on ' +
    'your organization context and our knowledge base. ' +
    'This is a placeholder response — connect an LLM provider for full advisory capability.'
  );
};

// --------------- service ---------------

export class CopilotService {
  private prisma: PrismaClient;
  private ragQueryService: RAGQueryService;
  private dataSanitizer: DataSanitizer;
  private profileService: ProfileService;
  private llmProvider: LLMProvider;

  constructor(
    prisma: PrismaClient,
    options?: { llmProvider?: LLMProvider }
  ) {
    this.prisma = prisma;
    this.ragQueryService = new RAGQueryService();
    this.dataSanitizer = new DataSanitizer();
    this.profileService = new ProfileService(prisma);
    this.llmProvider = options?.llmProvider ?? defaultLLMProvider;
  }

  /**
   * Run the advisory agent for a user message.
   */
  async run(input: CopilotRunInput): Promise<AgentResponse> {
    // 1. Build org context from the user's company profile
    let orgContext = '';
    try {
      const profile = await this.profileService.getCompanyProfile(
        input.userId
      );
      if (profile) {
        orgContext = this.profileService.buildOrgContext({
          techStack: (profile.techStack as Record<string, string[]>) || {},
          cloudProvider: profile.cloudProvider as string | null,
          architectureNotes: profile.architectureNotes as string | null,
          constraints: profile.constraints as string | null,
          organization: (profile.organization as {
            name: string;
            industry: string;
            employeeCount: number;
            growthStage: string;
            foundedYear?: number | null;
            challenges: string[];
          }) || {
            name: 'Unknown',
            industry: 'Unknown',
            employeeCount: 0,
            growthStage: 'Unknown',
            challenges: [],
          },
          preferences: profile.preferences as {
            communicationStyle: string;
            responseFormat: string;
            detailLevel: string;
          } | null,
        });
      }
    } catch {
      // Org context is optional — proceed without it
      orgContext = '';
    }

    // 2. Create and run the advisory agent
    const deps: AdvisoryAgentDeps = {
      ragQueryService: this.ragQueryService,
      dataSanitizer: this.dataSanitizer,
      llmProvider: this.llmProvider,
    };

    const agent = createAdvisoryAgent(deps);
    return agent.run(input.message, orgContext);
  }
}
