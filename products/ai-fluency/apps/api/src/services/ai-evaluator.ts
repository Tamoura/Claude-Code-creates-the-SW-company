/**
 * services/ai-evaluator.ts — AI-powered assessment response evaluator
 *
 * Uses OpenRouter to evaluate free-text learner responses against
 * behavioral indicators from the 4D AI Fluency Framework.
 * Falls back to a neutral score (0.5) on AI failure — never blocks assessment.
 */

import { OpenRouterClient, ChatMessage } from './openrouter';

export interface EvaluationRequest {
  response: string;
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  indicatorName: string;
  indicatorDescription: string;
  questionText: string;
}

export interface EvaluationResult {
  score: number;
  rationale: string;
  strengths: string[];
  improvements: string[];
}

const SYSTEM_PROMPT = `You are an AI Fluency assessment evaluator for the AI Fluency Platform.
You evaluate learner responses against behavioral indicators from Anthropic's 4D AI Fluency Framework.
You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.
JSON schema: {"score": number (0.0-1.0), "rationale": string, "strengths": string[], "improvements": string[]}`;

export class AIEvaluator {
  constructor(private client: OpenRouterClient) {}

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    const userPrompt = `Evaluate this learner's response against the following behavioral indicator.

Dimension: ${request.dimension}
Indicator: ${request.indicatorName}
Indicator Description: ${request.indicatorDescription}

Question: ${request.questionText}

Learner's Response:
${request.response}

Score from 0.0 (no evidence of the behavior) to 1.0 (strong evidence).
Respond with JSON only.`;

    try {
      const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];
      const aiResponse = await this.client.chat(messages, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.2,
      });

      return this.parseResponse(aiResponse);
    } catch {
      return this.fallbackResult();
    }
  }

  private parseResponse(raw: string): EvaluationResult {
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        score: Math.min(1.0, Math.max(0.0, Number(parsed.score) || 0.5)),
        rationale: String(parsed.rationale ?? ''),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      };
    } catch {
      return this.fallbackResult();
    }
  }

  private fallbackResult(): EvaluationResult {
    return {
      score: 0.5,
      rationale: 'This response could not be automatically evaluated. A neutral score has been assigned.',
      strengths: [],
      improvements: [],
    };
  }
}
