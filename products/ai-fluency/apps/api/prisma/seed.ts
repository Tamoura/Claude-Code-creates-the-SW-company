import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function loadJson<T>(filename: string): T {
  const filePath = join(__dirname, 'seed-data', filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

interface IndicatorSeed {
  shortCode: string;
  name: string;
  description: string;
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  track: 'OBSERVABLE' | 'SELF_REPORT';
  prevalenceWeight: number;
  sortOrder: number;
}

interface ScenarioOption {
  key: string;
  text: string;
  isCorrect: boolean;
  score: number;
}

interface LikertOptions {
  min: number;
  max: number;
  labels: string[];
}

interface QuestionSeed {
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  interactionMode: 'AUTOMATION' | 'AUGMENTATION' | 'AGENCY';
  questionType: 'SCENARIO' | 'SELF_REPORT';
  indicatorShortCode: string;
  text: string;
  optionsJson: ScenarioOption[] | LikertOptions;
}

interface TemplateSeed {
  name: string;
  description: string;
  roleProfile: 'DEVELOPER' | 'ANALYST' | 'MANAGER' | 'MARKETER' | 'GENERIC';
  isCustom: boolean;
  dimensionWeights: Record<string, number>;
}

interface AlgorithmSeed {
  version: number;
  description: string;
  isActive: boolean;
}

interface ModuleSeed {
  title: string;
  description: string;
  dimension: 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';
  interactionMode: 'AUTOMATION' | 'AUGMENTATION' | 'AGENCY' | null;
  contentType: 'VIDEO' | 'ARTICLE' | 'EXERCISE' | 'QUIZ' | 'SIMULATION';
  estimatedMinutes: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  contentUrl: string;
}

async function seedBehavioralIndicators(): Promise<void> {
  const indicators = loadJson<IndicatorSeed[]>('behavioral-indicators.json');
  console.log(`Seeding ${indicators.length} behavioral indicators...`);

  for (const indicator of indicators) {
    await prisma.behavioralIndicator.upsert({
      where: { shortCode: indicator.shortCode },
      update: {
        name: indicator.name,
        description: indicator.description,
        dimension: indicator.dimension,
        track: indicator.track,
        prevalenceWeight: indicator.prevalenceWeight,
        sortOrder: indicator.sortOrder,
      },
      create: {
        shortCode: indicator.shortCode,
        name: indicator.name,
        description: indicator.description,
        dimension: indicator.dimension,
        track: indicator.track,
        prevalenceWeight: indicator.prevalenceWeight,
        sortOrder: indicator.sortOrder,
      },
    });
  }

  console.log(`  Done: ${indicators.length} behavioral indicators upserted.`);
}

async function seedQuestions(): Promise<void> {
  const questions = loadJson<QuestionSeed[]>('questions.json');
  console.log(`Seeding ${questions.length} assessment questions...`);

  // Build a lookup map: shortCode -> indicator id
  const indicators = await prisma.behavioralIndicator.findMany({
    select: { id: true, shortCode: true },
  });
  const indicatorMap = new Map(indicators.map((i) => [i.shortCode, i.id]));

  for (const question of questions) {
    const indicatorId = indicatorMap.get(question.indicatorShortCode);
    if (!indicatorId) {
      console.error(
        `  WARNING: No indicator found for shortCode "${question.indicatorShortCode}", skipping question.`
      );
      continue;
    }

    // Use text + indicatorId as a natural key for upsert (no unique constraint on text,
    // so we find-or-create by matching text content)
    const existing = await prisma.question.findFirst({
      where: {
        text: question.text,
        indicatorId: indicatorId,
      },
    });

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          dimension: question.dimension,
          interactionMode: question.interactionMode,
          questionType: question.questionType,
          optionsJson: question.optionsJson as object,
          isActive: true,
        },
      });
    } else {
      await prisma.question.create({
        data: {
          dimension: question.dimension,
          interactionMode: question.interactionMode,
          questionType: question.questionType,
          indicatorId: indicatorId,
          text: question.text,
          optionsJson: question.optionsJson as object,
          isActive: true,
        },
      });
    }
  }

  console.log(`  Done: ${questions.length} questions seeded.`);
}

async function seedAssessmentTemplates(): Promise<void> {
  const templates = loadJson<TemplateSeed[]>('assessment-templates.json');
  console.log(`Seeding ${templates.length} assessment templates...`);

  for (const template of templates) {
    // Use name as natural key for platform-provided templates (orgId = null)
    const existing = await prisma.assessmentTemplate.findFirst({
      where: {
        name: template.name,
        orgId: null,
      },
    });

    if (existing) {
      await prisma.assessmentTemplate.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          roleProfile: template.roleProfile,
          isCustom: template.isCustom,
          dimensionWeights: template.dimensionWeights,
          isActive: true,
        },
      });
    } else {
      await prisma.assessmentTemplate.create({
        data: {
          orgId: null,
          name: template.name,
          description: template.description,
          roleProfile: template.roleProfile,
          isCustom: template.isCustom,
          dimensionWeights: template.dimensionWeights,
          isActive: true,
        },
      });
    }
  }

  console.log(`  Done: ${templates.length} assessment templates seeded.`);
}

async function seedAlgorithmVersions(): Promise<void> {
  const versions = loadJson<AlgorithmSeed[]>('algorithm-versions.json');
  console.log(`Seeding ${versions.length} algorithm versions...`);

  for (const version of versions) {
    await prisma.algorithmVersion.upsert({
      where: { version: version.version },
      update: {
        description: version.description,
        isActive: version.isActive,
        activatedAt: version.isActive ? new Date() : undefined,
      },
      create: {
        version: version.version,
        description: version.description,
        isActive: version.isActive,
        activatedAt: version.isActive ? new Date() : undefined,
      },
    });
  }

  console.log(`  Done: ${versions.length} algorithm versions seeded.`);
}

async function seedLearningModules(): Promise<void> {
  const modules = loadJson<ModuleSeed[]>('learning-modules.json');
  console.log(`Seeding ${modules.length} learning modules...`);

  for (const mod of modules) {
    // Use contentUrl as natural key (unique per module)
    const existing = await prisma.learningModule.findFirst({
      where: { contentUrl: mod.contentUrl },
    });

    if (existing) {
      await prisma.learningModule.update({
        where: { id: existing.id },
        data: {
          title: mod.title,
          description: mod.description,
          dimension: mod.dimension,
          interactionMode: mod.interactionMode,
          contentType: mod.contentType,
          estimatedMinutes: mod.estimatedMinutes,
          difficulty: mod.difficulty,
          isActive: true,
        },
      });
    } else {
      await prisma.learningModule.create({
        data: {
          title: mod.title,
          description: mod.description,
          dimension: mod.dimension,
          interactionMode: mod.interactionMode,
          contentType: mod.contentType,
          estimatedMinutes: mod.estimatedMinutes,
          difficulty: mod.difficulty,
          contentUrl: mod.contentUrl,
          isActive: true,
        },
      });
    }
  }

  console.log(`  Done: ${modules.length} learning modules seeded.`);
}

async function main(): Promise<void> {
  console.log('=== AI Fluency Platform - Database Seed ===\n');

  try {
    // Seed in dependency order
    await seedBehavioralIndicators();
    await seedQuestions();
    await seedAssessmentTemplates();
    await seedAlgorithmVersions();
    await seedLearningModules();

    console.log('\n=== Seed complete ===');

    // Print summary counts
    const counts = await Promise.all([
      prisma.behavioralIndicator.count(),
      prisma.question.count(),
      prisma.assessmentTemplate.count(),
      prisma.algorithmVersion.count(),
      prisma.learningModule.count(),
    ]);

    console.log(`\nDatabase summary:`);
    console.log(`  Behavioral indicators: ${counts[0]}`);
    console.log(`  Questions:             ${counts[1]}`);
    console.log(`  Assessment templates:  ${counts[2]}`);
    console.log(`  Algorithm versions:    ${counts[3]}`);
    console.log(`  Learning modules:      ${counts[4]}`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
