import { PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

interface PreferenceProfile {
  totalSignals: number;
  summary: string;
  preferences: Array<{
    key: string;
    value: string | null;
    signalCount: number;
  }>;
}

// Feedback key derived from message characteristics
const FEEDBACK_KEY_PREFIX = 'feedback_';

// ---------- Service ----------

export class PreferenceLearningService {
  private static readonly SUMMARY_THRESHOLD = 10;

  constructor(private prisma: PrismaClient) {}

  /**
   * Record a feedback signal (thumbs up/down) on a message.
   * Also creates/updates a UserPreference record to track
   * accumulated signals.
   */
  async recordFeedback(
    userId: string,
    organizationId: string,
    messageId: string,
    feedback: 'UP' | 'DOWN'
  ): Promise<void> {
    // Update the message with the feedback
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: { select: { userId: true } },
      },
    });

    if (!message) {
      throw AppError.notFound('Message not found');
    }

    if (message.conversation.userId !== userId) {
      throw AppError.notFound('Message not found');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { feedback },
    });

    // Derive a preference key from the feedback
    // Simple heuristic: track "positive" and "negative" signal counts
    const prefKey = feedback === 'UP'
      ? `${FEEDBACK_KEY_PREFIX}positive`
      : `${FEEDBACK_KEY_PREFIX}negative`;

    await this.prisma.userPreference.upsert({
      where: {
        userId_preferenceKey: { userId, preferenceKey: prefKey },
      },
      update: {
        signalCount: { increment: 1 },
      },
      create: {
        userId,
        organizationId,
        preferenceKey: prefKey,
        preferenceValue: feedback === 'UP' ? 'positive' : 'negative',
        signalCount: 1,
      },
    });
  }

  /**
   * Get the user's preference profile for system prompt injection.
   * If enough signals (10+), generates a natural language summary.
   */
  async getPreferenceProfile(
    userId: string
  ): Promise<PreferenceProfile> {
    const preferences = await this.prisma.userPreference.findMany({
      where: { userId },
    });

    const totalSignals = preferences.reduce(
      (sum, p) => sum + p.signalCount,
      0
    );

    const prefList = preferences.map((p) => ({
      key: p.preferenceKey,
      value: p.preferenceValue,
      signalCount: p.signalCount,
    }));

    let summary: string;

    if (totalSignals >= PreferenceLearningService.SUMMARY_THRESHOLD) {
      summary = this.generateSummary(preferences);
    } else {
      summary = `Learning preferences (${totalSignals} signals collected, ${PreferenceLearningService.SUMMARY_THRESHOLD} needed for full profile).`;
    }

    return {
      totalSignals,
      summary,
      preferences: prefList,
    };
  }

  // ---------- Private helpers ----------

  private generateSummary(
    preferences: Array<{
      preferenceKey: string;
      preferenceValue: string | null;
      signalCount: number;
    }>
  ): string {
    const parts: string[] = [];

    const positive = preferences.find(
      (p) => p.preferenceKey === `${FEEDBACK_KEY_PREFIX}positive`
    );
    const negative = preferences.find(
      (p) => p.preferenceKey === `${FEEDBACK_KEY_PREFIX}negative`
    );

    const posCount = positive?.signalCount ?? 0;
    const negCount = negative?.signalCount ?? 0;

    if (posCount > negCount * 2) {
      parts.push(
        'User generally finds responses helpful and well-structured.'
      );
    } else if (negCount > posCount * 2) {
      parts.push(
        'User frequently indicates dissatisfaction. Consider adjusting response style.'
      );
    } else {
      parts.push(
        'User has mixed feedback. Balance detail level and brevity.'
      );
    }

    // Include style preferences if set
    const stylePrefs = preferences.filter(
      (p) => !p.preferenceKey.startsWith(FEEDBACK_KEY_PREFIX)
    );

    for (const pref of stylePrefs) {
      if (pref.preferenceValue) {
        const key = pref.preferenceKey
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()
          .trim();
        parts.push(`${key}: ${pref.preferenceValue}`);
      }
    }

    return parts.join(' ');
  }
}
