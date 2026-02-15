import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding linkedin-agent database...');

  // Create a sample trend source
  const trendSource = await prisma.trendSource.create({
    data: {
      title: 'AI Agents in Enterprise Software',
      content: 'The rise of AI agents in enterprise software is transforming how businesses operate. From automated customer support to intelligent data analysis, AI agents are becoming integral to modern business operations.',
      platform: 'linkedin',
      tags: ['#AI', '#Enterprise', '#Automation', '#AIAgents'],
    },
  });

  console.log(`Created trend source: ${trendSource.id}`);

  // Create a sample post draft
  const postDraft = await prisma.postDraft.create({
    data: {
      title: 'Why AI Agents Will Define Enterprise Software in 2026',
      content: 'The future of enterprise software is being shaped by AI agents.\n\nHere are 5 key trends I am seeing:\n\n1. Autonomous decision-making\n2. Natural language interfaces\n3. Cross-system orchestration\n4. Predictive analytics at scale\n5. Human-AI collaboration\n\nWhat trends are you seeing in your industry?\n\n#AI #Enterprise #FutureOfWork',
      contentAr: 'مستقبل برامج المؤسسات يتشكل بواسطة وكلاء الذكاء الاصطناعي.\n\nإليك 5 اتجاهات رئيسية أراها:\n\n1. اتخاذ القرارات المستقلة\n2. واجهات اللغة الطبيعية\n3. تنسيق الأنظمة المتعددة\n4. التحليلات التنبؤية على نطاق واسع\n5. التعاون بين الإنسان والذكاء الاصطناعي\n\nما الاتجاهات التي تراها في مجالك؟',
      contentEn: 'The future of enterprise software is being shaped by AI agents.\n\nHere are 5 key trends I am seeing:\n\n1. Autonomous decision-making\n2. Natural language interfaces\n3. Cross-system orchestration\n4. Predictive analytics at scale\n5. Human-AI collaboration\n\nWhat trends are you seeing in your industry?',
      format: 'carousel',
      formatReason: 'Listicle format with multiple distinct points works best as a carousel for maximum engagement',
      status: 'draft',
      tags: ['#AI', '#Enterprise', '#FutureOfWork'],
      tone: 'professional',
      targetAudience: 'tech leaders and CTOs',
      trendSourceId: trendSource.id,
    },
  });

  console.log(`Created post draft: ${postDraft.id}`);

  // Create sample carousel slides
  const slides = [
    {
      slideNumber: 1,
      headline: 'AI Agents: The Future of Enterprise',
      body: 'How intelligent agents are transforming business operations in 2026 and beyond.',
      imagePrompt: 'Futuristic enterprise office with holographic AI assistant, professional, clean blue and white color scheme, minimalist design',
    },
    {
      slideNumber: 2,
      headline: '1. Autonomous Decision-Making',
      body: 'AI agents can now analyze data and make routine decisions without human intervention, freeing up leadership for strategic thinking.',
      imagePrompt: 'Abstract visualization of AI neural network making decisions, branching paths, professional corporate style',
    },
    {
      slideNumber: 3,
      headline: '2. Natural Language Interfaces',
      body: 'Talk to your software like you talk to a colleague. NLI is making enterprise tools accessible to everyone.',
      imagePrompt: 'Person speaking naturally to a computer screen showing a conversational interface, modern office setting',
    },
    {
      slideNumber: 4,
      headline: 'Follow for More AI Insights',
      body: 'I share daily insights on AI, enterprise software, and the future of work. Hit follow and ring the bell!',
      imagePrompt: 'Professional call-to-action slide with follow button graphic, LinkedIn branding colors, clean design',
    },
  ];

  for (const slide of slides) {
    await prisma.carouselSlide.create({
      data: {
        postDraftId: postDraft.id,
        ...slide,
      },
    });
  }

  console.log(`Created ${slides.length} carousel slides`);

  // Create a sample generation log
  await prisma.generationLog.create({
    data: {
      postDraftId: postDraft.id,
      model: 'anthropic/claude-sonnet-4-5-20250929',
      provider: 'anthropic',
      promptTokens: 450,
      completionTokens: 820,
      costUsd: 0.0138,
      durationMs: 3200,
      taskType: 'writing',
    },
  });

  console.log('Created sample generation log');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
