import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

async function seedTemplates() {
  const templates = [
    { dimension: 'academic' as const, ageBand: 'early_years' as const, title: 'Learn to count to 20', description: 'Count independently', category: 'numeracy', sortOrder: 1 },
    { dimension: 'academic' as const, ageBand: 'early_years' as const, title: 'Recognise letters', description: 'Identify letters', category: 'literacy', sortOrder: 2 },
    { dimension: 'academic' as const, ageBand: 'primary' as const, title: 'Read chapter books', description: 'Read independently', category: 'literacy', sortOrder: 1 },
    { dimension: 'islamic' as const, ageBand: 'primary' as const, title: 'Memorise 5 short surahs', description: 'Learn from Juz Amma', category: 'quran', sortOrder: 1 },
    { dimension: 'islamic' as const, ageBand: 'primary' as const, title: 'Learn the 5 pillars', description: 'Name and explain each', category: 'aqeedah', sortOrder: 2 },
    { dimension: 'physical' as const, ageBand: 'secondary' as const, title: 'Exercise routine', description: 'Regular workouts', category: 'fitness', sortOrder: 1 },
  ];

  for (const t of templates) {
    await prisma.goalTemplate.create({ data: t });
  }

  return templates;
}

describe('GET /api/goal-templates', () => {
  it('should return all templates when no filters', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(6);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(6);
  });

  it('should return empty array when no templates exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
    expect(res.json().pagination.total).toBe(0);
  });

  it('should not require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
    });

    expect(res.statusCode).toBe(200);
  });

  it('should filter by dimension', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?dimension=academic',
    });

    const body = res.json();
    expect(body.data).toHaveLength(3);
    body.data.forEach((t: any) => {
      expect(t.dimension).toBe('academic');
    });
  });

  it('should filter by ageBand', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?ageBand=primary',
    });

    const body = res.json();
    expect(body.data).toHaveLength(3);
    body.data.forEach((t: any) => {
      expect(t.ageBand).toBe('primary');
    });
  });

  it('should filter by both dimension and ageBand', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?dimension=islamic&ageBand=primary',
    });

    const body = res.json();
    expect(body.data).toHaveLength(2);
    body.data.forEach((t: any) => {
      expect(t.dimension).toBe('islamic');
      expect(t.ageBand).toBe('primary');
    });
  });

  it('should return templates sorted by dimension, ageBand, sortOrder', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
    });

    const body = res.json();
    const data = body.data;

    // academic should come before islamic, physical
    const dims = data.map((t: any) => t.dimension);
    const academicIdx = dims.indexOf('academic');
    const islamicIdx = dims.indexOf('islamic');
    const physicalIdx = dims.indexOf('physical');
    expect(academicIdx).toBeLessThan(islamicIdx);
    expect(islamicIdx).toBeLessThan(physicalIdx);
  });

  it('should return correct template structure', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?dimension=academic&ageBand=early_years',
    });

    const body = res.json();
    const template = body.data[0];

    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('dimension');
    expect(template).toHaveProperty('ageBand');
    expect(template).toHaveProperty('title');
    expect(template).toHaveProperty('description');
    expect(template).toHaveProperty('category');
    expect(template).toHaveProperty('sortOrder');
  });

  it('should reject invalid dimension', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?dimension=invalid',
    });

    expect(res.statusCode).toBe(422);
  });

  it('should reject invalid ageBand', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?ageBand=invalid',
    });

    expect(res.statusCode).toBe(422);
  });

  it('should default to limit 50', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
    });

    const body = res.json();
    expect(body.pagination.limit).toBe(50);
  });

  it('should respect custom page and limit', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?page=1&limit=2',
    });

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(6);
    expect(body.pagination.totalPages).toBe(3);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should return second page correctly', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?page=2&limit=2',
    });

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should return last page with hasMore false', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?page=3&limit=2',
    });

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.hasMore).toBe(false);
  });

  it('should cap limit at 100', async () => {
    await seedTemplates();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates?limit=200',
    });

    const body = res.json();
    expect(body.pagination.limit).toBe(100);
  });
});

// =============================================
// Arabic locale support for goal templates
// =============================================

async function seedTemplatesWithArabic() {
  const templates = [
    {
      dimension: 'academic' as const,
      ageBand: 'early_years' as const,
      title: 'Learn to count to 20',
      description: 'Count independently',
      titleAr: 'تعلم العد حتى ٢٠',
      descriptionAr: 'العد بشكل مستقل',
      category: 'numeracy',
      sortOrder: 1,
    },
    {
      dimension: 'academic' as const,
      ageBand: 'early_years' as const,
      title: 'Recognise letters',
      description: 'Identify letters',
      category: 'literacy',
      sortOrder: 2,
    },
  ];

  for (const t of templates) {
    await prisma.goalTemplate.create({ data: t });
  }

  return templates;
}

describe('Goal template Arabic locale support', () => {
  it('should return English fields by default', async () => {
    await seedTemplatesWithArabic();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
    });

    const body = res.json();
    expect(body.data[0].title).toBe('Learn to count to 20');
    expect(body.data[0].description).toBe('Count independently');
  });

  it('should return Arabic fields when Accept-Language is ar', async () => {
    await seedTemplatesWithArabic();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
      headers: { 'accept-language': 'ar' },
    });

    const body = res.json();
    expect(body.data[0].title).toBe('تعلم العد حتى ٢٠');
    expect(body.data[0].description).toBe('العد بشكل مستقل');
  });

  it('should fall back to English when Arabic fields are null', async () => {
    await seedTemplatesWithArabic();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
      headers: { 'accept-language': 'ar' },
    });

    const body = res.json();
    // Second template has no Arabic
    expect(body.data[1].title).toBe('Recognise letters');
    expect(body.data[1].description).toBe('Identify letters');
  });

  it('should include Vary: Accept-Language header', async () => {
    await seedTemplatesWithArabic();

    const res = await app.inject({
      method: 'GET',
      url: '/api/goal-templates',
      headers: { 'accept-language': 'ar' },
    });

    expect(res.headers['vary']).toContain('Accept-Language');
  });
});
