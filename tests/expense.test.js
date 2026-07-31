const path = require('path');
const fs = require('fs/promises');

// Point the app at an isolated test data file BEFORE requiring app,
// so these tests never touch src/data/expenses.json.
const TEST_DATA_FILE = path.join(__dirname, 'test-expenses.json');
process.env.NODE_ENV = 'test';
process.env.DATA_FILE_PATH = TEST_DATA_FILE;

const request = require('supertest');
const app = require('../src/app');

const validExpense = {
  title: 'Groceries',
  amount: 250.75,
  category: 'Food',
  date: '2026-07-30',
};

beforeEach(async () => {
  // Reset the data file to a clean slate before every test.
  await fs.writeFile(TEST_DATA_FILE, '[]', 'utf-8');
});

afterAll(async () => {
  await fs.rm(TEST_DATA_FILE, { force: true });
});

describe('POST /api/expenses', () => {
  it('creates a new expense and returns 201 with the created resource', async () => {
    const res = await request(app).post('/api/expenses').send(validExpense);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title: 'Groceries',
      amount: 250.75,
      category: 'Food',
      date: '2026-07-30',
    });
    expect(res.body.data.id).toEqual(expect.any(String));
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/expenses').send({ title: 'Incomplete' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['amount', 'category', 'date']));
  });

  it('returns 400 when amount is not greater than 0', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ ...validExpense, amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'amount')).toBe(true);
  });

  it('returns 400 when date is not a valid ISO date', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ ...validExpense, date: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'date')).toBe(true);
  });
});

describe('GET /api/expenses', () => {
  it('returns all expenses', async () => {
    await request(app).post('/api/expenses').send(validExpense);
    await request(app)
      .post('/api/expenses')
      .send({ title: 'Flight', amount: 400, category: 'Travel', date: '2026-07-15' });

    const res = await request(app).get('/api/expenses');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });

  it('filters expenses by category (case-insensitive)', async () => {
    await request(app).post('/api/expenses').send(validExpense); // Food
    await request(app)
      .post('/api/expenses')
      .send({ title: 'Flight', amount: 400, category: 'Travel', date: '2026-07-15' });

    const res = await request(app).get('/api/expenses').query({ category: 'food' });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].category).toBe('Food');
  });
});

describe('GET /api/expenses/summary', () => {
  it('returns total spend and spend broken down by category', async () => {
    await request(app).post('/api/expenses').send({ title: 'Groceries', amount: 500, category: 'Food', date: '2026-07-01' });
    await request(app).post('/api/expenses').send({ title: 'Flight', amount: 400, category: 'Travel', date: '2026-07-02' });
    await request(app).post('/api/expenses').send({ title: 'Shoes', amount: 300, category: 'Shopping', date: '2026-07-03' });

    const res = await request(app).get('/api/expenses/summary');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 1200,
      byCategory: {
        Food: 500,
        Travel: 400,
        Shopping: 300,
      },
    });
  });

  it('returns zeroed summary when there are no expenses', async () => {
    const res = await request(app).get('/api/expenses/summary');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 0, byCategory: {} });
  });
});

describe('DELETE /api/expenses/:id', () => {
  it('deletes an existing expense', async () => {
    const createRes = await request(app).post('/api/expenses').send(validExpense);
    const { id } = createRes.body.data;

    const deleteRes = await request(app).delete(`/api/expenses/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.id).toBe(id);

    const listRes = await request(app).get('/api/expenses');
    expect(listRes.body.data.find((e) => e.id === id)).toBeUndefined();
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).delete('/api/expenses/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('returns 404 when deleting a well-formed id that does not exist', async () => {
    const res = await request(app).delete('/api/expenses/11111111-1111-4111-8111-111111111111');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
