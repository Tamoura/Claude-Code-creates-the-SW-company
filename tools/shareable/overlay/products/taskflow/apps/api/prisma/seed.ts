import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds one project and three tasks so `pnpm dev` shows something on first
 * run. Safe to run repeatedly.
 */
async function main(): Promise<void> {
  const project = await prisma.project.upsert({
    where: { name: 'Onboarding' },
    update: {},
    create: { name: 'Onboarding' },
  });

  const existing = await prisma.task.count({ where: { projectId: project.id } });
  if (existing > 0) {
    console.log(`seed: project "${project.name}" already has ${existing} tasks, nothing to do`);
    return;
  }

  await prisma.task.createMany({
    data: [
      { title: 'Read the constitution', projectId: project.id, status: 'DONE' },
      { title: 'Run the quality gates', projectId: project.id, status: 'IN_PROGRESS' },
      { title: 'Ship your first feature', projectId: project.id, status: 'TODO' },
    ],
  });

  console.log(`seed: created project "${project.name}" with 3 tasks`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
