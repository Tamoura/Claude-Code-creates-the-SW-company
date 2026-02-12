import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;
let parentId: string;

const validRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima@milestonemail.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(
  name = validRegistration.name,
  email = validRegistration.email,
  password = validRegistration.password
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name, email, password },
  });
  parentId = res.json().user.id;
  return res.json().accessToken;
}

async function createChildViaDb(
  pId: string,
  name = 'Yusuf',
  dateOfBirth = '2021-06-15'
): Promise<string> {
  const child = await prisma.child.create({
    data: {
      parentId: pId,
      name,
      dateOfBirth: new Date(dateOfBirth),
    },
  });
  return child.id;
}

async function seedTestMilestones(count = 1): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const m = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'early_years',
        title: `Email test milestone ${i}`,
        description: `Description for email test milestone ${i}`,
        guidance: `Guidance for email test milestone ${i}`,
        sortOrder: i,
      },
    });
    ids.push(m.id);
  }
  return ids;
}

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

describe('Milestone achievement email notifications', () => {
  it('should send email when milestoneAlerts=true and achieved=true', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    // Enable milestoneAlerts
    await prisma.parent.update({
      where: { id: parentId },
      data: { milestoneAlerts: true },
    });

    // Spy on email service
    const emailSpy = jest.spyOn(app.email, 'send');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(200);

    // Wait a tick for fire-and-forget
    await new Promise((r) => setTimeout(r, 50));

    expect(emailSpy).toHaveBeenCalledTimes(1);
    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: validRegistration.email,
        subject: expect.stringContaining('Milestone'),
      })
    );

    // Verify email has HTML content
    const emailCall = emailSpy.mock.calls[0][0];
    expect(emailCall.html).toBeDefined();
    expect(emailCall.html.length).toBeGreaterThan(0);

    emailSpy.mockRestore();
  });

  it('should NOT send email when milestoneAlerts=false', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    // milestoneAlerts defaults to false, but let's be explicit
    await prisma.parent.update({
      where: { id: parentId },
      data: { milestoneAlerts: false },
    });

    const emailSpy = jest.spyOn(app.email, 'send');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(200);

    await new Promise((r) => setTimeout(r, 50));

    expect(emailSpy).not.toHaveBeenCalled();

    emailSpy.mockRestore();
  });

  it('should NOT send email when achieved=false', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    // Enable milestoneAlerts
    await prisma.parent.update({
      where: { id: parentId },
      data: { milestoneAlerts: true },
    });

    const emailSpy = jest.spyOn(app.email, 'send');

    // First mark as achieved (this WILL send email)
    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    await new Promise((r) => setTimeout(r, 50));

    // Reset spy to track only the next call
    emailSpy.mockClear();

    // Now unmark (achieved=false) - should NOT send email
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: false },
    });

    expect(res.statusCode).toBe(200);

    await new Promise((r) => setTimeout(r, 50));

    expect(emailSpy).not.toHaveBeenCalled();

    emailSpy.mockRestore();
  });

  it('should include child name and milestone title in email', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId, 'Ahmad');
    const milestoneIds = await seedTestMilestones(1);

    await prisma.parent.update({
      where: { id: parentId },
      data: { milestoneAlerts: true },
    });

    const emailSpy = jest.spyOn(app.email, 'send');

    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    await new Promise((r) => setTimeout(r, 50));

    const emailCall = emailSpy.mock.calls[0][0];
    expect(emailCall.html).toContain('Ahmad');
    expect(emailCall.html).toContain('Email test milestone 1');

    emailSpy.mockRestore();
  });

  it('should not block the response if email fails', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    await prisma.parent.update({
      where: { id: parentId },
      data: { milestoneAlerts: true },
    });

    // Make email.send reject
    const emailSpy = jest
      .spyOn(app.email, 'send')
      .mockRejectedValueOnce(new Error('SMTP error'));

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    // Response should still succeed despite email failure
    expect(res.statusCode).toBe(200);
    expect(res.json().achieved).toBe(true);

    await new Promise((r) => setTimeout(r, 50));

    emailSpy.mockRestore();
  });
});
