/**
 * Integration tests for /api/auth
 *
 * Uses an in-process SQLite database (sequelize dialect 'sqlite', :memory:)
 * so no real PostgreSQL connection is needed in CI.
 * The test overrides the sequelize instance before requiring the app.
 */

// ── Override DB to SQLite in-memory ───────────────────────────────────────────
jest.mock('../../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  return new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
});

const request  = require('supertest');
const app      = require('../../src/app');
const { sequelize } = require('../../src/models');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/auth/register', () => {
  test('creates a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'Password1!', displayName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('rejects duplicate email with 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'Password1!', displayName: 'Dup' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'Password1!', displayName: 'Dup2' });

    expect(res.status).toBe(409);
  });

  test('rejects short password with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: '123', displayName: 'Short' });

    expect(res.status).toBe(422);
  });

  test('rejects invalid email with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Password1!', displayName: 'Bad' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'Password1!', displayName: 'Bob' });
  });

  test('returns token with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'WrongPass!' });

    expect(res.status).toBe(401);
  });

  test('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1!' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'carol@example.com', password: 'Password1!', displayName: 'Carol' });
    token = res.body.token;
  });

  test('returns authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('carol@example.com');
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
});
