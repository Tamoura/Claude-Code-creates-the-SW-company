import { PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

interface TechStack {
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
}

interface OrganizationData {
  name: string;
  industry: string;
  employeeCount: number;
  growthStage: string;
  foundedYear?: number | null;
  challenges: string[];
}

interface Preferences {
  communicationStyle: string;
  responseFormat: string;
  detailLevel: string;
}

interface ProfileData {
  techStack: TechStack;
  cloudProvider?: string | null;
  architectureNotes?: string | null;
  constraints?: string | null;
  organization: OrganizationData;
  preferences?: Preferences | null;
}

interface OnboardingState {
  currentStep: number;
  completed: boolean;
}

// ---------- Service ----------

export class ProfileService {
  private prisma?: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate profile completeness as a percentage (0-100).
   *
   * Step 1 (25%): org.industry, org.employeeCount, org.growthStage
   *   - Partial credit for foundedYear (+2 bonus within the 25)
   * Step 2 (25%): techStack has languages or frameworks or databases
   *   - Partial credit for cloudProvider, architectureNotes
   * Step 3 (25%): challenges array has >= 1 item
   * Step 4 (25%): preferences exist
   */
  calculateCompleteness(profile: ProfileData): number {
    let total = 0;

    // Step 1: Company basics (25 points)
    // Core: industry, employeeCount, growthStage — each worth 8pts
    // Bonus: foundedYear — 1pt
    const org = profile.organization;
    {
      let pts = 0;
      if (org.industry && org.industry.length > 0 && org.industry !== 'Technology')
        pts += 8;
      if (org.employeeCount && org.employeeCount > 0) pts += 8;
      if (org.growthStage && org.growthStage !== 'SEED') pts += 8;
      if (org.foundedYear) pts += 1;
      total += Math.min(pts, 25);
    }

    // Step 2: Tech stack (25 points)
    // Core: languages, frameworks, databases arrays populated
    // Having at least one of the arrays filled = step entered.
    // All 3 filled = step complete (25). Partial = proportional.
    const ts = profile.techStack || {};
    {
      const hasLanguages = Array.isArray(ts.languages) && ts.languages.length > 0;
      const hasFrameworks = Array.isArray(ts.frameworks) && ts.frameworks.length > 0;
      const hasDatabases = Array.isArray(ts.databases) && ts.databases.length > 0;
      const coreCount =
        (hasLanguages ? 1 : 0) +
        (hasFrameworks ? 1 : 0) +
        (hasDatabases ? 1 : 0);

      if (coreCount === 3) {
        // All core tech stack fields filled — full step score
        total += 25;
      } else if (coreCount > 0) {
        // Partial: proportional from core + bonus from optional
        let pts = Math.round((coreCount / 3) * 20);
        if (profile.cloudProvider) pts += 2;
        if (profile.architectureNotes) pts += 2;
        total += Math.min(pts, 24); // Never full 25 without all core
      }
    }

    // Step 3: Challenges (25 points)
    const challenges = org.challenges;
    if (Array.isArray(challenges) && challenges.length > 0) {
      total += 25;
    }

    // Step 4: Preferences (25 points)
    const prefs = profile.preferences;
    if (
      prefs &&
      prefs.communicationStyle &&
      prefs.responseFormat &&
      prefs.detailLevel
    ) {
      total += 25;
    }

    return Math.min(total, 100);
  }

  /**
   * Build an LLM context string from the company profile.
   */
  buildOrgContext(profile: ProfileData): string {
    const org = profile.organization;
    const parts: string[] = [];

    parts.push(`Company: ${org.name}`);
    parts.push(`Industry: ${org.industry}`);
    parts.push(`Team Size: ${org.employeeCount} employees`);
    parts.push(`Growth Stage: ${org.growthStage}`);

    if (org.foundedYear) {
      parts.push(`Founded: ${org.foundedYear}`);
    }

    // Tech stack
    const ts = profile.techStack || {};
    const techParts: string[] = [];
    if (Array.isArray(ts.languages) && ts.languages.length > 0) {
      techParts.push(`Languages: ${ts.languages.join(', ')}`);
    }
    if (Array.isArray(ts.frameworks) && ts.frameworks.length > 0) {
      techParts.push(`Frameworks: ${ts.frameworks.join(', ')}`);
    }
    if (Array.isArray(ts.databases) && ts.databases.length > 0) {
      techParts.push(`Databases: ${ts.databases.join(', ')}`);
    }
    if (techParts.length > 0) {
      parts.push(`Tech Stack: ${techParts.join('; ')}`);
    }

    if (profile.cloudProvider) {
      parts.push(`Cloud Provider: ${profile.cloudProvider}`);
    }

    if (profile.architectureNotes) {
      parts.push(`Architecture: ${profile.architectureNotes}`);
    }

    if (profile.constraints) {
      parts.push(`Constraints: ${profile.constraints}`);
    }

    // Challenges
    const challenges = org.challenges;
    if (Array.isArray(challenges) && challenges.length > 0) {
      parts.push(`Current Challenges: ${challenges.join(', ')}`);
    }

    // Preferences
    if (profile.preferences) {
      const prefs = profile.preferences;
      const prefParts: string[] = [];
      if (prefs.communicationStyle) {
        prefParts.push(`Communication: ${prefs.communicationStyle}`);
      }
      if (prefs.responseFormat) {
        prefParts.push(`Format: ${prefs.responseFormat}`);
      }
      if (prefs.detailLevel) {
        prefParts.push(`Detail: ${prefs.detailLevel}`);
      }
      if (prefParts.length > 0) {
        parts.push(`Advisory Preferences: ${prefParts.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  // ---------- DB-backed methods (require prisma) ----------

  private requirePrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('PrismaClient is required for this operation');
    }
    return this.prisma;
  }

  /**
   * Get the current data for a specific onboarding step.
   */
  async getOnboardingStep(
    userId: string,
    step: number
  ): Promise<{ step: number; data: Record<string, unknown> }> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw AppError.notFound('User not found');

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw AppError.notFound('Organization not found');

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId: user.organizationId },
    });

    switch (step) {
      case 1:
        return {
          step: 1,
          data: {
            industry: org.industry,
            employeeCount: org.employeeCount,
            growthStage: org.growthStage,
            foundedYear: org.foundedYear,
          },
        };
      case 2:
        return {
          step: 2,
          data: {
            ...(profile?.techStack as Record<string, unknown> || {}),
            cloudProvider: profile?.cloudProvider,
          },
        };
      case 3:
        return {
          step: 3,
          data: {
            challenges: (org.challenges as string[]) || [],
          },
        };
      case 4: {
        const prefs = await prisma.userPreference.findMany({
          where: { userId },
        });
        const prefMap: Record<string, string> = {};
        for (const p of prefs) {
          if (p.preferenceValue) {
            prefMap[p.preferenceKey] = p.preferenceValue;
          }
        }
        return {
          step: 4,
          data: prefMap,
        };
      }
      default:
        throw AppError.badRequest('Invalid step number. Must be 1-4.');
    }
  }

  /**
   * Save data for a specific onboarding step and advance state.
   */
  async saveOnboardingStep(
    userId: string,
    step: number,
    data: Record<string, unknown>
  ): Promise<void> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw AppError.notFound('User not found');

    const orgId = user.organizationId;

    switch (step) {
      case 1: {
        const updateData: Record<string, unknown> = {};
        if (data.industry !== undefined)
          updateData.industry = data.industry;
        if (data.employeeCount !== undefined)
          updateData.employeeCount = data.employeeCount;
        if (data.growthStage !== undefined)
          updateData.growthStage = data.growthStage;
        if (data.foundedYear !== undefined)
          updateData.foundedYear = data.foundedYear;

        if (Object.keys(updateData).length > 0) {
          await prisma.organization.update({
            where: { id: orgId },
            data: updateData,
          });
        }
        break;
      }
      case 2: {
        const techStack: TechStack = {};
        if (data.languages) techStack.languages = data.languages as string[];
        if (data.frameworks) techStack.frameworks = data.frameworks as string[];
        if (data.databases) techStack.databases = data.databases as string[];

        const profileData: Record<string, unknown> = {};
        if (Object.keys(techStack).length > 0) {
          profileData.techStack = techStack;
        }
        if (data.cloudProvider !== undefined) {
          profileData.cloudProvider = data.cloudProvider as string;
        }
        if (data.architectureNotes !== undefined) {
          profileData.architectureNotes = data.architectureNotes as string;
        }

        if (Object.keys(profileData).length > 0) {
          await prisma.companyProfile.update({
            where: { organizationId: orgId },
            data: profileData,
          });
        }
        break;
      }
      case 3: {
        if (data.challenges) {
          await prisma.organization.update({
            where: { id: orgId },
            data: { challenges: data.challenges },
          });
        }
        break;
      }
      case 4: {
        const prefKeys = [
          'communicationStyle',
          'responseFormat',
          'detailLevel',
        ];
        for (const key of prefKeys) {
          if (data[key] !== undefined) {
            await prisma.userPreference.upsert({
              where: {
                userId_preferenceKey: {
                  userId,
                  preferenceKey: key,
                },
              },
              update: {
                preferenceValue: data[key] as string,
              },
              create: {
                userId,
                organizationId: orgId,
                preferenceKey: key,
                preferenceValue: data[key] as string,
              },
            });
          }
        }
        break;
      }
      default:
        throw AppError.badRequest('Invalid step number. Must be 1-4.');
    }

    // Advance onboarding state
    await this.advanceOnboardingState(orgId, step);

    // Recalculate completeness
    await this.recalculateCompleteness(userId);
  }

  /**
   * Mark onboarding as completed. Validates all steps are done.
   */
  async completeOnboarding(userId: string): Promise<void> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw AppError.notFound('User not found');

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!profile) throw AppError.notFound('Company profile not found');

    const state = (profile.onboardingState as OnboardingState) || {
      currentStep: 1,
      completed: false,
    };

    // All 4 steps must have been completed (currentStep should be 5)
    if (state.currentStep < 5) {
      throw AppError.badRequest(
        'All onboarding steps must be completed before marking as done'
      );
    }

    await prisma.companyProfile.update({
      where: { organizationId: user.organizationId },
      data: {
        onboardingState: {
          currentStep: state.currentStep,
          completed: true,
        },
      },
    });
  }

  /**
   * Get the full company profile for the authenticated user.
   */
  async getCompanyProfile(userId: string): Promise<Record<string, unknown>> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw AppError.notFound('User not found');

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!profile) throw AppError.notFound('Company profile not found');

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const prefs = await prisma.userPreference.findMany({
      where: { userId },
    });

    const prefMap: Record<string, string> = {};
    for (const p of prefs) {
      if (p.preferenceValue) {
        prefMap[p.preferenceKey] = p.preferenceValue;
      }
    }

    return {
      organizationId: user.organizationId,
      techStack: profile.techStack,
      cloudProvider: profile.cloudProvider,
      architectureNotes: profile.architectureNotes,
      constraints: profile.constraints,
      profileCompleteness: profile.profileCompleteness,
      onboardingState: profile.onboardingState,
      organization: org
        ? {
            name: org.name,
            industry: org.industry,
            employeeCount: org.employeeCount,
            growthStage: org.growthStage,
            foundedYear: org.foundedYear,
            challenges: org.challenges,
          }
        : null,
      preferences: Object.keys(prefMap).length > 0 ? prefMap : null,
    };
  }

  /**
   * Update company profile fields and recalculate completeness.
   */
  async updateCompanyProfile(
    userId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw AppError.notFound('User not found');

    const profileData: Record<string, unknown> = {};
    if (data.techStack !== undefined) profileData.techStack = data.techStack;
    if (data.cloudProvider !== undefined)
      profileData.cloudProvider = data.cloudProvider;
    if (data.architectureNotes !== undefined)
      profileData.architectureNotes = data.architectureNotes;
    if (data.constraints !== undefined)
      profileData.constraints = data.constraints;

    if (Object.keys(profileData).length > 0) {
      await prisma.companyProfile.update({
        where: { organizationId: user.organizationId },
        data: profileData,
      });
    }

    // Recalculate completeness
    await this.recalculateCompleteness(userId);

    return this.getCompanyProfile(userId);
  }

  // ---------- Private helpers ----------

  private async advanceOnboardingState(
    orgId: string,
    completedStep: number
  ): Promise<void> {
    const prisma = this.requirePrisma();

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId: orgId },
    });
    if (!profile) return;

    const state = (profile.onboardingState as OnboardingState) || {
      currentStep: 1,
      completed: false,
    };

    // Only advance if this is the current or past step
    const nextStep = completedStep + 1;
    if (nextStep > state.currentStep) {
      await prisma.companyProfile.update({
        where: { organizationId: orgId },
        data: {
          onboardingState: {
            currentStep: nextStep,
            completed: state.completed,
          },
        },
      });
    }
  }

  private async recalculateCompleteness(userId: string): Promise<void> {
    const prisma = this.requirePrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) return;

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) return;

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!profile) return;

    const prefs = await prisma.userPreference.findMany({
      where: { userId },
    });
    const prefMap: Record<string, string> = {};
    for (const p of prefs) {
      if (p.preferenceValue) {
        prefMap[p.preferenceKey] = p.preferenceValue;
      }
    }

    const profileData: ProfileData = {
      techStack: (profile.techStack as TechStack) || {},
      cloudProvider: profile.cloudProvider,
      architectureNotes: profile.architectureNotes,
      constraints: profile.constraints,
      organization: {
        name: org.name,
        industry: org.industry,
        employeeCount: org.employeeCount,
        growthStage: org.growthStage,
        foundedYear: org.foundedYear,
        challenges: (org.challenges as string[]) || [],
      },
      preferences:
        Object.keys(prefMap).length >= 3
          ? (prefMap as unknown as Preferences)
          : null,
    };

    const completeness = this.calculateCompleteness(profileData);

    await prisma.companyProfile.update({
      where: { organizationId: user.organizationId },
      data: { profileCompleteness: completeness },
    });
  }
}
