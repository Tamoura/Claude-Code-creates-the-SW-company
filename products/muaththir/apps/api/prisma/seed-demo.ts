import { PrismaClient, Dimension, Sentiment } from '@prisma/client';
import { hash } from 'bcrypt';
import { subDays, addMonths } from 'date-fns';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helper: spread dates over the last N days in a roughly even distribution
// ---------------------------------------------------------------------------
function spreadDates(count: number, overDays: number): Date[] {
  const now = new Date();
  const interval = Math.floor(overDays / count);
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = overDays - i * interval - Math.floor(Math.random() * 3);
    return subDays(now, Math.max(daysAgo, 0));
  });
}

// ---------------------------------------------------------------------------
// Observation data — 6 per dimension, 36 total
// ---------------------------------------------------------------------------
interface ObservationSeed {
  dimension: Dimension;
  content: string;
  sentiment: Sentiment;
  tags: string[];
}

const observationData: ObservationSeed[] = [
  // --- Academic (6) ---
  {
    dimension: 'academic',
    content: 'Aisha completed her reading assignment ahead of schedule and helped classmates',
    sentiment: 'positive',
    tags: ['reading', 'school'],
  },
  {
    dimension: 'academic',
    content: 'Scored 95% on math test — strong number sense',
    sentiment: 'positive',
    tags: ['math', 'test'],
  },
  {
    dimension: 'academic',
    content: 'Working on spelling — progressing steadily',
    sentiment: 'neutral',
    tags: ['spelling', 'school'],
  },
  {
    dimension: 'academic',
    content: 'Enjoys science experiments, asks great questions',
    sentiment: 'positive',
    tags: ['science', 'curiosity'],
  },
  {
    dimension: 'academic',
    content: 'Homework consistency improving week by week',
    sentiment: 'neutral',
    tags: ['homework', 'consistency'],
  },
  {
    dimension: 'academic',
    content: 'Teacher praised her presentation skills in show-and-tell',
    sentiment: 'positive',
    tags: ['presentation', 'school', 'confidence'],
  },

  // --- Social-Emotional (6) ---
  {
    dimension: 'social_emotional',
    content: 'Showed empathy when friend was upset — comforted them unprompted',
    sentiment: 'positive',
    tags: ['empathy', 'friendship'],
  },
  {
    dimension: 'social_emotional',
    content: 'Made a new friend at the playground today',
    sentiment: 'positive',
    tags: ['friendship', 'social'],
  },
  {
    dimension: 'social_emotional',
    content: 'Learning to share toys with younger sibling — some struggles',
    sentiment: 'neutral',
    tags: ['sharing', 'sibling'],
  },
  {
    dimension: 'social_emotional',
    content: 'Had a meltdown after losing a board game — working on handling disappointment',
    sentiment: 'needs_attention',
    tags: ['emotional-regulation', 'resilience'],
  },
  {
    dimension: 'social_emotional',
    content: 'Resolved a conflict with classmate through talking it out',
    sentiment: 'positive',
    tags: ['conflict-resolution', 'school'],
  },
  {
    dimension: 'social_emotional',
    content: 'Expressed feelings clearly when upset about schedule change',
    sentiment: 'positive',
    tags: ['communication', 'emotional-awareness'],
  },

  // --- Behavioural (6) ---
  {
    dimension: 'behavioural',
    content: 'Followed all classroom rules today without reminders',
    sentiment: 'positive',
    tags: ['discipline', 'school'],
  },
  {
    dimension: 'behavioural',
    content: 'Completed chores without being asked — tidied her room',
    sentiment: 'positive',
    tags: ['responsibility', 'home'],
  },
  {
    dimension: 'behavioural',
    content: 'Needed two reminders to get ready for school on time',
    sentiment: 'neutral',
    tags: ['morning-routine', 'time-management'],
  },
  {
    dimension: 'behavioural',
    content: 'Showed patience waiting in queue at the grocery store',
    sentiment: 'positive',
    tags: ['patience', 'public'],
  },
  {
    dimension: 'behavioural',
    content: 'Working on reducing screen time — made progress this week',
    sentiment: 'neutral',
    tags: ['screen-time', 'self-control'],
  },
  {
    dimension: 'behavioural',
    content: 'Apologised immediately after accidentally bumping into someone',
    sentiment: 'positive',
    tags: ['manners', 'accountability'],
  },

  // --- Aspirational (6) ---
  {
    dimension: 'aspirational',
    content: 'Told us she wants to be a doctor to help people — very motivated',
    sentiment: 'positive',
    tags: ['career', 'motivation'],
  },
  {
    dimension: 'aspirational',
    content: 'Started a mini garden project and plans it carefully',
    sentiment: 'positive',
    tags: ['project', 'planning'],
  },
  {
    dimension: 'aspirational',
    content: 'Exploring different hobbies — tried painting for the first time',
    sentiment: 'neutral',
    tags: ['hobbies', 'art'],
  },
  {
    dimension: 'aspirational',
    content: 'Asked to visit the science museum again — loves learning',
    sentiment: 'positive',
    tags: ['learning', 'curiosity'],
  },
  {
    dimension: 'aspirational',
    content: 'Thinking about joining the school choir',
    sentiment: 'neutral',
    tags: ['music', 'school'],
  },
  {
    dimension: 'aspirational',
    content: 'Set a personal goal to read 2 books this month — already on track',
    sentiment: 'positive',
    tags: ['goal-setting', 'reading'],
  },

  // --- Islamic (6) ---
  {
    dimension: 'islamic',
    content: 'Memorised Surah Al-Fatiha perfectly and recites with confidence',
    sentiment: 'positive',
    tags: ['quran', 'memorisation'],
  },
  {
    dimension: 'islamic',
    content: 'Prays all five daily prayers with family — rarely misses',
    sentiment: 'positive',
    tags: ['prayer', 'family'],
  },
  {
    dimension: 'islamic',
    content: 'Learning new duas — can now say dua before eating independently',
    sentiment: 'neutral',
    tags: ['dua', 'daily-practice'],
  },
  {
    dimension: 'islamic',
    content: 'Asked thoughtful question about Ramadan — showed genuine interest',
    sentiment: 'positive',
    tags: ['ramadan', 'curiosity'],
  },
  {
    dimension: 'islamic',
    content: 'Started Quran reading practice — recognising more letters',
    sentiment: 'neutral',
    tags: ['quran', 'reading'],
  },
  {
    dimension: 'islamic',
    content: 'Shared her snack at school saying \'sharing is sadaqah\'',
    sentiment: 'positive',
    tags: ['sadaqah', 'character'],
  },

  // --- Physical (6) ---
  {
    dimension: 'physical',
    content: 'Ran the full distance in PE class and was proud of herself',
    sentiment: 'positive',
    tags: ['fitness', 'school'],
  },
  {
    dimension: 'physical',
    content: 'Learned to ride a bike without training wheels this weekend',
    sentiment: 'positive',
    tags: ['cycling', 'milestone'],
  },
  {
    dimension: 'physical',
    content: 'Eating more vegetables after we started a food chart',
    sentiment: 'neutral',
    tags: ['nutrition', 'healthy-eating'],
  },
  {
    dimension: 'physical',
    content: 'Swimming lessons going well — can now float independently',
    sentiment: 'positive',
    tags: ['swimming', 'progress'],
  },
  {
    dimension: 'physical',
    content: 'Has been sleeping later than usual — adjusting bedtime routine',
    sentiment: 'needs_attention',
    tags: ['sleep', 'routine'],
  },
  {
    dimension: 'physical',
    content: 'Very active at the park — climbing, running, playing with friends',
    sentiment: 'positive',
    tags: ['outdoor-play', 'activity'],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seedDemoChild() {
  const now = new Date();

  // 1. Create or find demo parent (idempotent via upsert)
  const passwordHash = await hash('DemoPassword123!', 10);
  const parent = await prisma.parent.upsert({
    where: { email: 'demo@muaththir.app' },
    create: {
      email: 'demo@muaththir.app',
      name: 'Demo Parent',
      passwordHash,
    },
    update: {
      name: 'Demo Parent',
      passwordHash,
    },
  });
  console.log(`Parent ready: ${parent.email} (${parent.id})`);

  // 2. Create demo child — upsert by checking existing demo children
  //    Delete any previous demo child for this parent to keep idempotent
  const existingDemo = await prisma.child.findFirst({
    where: { parentId: parent.id, isDemo: true },
  });

  if (existingDemo) {
    // Cascade deletes observations, milestones, goals, scoreCache
    await prisma.child.delete({ where: { id: existingDemo.id } });
    console.log(`Removed previous demo child: ${existingDemo.name}`);
  }

  const dateOfBirth = new Date(
    now.getFullYear() - 7,
    now.getMonth(),
    now.getDate(),
  );

  const child = await prisma.child.create({
    data: {
      parentId: parent.id,
      name: 'Aisha',
      dateOfBirth,
      gender: 'female',
      isDemo: true,
    },
  });
  console.log(`Demo child created: ${child.name} (${child.id})`);

  // 3. Create observations — spread over last 60 days
  const obsDates = spreadDates(observationData.length, 60);
  const observations = await Promise.all(
    observationData.map((obs, i) =>
      prisma.observation.create({
        data: {
          childId: child.id,
          dimension: obs.dimension,
          content: obs.content,
          sentiment: obs.sentiment,
          observedAt: obsDates[i],
          tags: obs.tags,
        },
      }),
    ),
  );
  console.log(`Created ${observations.length} observations`);

  // 4. Find primary-band milestones and mark ~65% as achieved
  const primaryMilestones = await prisma.milestoneDefinition.findMany({
    where: { ageBand: 'primary' },
    orderBy: [{ dimension: 'asc' }, { sortOrder: 'asc' }],
  });

  if (primaryMilestones.length === 0) {
    console.warn(
      'WARNING: No primary-band milestones found. Run the main seed first: tsx prisma/seed.ts',
    );
  } else {
    // Pick ~65% to mark as achieved, spread across dimensions evenly
    // For each dimension's milestones, mark the first ~65%
    const achievedCount = Math.round(primaryMilestones.length * 0.65);
    const byDimension = new Map<string, typeof primaryMilestones>();
    for (const m of primaryMilestones) {
      const list = byDimension.get(m.dimension) || [];
      list.push(m);
      byDimension.set(m.dimension, list);
    }

    let totalAchieved = 0;
    const milestonePromises: Promise<unknown>[] = [];
    const achievedDates = spreadDates(achievedCount, 90);
    let achievedIdx = 0;

    for (const [, dimMilestones] of Array.from(byDimension.entries())) {
      const dimAchieveCount = Math.round(dimMilestones.length * 0.65);
      for (let i = 0; i < dimMilestones.length; i++) {
        const m = dimMilestones[i];
        const isAchieved = i < dimAchieveCount;
        milestonePromises.push(
          prisma.childMilestone.create({
            data: {
              childId: child.id,
              milestoneId: m.id,
              achieved: isAchieved,
              achievedAt: isAchieved
                ? achievedDates[achievedIdx++ % achievedDates.length]
                : null,
            },
          }),
        );
        if (isAchieved) totalAchieved++;
      }
    }

    await Promise.all(milestonePromises);
    console.log(
      `Created ${primaryMilestones.length} child milestones (${totalAchieved} achieved, ${primaryMilestones.length - totalAchieved} pending)`,
    );
  }

  // 5. Create goals (3 active)
  const goals = await Promise.all([
    prisma.goal.create({
      data: {
        childId: child.id,
        dimension: 'academic',
        title: 'Read 20 books this year',
        description:
          'Aisha loves reading and wants to challenge herself to finish 20 books by the end of the year.',
        targetDate: addMonths(now, 6),
        status: 'active',
      },
    }),
    prisma.goal.create({
      data: {
        childId: child.id,
        dimension: 'islamic',
        title: 'Memorise 5 short surahs',
        description:
          'Building on her Al-Fatiha memorisation, Aisha aims to learn Al-Ikhlas, Al-Falaq, An-Nas, Al-Kawthar, and Al-Asr.',
        targetDate: addMonths(now, 3),
        status: 'active',
      },
    }),
    prisma.goal.create({
      data: {
        childId: child.id,
        dimension: 'physical',
        title: 'Learn to swim 25 metres',
        description:
          'Aisha can float independently and is working towards swimming a full 25-metre length at her local pool.',
        targetDate: addMonths(now, 2),
        status: 'active',
      },
    }),
  ]);
  console.log(`Created ${goals.length} goals`);

  // 6. Mark score cache as stale so scores are recalculated on first view
  const dimensions: Dimension[] = [
    'academic',
    'social_emotional',
    'behavioural',
    'aspirational',
    'islamic',
    'physical',
  ];

  await Promise.all(
    dimensions.map((dimension) =>
      prisma.scoreCache.upsert({
        where: {
          childId_dimension: {
            childId: child.id,
            dimension,
          },
        },
        create: {
          childId: child.id,
          dimension,
          score: 0,
          stale: true,
        },
        update: {
          stale: true,
        },
      }),
    ),
  );
  console.log('Score cache marked as stale for all dimensions');

  console.log('\n--- Demo child seeded successfully! ---');
  console.log(`  Parent: demo@muaththir.app / DemoPassword123!`);
  console.log(`  Child:  Aisha (7 years old, primary band)`);
  console.log(`  Data:   36 observations, ~39 milestones achieved, 3 goals`);
}

seedDemoChild()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
