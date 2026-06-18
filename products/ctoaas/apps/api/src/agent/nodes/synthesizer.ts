/**
 * Synthesizer Node — Response Composition
 *
 * Builds the final advisory response by:
 *   1. Constructing a system prompt with org context
 *   2. Including tool results and citations in context
 *   3. Calling the LLM provider
 *   4. Attaching confidence indicator and citations
 *   5. Appending AI disclaimer
 *
 * The LLM provider is injected for testability.
 *
 * [IMPL-032][FR-001][FR-009][FR-029][US-01][US-02]
 */

import { Citation } from '../../services/rag-query.service';
import { AgentMessage, ConfidenceLevel, ToolResult } from '../state';

// --------------- constants ---------------

export const AI_DISCLAIMER =
  'This response is AI-generated and should not be considered professional advice.';

// --------------- types ---------------

export type LLMProvider = (
  systemPrompt: string,
  userMessage: string
) => Promise<string>;

export interface SynthesizerInput {
  messages: AgentMessage[];
  orgContext: string;
  toolResults: ToolResult[];
  citations: Citation[];
  confidence: ConfidenceLevel;
  llmProvider: LLMProvider;
}

export interface SynthesizerOutput {
  response: string;
  citations: Citation[];
  confidence: ConfidenceLevel;
  disclaimer: string;
}

// --------------- node ---------------

/**
 * Compose the final advisory response using the LLM provider.
 */
export async function synthesizerNode(
  input: SynthesizerInput
): Promise<SynthesizerOutput> {
  const systemPrompt = buildSystemPrompt(input.orgContext, input.toolResults, input.citations);

  // Extract the latest user message
  const lastUserMsg = [...input.messages]
    .reverse()
    .find((m) => m.role === 'user');
  const userMessage = lastUserMsg?.content ?? '';

  // Call LLM
  const rawResponse = await input.llmProvider(systemPrompt, userMessage);

  // Determine confidence from citations
  const confidence = determineConfidence(input.citations, input.confidence);

  return {
    response: rawResponse,
    citations: input.citations,
    confidence,
    disclaimer: AI_DISCLAIMER,
  };
}

// --------------- helpers ---------------

function buildSystemPrompt(
  orgContext: string,
  toolResults: ToolResult[],
  citations: Citation[]
): string {
  const parts: string[] = [];

  parts.push(
    'You are an AI-powered CTO advisory assistant. ' +
    'Provide strategic technology guidance based on the organization context and knowledge base.'
  );

  // Inject org context
  if (orgContext) {
    parts.push('\n--- Organization Context ---');
    parts.push(orgContext);
  }

  // Inject tool results
  if (toolResults.length > 0) {
    parts.push('\n--- Knowledge Base Results ---');
    for (const result of toolResults) {
      parts.push(`[${result.tool}]: ${result.data}`);
    }
  }

  // Inject citations for reference
  if (citations.length > 0) {
    parts.push('\n--- Sources ---');
    for (const citation of citations) {
      parts.push(
        `${citation.marker} "${citation.sourceTitle}" ` +
        (citation.author ? `by ${citation.author}` : '') +
        ` (relevance: ${(citation.relevanceScore * 100).toFixed(0)}%)`
      );
    }
    parts.push('\nReference these sources using their markers when applicable.');
  }

  parts.push(
    '\nAlways provide actionable, context-aware advice. ' +
    'If you lack sufficient information, state your assumptions clearly.'
  );

  return parts.join('\n');
}

function determineConfidence(
  citations: Citation[],
  inputConfidence: ConfidenceLevel
): ConfidenceLevel {
  if (citations.length === 0) {
    return inputConfidence === 'low' ? 'low' : inputConfidence;
  }

  const avgScore =
    citations.reduce((sum, c) => sum + c.relevanceScore, 0) / citations.length;

  if (avgScore >= 0.8) return 'high';
  if (avgScore >= 0.5) return 'medium';
  return 'low';
}
