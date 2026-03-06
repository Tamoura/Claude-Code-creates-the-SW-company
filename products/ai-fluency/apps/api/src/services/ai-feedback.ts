/**
 * services/ai-feedback.ts — AI-powered post-assessment feedback generator
 *
 * Uses OpenRouter to generate personalized, dimension-specific feedback
 * after a learner completes their 4D AI Fluency assessment.
 * Falls back to template-based feedback on AI failure.
 */

import { OpenRouterClient, ChatMessage } from './openrouter';
import { ScoredProfile } from './scoring';

export interface FeedbackRequest {
  profile: ScoredProfile;
  userName?: string;
}

export interface FeedbackResult {
  summary: string;
  dimensionFeedback: {
    DELEGATION: string;
    DESCRIPTION: string;
    DISCERNMENT: string;
    DILIGENCE: string;
  };
  topStrengths: string[];
  priorityImprovements: string[];
  discernmentGapWarning?: string;
  recommendedNextSteps: string[];
}

const SYSTEM_PROMPT = `You are an AI Fluency coach for the AI Fluency Platform.
You generate personalized feedback based on a learner's 4D AI Fluency assessment results.
The 4D Framework covers: Delegation, Description, Discernment, and Diligence.
Scores are 0-100 per dimension (observable behavioral scores) and overall.
Self-report scores are the learner's self-assessment (also 0-100).
A "discernment gap" means the learner overestimates their Discernment ability.
You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.`;

const DIMENSIONS = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'] as const;

export class AIFeedbackGenerator {
  constructor(private client: OpenRouterClient) {}

  async generate(request: FeedbackRequest): Promise<FeedbackResult> {
    const { profile, userName } = request;

    const userPrompt = `Generate personalized feedback for ${userName ?? 'the learner'} based on these assessment results:

Overall Score: ${profile.overallScore}/100
Dimension Scores (behavioral/observable):
  DELEGATION: ${profile.dimensionScores.DELEGATION}
  DESCRIPTION: ${profile.dimensionScores.DESCRIPTION}
  DISCERNMENT: ${profile.dimensionScores.DISCERNMENT}
  DILIGENCE: ${profile.dimensionScores.DILIGENCE}
Self-Report Scores (learner's self-assessment):
  DELEGATION: ${profile.selfReportScores.DELEGATION}
  DESCRIPTION: ${profile.selfReportScores.DESCRIPTION}
  DISCERNMENT: ${profile.selfReportScores.DISCERNMENT}
  DILIGENCE: ${profile.selfReportScores.DILIGENCE}
discernmentGap: ${profile.discernmentGap}

Respond with JSON:
{
  "summary": "1-2 sentence personalized summary addressing the learner by name",
  "dimensionFeedback": {"DELEGATION": "...", "DESCRIPTION": "...", "DISCERNMENT": "...", "DILIGENCE": "..."},
  "topStrengths": ["strength1", "strength2"],
  "priorityImprovements": ["improvement1", "improvement2"],
  "discernmentGapWarning": "Only include if discernmentGap is true — explain the confidence-competence gap",
  "recommendedNextSteps": ["step1", "step2"]
}`;

    try {
      const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];
      const aiResponse = await this.client.chat(messages, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.4,
      });

      return this.parseResponse(aiResponse, request);
    } catch {
      return this.fallbackFeedback(request);
    }
  }

  private parseResponse(raw: string, request: FeedbackRequest): FeedbackResult {
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const result: FeedbackResult = {
        summary: String(parsed.summary ?? ''),
        dimensionFeedback: {
          DELEGATION: String(parsed.dimensionFeedback?.DELEGATION ?? ''),
          DESCRIPTION: String(parsed.dimensionFeedback?.DESCRIPTION ?? ''),
          DISCERNMENT: String(parsed.dimensionFeedback?.DISCERNMENT ?? ''),
          DILIGENCE: String(parsed.dimensionFeedback?.DILIGENCE ?? ''),
        },
        topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths : [],
        priorityImprovements: Array.isArray(parsed.priorityImprovements) ? parsed.priorityImprovements : [],
        recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps) ? parsed.recommendedNextSteps : [],
      };

      if (parsed.discernmentGapWarning && request.profile.discernmentGap) {
        result.discernmentGapWarning = String(parsed.discernmentGapWarning);
      }

      return result;
    } catch {
      return this.fallbackFeedback(request);
    }
  }

  private fallbackFeedback(request: FeedbackRequest): FeedbackResult {
    const { profile, userName } = request;
    const scores = profile.dimensionScores;

    // Find weakest and strongest dimensions
    const sorted = DIMENSIONS.slice().sort(
      (a, b) => scores[a] - scores[b]
    );
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    const result: FeedbackResult = {
      summary: `${userName ?? 'You'} achieved an overall score of ${profile.overallScore}/100. Your strongest area is ${strongest} and your priority improvement area is ${weakest}.`,
      dimensionFeedback: {
        DELEGATION: `Score: ${scores.DELEGATION}/100`,
        DESCRIPTION: `Score: ${scores.DESCRIPTION}/100`,
        DISCERNMENT: `Score: ${scores.DISCERNMENT}/100`,
        DILIGENCE: `Score: ${scores.DILIGENCE}/100`,
      },
      topStrengths: [],
      priorityImprovements: [`Focus on improving ${weakest} skills`],
      recommendedNextSteps: [`Complete the ${weakest} learning module`],
    };

    if (profile.discernmentGap) {
      result.discernmentGapWarning = `A discernment gap was detected — your self-assessed Discernment ability is higher than your behavioral score indicates.`;
    }

    return result;
  }
}
