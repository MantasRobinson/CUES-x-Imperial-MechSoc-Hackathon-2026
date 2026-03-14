/**
 * Integration tests for POST /api/sessions (MATLAB ingestion endpoint)
 * Uses SQLite in-memory just like auth.test.js.
 */

jest.mock('../../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  return new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
});

const request   = require('supertest');
const app       = require('../../src/app');
const { sequelize, User, Badge } = require('../../src/models');
const { BADGE_CRITERIA } = require('../../src/config/constants');

let userId;
let authToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Seed the "First Step" badge so badge awarding can be tested
  await Badge.create({
    name: 'First Step',
    description: 'Complete your first session.',
    criteriaType: BADGE_CRITERIA.FIRST_SESSION,
    criteriaValue: 0,
    rarity: 'Common',
    iconEmoji: '👣',
  });

  // Register a user
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'dave@example.com', password: 'Password1!', displayName: 'Dave' });

  userId    = res.body.user.id;
  authToken = res.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/sessions', () => {
  function sessionPayload(overrides = {}) {
    return {
      userId,
      startTime:       '2026-03-14T10:00:00.000Z',
      endTime:         '2026-03-14T10:20:00.000Z',
      durationMinutes: 20,
      disturbanceCount: 0,
      noiseLevel:      'Moderate',
      ...overrides,
    };
  }

  test('creates session and returns xpEarned', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send(sessionPayload());

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('xpEarned');
    expect(res.body.xpEarned).toBe(200); // 20 min × 10 XP/min
    expect(res.body.session.userId).toBe(userId);
  });

  test('awards First Step badge on first session', async () => {
    // Create a fresh user so this is their first session
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'eve@example.com', password: 'Password1!', displayName: 'Eve' });
    const eveId = regRes.body.user.id;

    const res = await request(app)
      .post('/api/sessions')
      .send(sessionPayload({ userId: eveId }));

    expect(res.status).toBe(201);
    expect(res.body.newBadges.some((b) => b.name === 'First Step')).toBe(true);
  });

  test('applies 1.5× multiplier for sessions > 30 min', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send(sessionPayload({ durationMinutes: 31 }));

    expect(res.body.multiplier).toBe(1.5);
    expect(res.body.xpEarned).toBe(Math.round(31 * 10 * 1.5));
  });

  test('adds quiet bonus for Quiet noise level', async () => {
    const [quietRes, modRes] = await Promise.all([
      request(app).post('/api/sessions').send(sessionPayload({ noiseLevel: 'Quiet', durationMinutes: 20 })),
      request(app).post('/api/sessions').send(sessionPayload({ noiseLevel: 'Moderate', durationMinutes: 20 })),
    ]);
    expect(quietRes.body.xpEarned).toBe(modRes.body.xpEarned + 50);
  });

  test('increments streak for qualifying session', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send(sessionPayload({ durationMinutes: 20 }));

    expect(res.body.streak).toBeGreaterThanOrEqual(1);
  });

  test('updates user totalXp in database', async () => {
    const before = await User.findByPk(userId);
    const xpBefore = before.totalXp;

    await request(app).post('/api/sessions').send(sessionPayload());

    const after = await User.findByPk(userId);
    expect(after.totalXp).toBeGreaterThan(xpBefore);
  });

  test('returns 404 for unknown userId', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send(sessionPayload({ userId: '00000000-0000-0000-0000-000000000000' }));

    expect(res.status).toBe(404);
  });

  test('returns 422 for invalid noiseLevel', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send(sessionPayload({ noiseLevel: 'Silent' }));

    expect(res.status).toBe(422);
  });

  test('returns 422 when durationMinutes is missing', async () => {
    const payload = sessionPayload();
    delete payload.durationMinutes;
    const res = await request(app).post('/api/sessions').send(payload);
    expect(res.status).toBe(422);
  });
});

describe('GET /api/sessions', () => {
  test('returns paginated sessions for authenticated user', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessions');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
  });
});
