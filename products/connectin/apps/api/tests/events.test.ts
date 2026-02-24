import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from './helpers';

let app: FastifyInstance;
let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  alice = await createTestUser(app, { displayName: 'Alice' });
  bob = await createTestUser(app, { displayName: 'Bob' });
});

describe('Events', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  it('should create an event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'MENA Tech Meetup',
        description: 'Monthly tech meetup for Arab professionals',
        type: 'VIRTUAL',
        startsAt: futureDate,
        location: 'Zoom',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('MENA Tech Meetup');
    expect(body.data.type).toBe('VIRTUAL');
  });

  it('should list events', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Event A',
        type: 'VIRTUAL',
        startsAt: futureDate,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should get event details with attendee count', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Career Fair',
        type: 'IN_PERSON',
        startsAt: futureDate,
        location: 'Riyadh',
      },
    });
    const eventId = JSON.parse(createRes.body).data.id;

    // Bob registers
    await app.inject({
      method: 'POST',
      url: `/api/v1/events/${eventId}/register`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('Career Fair');
    expect(body.data.attendeeCount).toBe(1);
  });

  it('should register and unregister for an event', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Workshop',
        type: 'VIRTUAL',
        startsAt: futureDate,
      },
    });
    const eventId = JSON.parse(createRes.body).data.id;

    // Register
    const regRes = await app.inject({
      method: 'POST',
      url: `/api/v1/events/${eventId}/register`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });
    expect(regRes.statusCode).toBe(201);

    // Unregister
    const unregRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/events/${eventId}/register`,
      headers: authHeaders(bob.accessToken),
    });
    expect(unregRes.statusCode).toBe(200);
  });

  it('should list event attendees', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Networking Night',
        type: 'IN_PERSON',
        startsAt: futureDate,
        location: 'Dubai',
      },
    });
    const eventId = JSON.parse(createRes.body).data.id;

    await app.inject({
      method: 'POST',
      url: `/api/v1/events/${eventId}/register`,
      headers: authHeaders(bob.accessToken),
      payload: {},
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}/attendees`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });

  it('should allow creator to cancel event', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Cancelable Event',
        type: 'VIRTUAL',
        startsAt: futureDate,
      },
    });
    const eventId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/events/${eventId}`,
      headers: authHeaders(alice.accessToken),
      payload: { status: 'CANCELLED' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('CANCELLED');
  });

  it('should reject non-creator cancel', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Protected Event',
        type: 'VIRTUAL',
        startsAt: futureDate,
      },
    });
    const eventId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/events/${eventId}`,
      headers: authHeaders(bob.accessToken),
      payload: { status: 'CANCELLED' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events',
    });
    expect(res.statusCode).toBe(401);
  });
});
