import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed catalog (C-2, FR-004). A small, realistic university subject catalog
 * across a few departments. Seed subjects are read-only (isSeed=true,
 * ownerStudentId=null, BR-005). Idempotent: existing seed subjects are cleared
 * and re-created. Student-owned subjects (isSeed=false) are never touched.
 */
const SEED_TERM = '2026-S1';

const SUBJECTS: Array<{
  code: string;
  name: string;
  credits: number;
  workload: string;
  prerequisites: string;
  description: string;
}> = [
  // --- Computer Science (CS) ---
  {
    code: 'CS101',
    name: 'Introduction to Programming',
    credits: 6,
    workload: '8 hrs/week',
    prerequisites: '',
    description:
      'Fundamentals of programming in Python: variables, control flow, functions, and basic data structures.',
  },
  {
    code: 'CS201',
    name: 'Data Structures & Algorithms',
    credits: 6,
    workload: '10 hrs/week',
    prerequisites: 'CS101',
    description:
      'Arrays, linked lists, trees, graphs, sorting and searching, and algorithmic complexity analysis.',
  },
  {
    code: 'CS210',
    name: 'Databases & SQL',
    credits: 6,
    workload: '8 hrs/week',
    prerequisites: 'CS101',
    description:
      'Relational modelling, normalisation, SQL querying, transactions, and indexing fundamentals.',
  },
  {
    code: 'CS301',
    name: 'Operating Systems',
    credits: 6,
    workload: '10 hrs/week',
    prerequisites: 'CS201',
    description:
      'Processes, threads, scheduling, memory management, concurrency, and file systems.',
  },
  {
    code: 'CS320',
    name: 'Web Application Development',
    credits: 6,
    workload: '9 hrs/week',
    prerequisites: 'CS201, CS210',
    description:
      'Building full-stack web applications: HTTP, REST APIs, frontend frameworks, and deployment.',
  },
  // --- Mathematics (MATH) ---
  {
    code: 'MATH101',
    name: 'Calculus I',
    credits: 6,
    workload: '7 hrs/week',
    prerequisites: '',
    description:
      'Limits, derivatives, integrals, and the fundamental theorem of calculus with applications.',
  },
  {
    code: 'MATH201',
    name: 'Linear Algebra',
    credits: 6,
    workload: '7 hrs/week',
    prerequisites: 'MATH101',
    description:
      'Vectors, matrices, linear transformations, eigenvalues, and vector spaces.',
  },
  {
    code: 'MATH210',
    name: 'Probability & Statistics',
    credits: 6,
    workload: '7 hrs/week',
    prerequisites: 'MATH101',
    description:
      'Probability theory, distributions, statistical inference, hypothesis testing, and regression.',
  },
  // --- Physics (PHYS) ---
  {
    code: 'PHYS101',
    name: 'Physics I: Mechanics',
    credits: 6,
    workload: '8 hrs/week',
    prerequisites: 'MATH101',
    description:
      'Kinematics, Newtonian mechanics, energy, momentum, and rotational dynamics.',
  },
  // --- Business (BUS) ---
  {
    code: 'BUS101',
    name: 'Principles of Management',
    credits: 6,
    workload: '6 hrs/week',
    prerequisites: '',
    description:
      'Foundations of management: planning, organising, leading, and controlling in organisations.',
  },
  {
    code: 'BUS210',
    name: 'Financial Accounting',
    credits: 6,
    workload: '7 hrs/week',
    prerequisites: 'BUS101',
    description:
      'Recording transactions, financial statements, and the accounting cycle for decision-making.',
  },
  // --- English (ENG) ---
  {
    code: 'ENG101',
    name: 'Academic Writing & Communication',
    credits: 6,
    workload: '5 hrs/week',
    prerequisites: '',
    description:
      'Critical reading, essay structure, argumentation, and academic referencing conventions.',
  },
];

async function main(): Promise<void> {
  // Idempotent: clear existing seed catalog, leave student-owned subjects alone.
  await prisma.subject.deleteMany({ where: { isSeed: true } });

  await prisma.subject.createMany({
    data: SUBJECTS.map((s) => ({
      code: s.code,
      name: s.name,
      credits: s.credits,
      workload: s.workload,
      prerequisites: s.prerequisites,
      description: s.description,
      term: SEED_TERM,
      isSeed: true,
      ownerStudentId: null,
    })),
  });

  const total = await prisma.subject.count({ where: { isSeed: true } });
  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${total} seed subjects in catalog.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
