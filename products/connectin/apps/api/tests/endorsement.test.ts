import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  getPrisma,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Endorsement Module', () => {
  describe('POST /api/v1/endorsements', () => {
    it('endorses a skill — 201', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'endorser@example.com',
        displayName: 'Endorser',
      });
      const user2 = await createTestUser(app, {
        email: 'skilled@example.com',
        displayName: 'Skilled User',
      });

      const db = getPrisma();
      const skill = await db.skill.create({
        data: { nameEn: 'TypeScript' },
      });
      const profile = await db.profile.findUnique({
        where: { userId: user2.id },
      });
      const profileSkill = await db.profileSkill.create({
        data: {
          profileId: profile!.id,
          skillId: skill.id,
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/endorsements',
        headers: authHeaders(user1.accessToken),
        payload: { profileSkillId: profileSkill.id },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.endorsed).toBe(true);
      expect(body.data.endorsementCount).toBe(1);
    });

    it('prevents self-endorsement — 422', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'self@example.com',
        displayName: 'Self Endorser',
      });

      const db = getPrisma();
      const skill = await db.skill.create({
        data: { nameEn: 'Self Skill' },
      });
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });
      const profileSkill = await db.profileSkill.create({
        data: {
          profileId: profile!.id,
          skillId: skill.id,
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/endorsements',
        headers: authHeaders(user.accessToken),
        payload: { profileSkillId: profileSkill.id },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    it('endorsement is idempotent — 201, count stays same',
      async () => {
        const app = await getApp();
        const user1 = await createTestUser(app, {
          email: 'idem-endorser@example.com',
        });
        const user2 = await createTestUser(app, {
          email: 'idem-skilled@example.com',
        });

        const db = getPrisma();
        const skill = await db.skill.create({
          data: { nameEn: 'Idempotent Skill' },
        });
        const profile = await db.profile.findUnique({
          where: { userId: user2.id },
        });
        const profileSkill = await db.profileSkill.create({
          data: {
            profileId: profile!.id,
            skillId: skill.id,
          },
        });

        // First endorsement
        await app.inject({
          method: 'POST',
          url: '/api/v1/endorsements',
          headers: authHeaders(user1.accessToken),
          payload: { profileSkillId: profileSkill.id },
        });

        // Second endorsement (same user, same skill)
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/endorsements',
          headers: authHeaders(user1.accessToken),
          payload: { profileSkillId: profileSkill.id },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.data.endorsed).toBe(true);
        expect(body.data.endorsementCount).toBe(1);
      }
    );

    it('rejects endorsement of non-existent skill — 404',
      async () => {
        const app = await getApp();
        const user = await createTestUser(app, {
          email: 'no-skill@example.com',
        });

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/endorsements',
          headers: authHeaders(user.accessToken),
          payload: {
            profileSkillId:
              '00000000-0000-0000-0000-000000000000',
          },
        });

        expect(res.statusCode).toBe(404);
      }
    );

    it('rejects unauthenticated request — 401', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/endorsements',
        payload: {
          profileSkillId:
            '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/endorsements/:profileSkillId', () => {
    it('removes an endorsement — 200', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'remove-endorser@example.com',
      });
      const user2 = await createTestUser(app, {
        email: 'remove-skilled@example.com',
      });

      const db = getPrisma();
      const skill = await db.skill.create({
        data: { nameEn: 'Removable Skill' },
      });
      const profile = await db.profile.findUnique({
        where: { userId: user2.id },
      });
      const profileSkill = await db.profileSkill.create({
        data: {
          profileId: profile!.id,
          skillId: skill.id,
        },
      });

      // Endorse first
      await app.inject({
        method: 'POST',
        url: '/api/v1/endorsements',
        headers: authHeaders(user1.accessToken),
        payload: { profileSkillId: profileSkill.id },
      });

      // Remove endorsement
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/endorsements/${profileSkill.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.endorsed).toBe(false);
      expect(body.data.endorsementCount).toBe(0);
    });

    it('removing non-existent endorsement is idempotent — 200',
      async () => {
        const app = await getApp();
        const user1 = await createTestUser(app, {
          email: 'idem-remove@example.com',
        });
        const user2 = await createTestUser(app, {
          email: 'idem-remove-skilled@example.com',
        });

        const db = getPrisma();
        const skill = await db.skill.create({
          data: { nameEn: 'Never Endorsed Skill' },
        });
        const profile = await db.profile.findUnique({
          where: { userId: user2.id },
        });
        const profileSkill = await db.profileSkill.create({
          data: {
            profileId: profile!.id,
            skillId: skill.id,
          },
        });

        const res = await app.inject({
          method: 'DELETE',
          url: `/api/v1/endorsements/${profileSkill.id}`,
          headers: authHeaders(user1.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.endorsed).toBe(false);
        expect(body.data.endorsementCount).toBe(0);
      }
    );
  });

  describe('GET /api/v1/endorsements/skill/:profileSkillId',
    () => {
      it('lists endorsers for a skill', async () => {
        const app = await getApp();
        const user1 = await createTestUser(app, {
          email: 'list-endorser1@example.com',
          displayName: 'Endorser One',
        });
        const user2 = await createTestUser(app, {
          email: 'list-skilled@example.com',
          displayName: 'Skilled Person',
        });

        const db = getPrisma();
        const skill = await db.skill.create({
          data: { nameEn: 'Listable Skill' },
        });
        const profile = await db.profile.findUnique({
          where: { userId: user2.id },
        });
        const profileSkill = await db.profileSkill.create({
          data: {
            profileId: profile!.id,
            skillId: skill.id,
          },
        });

        // user1 endorses the skill
        await app.inject({
          method: 'POST',
          url: '/api/v1/endorsements',
          headers: authHeaders(user1.accessToken),
          payload: { profileSkillId: profileSkill.id },
        });

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/endorsements/skill/${profileSkill.id}`,
          headers: authHeaders(user1.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
        expect(body.data.endorsers).toHaveLength(1);
        expect(body.data.endorsers[0].displayName).toBe(
          'Endorser One'
        );
      });
    }
  );

  describe('GET /api/v1/endorsements/by-me', () => {
    it('lists endorsements made by the current user',
      async () => {
        const app = await getApp();
        const user1 = await createTestUser(app, {
          email: 'my-endorser@example.com',
          displayName: 'My Endorser',
        });
        const user2 = await createTestUser(app, {
          email: 'my-skilled@example.com',
          displayName: 'Skilled Owner',
        });

        const db = getPrisma();
        const skill = await db.skill.create({
          data: { nameEn: 'My Endorsed Skill' },
        });
        const profile = await db.profile.findUnique({
          where: { userId: user2.id },
        });
        const profileSkill = await db.profileSkill.create({
          data: {
            profileId: profile!.id,
            skillId: skill.id,
          },
        });

        // user1 endorses the skill
        await app.inject({
          method: 'POST',
          url: '/api/v1/endorsements',
          headers: authHeaders(user1.accessToken),
          payload: { profileSkillId: profileSkill.id },
        });

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/endorsements/by-me',
          headers: authHeaders(user1.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
        expect(body.data.endorsements).toHaveLength(1);
        expect(body.data.endorsements[0].skillName).toBe(
          'My Endorsed Skill'
        );
        expect(body.data.endorsements[0].profileOwnerName).toBe(
          'Skilled Owner'
        );
      }
    );
  });
});
