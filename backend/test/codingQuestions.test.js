import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createFakePrisma() {
  let records = [];
  let nextId = 1;

  function dateKey(date) {
    return new Date(date).toISOString().slice(0, 10);
  }
  function matches(record, where = {}) {
    if (where.type && record.type !== where.type) return false;
    if (where.date instanceof Date && dateKey(record.date) !== dateKey(where.date)) return false;
    if (where.date && !(where.date instanceof Date)) {
      if (where.date.gte && dateKey(record.date) < dateKey(where.date.gte)) return false;
      if (where.date.lte && dateKey(record.date) > dateKey(where.date.lte)) return false;
    }
    return true;
  }
  function copy(value) {
    return structuredClone(value);
  }

  const codingQuestion = {
    async create({ data }) {
      const now = new Date();
      const record = {
        id: `c${String(nextId++).padStart(24, '0')}`,
        ...copy(data),
        createdAt: now,
        updatedAt: now,
      };
      records.push(record);
      return copy(record);
    },
    async findMany({ where, skip, take, orderBy }) {
      let result = records.filter((record) => matches(record, where));
      for (const order of [...orderBy].reverse()) {
        const [field, direction] = Object.entries(order)[0];
        result = result.sort((a, b) => {
          const left = a[field] instanceof Date ? a[field].getTime() : a[field];
          const right = b[field] instanceof Date ? b[field].getTime() : b[field];
          return direction === 'desc' ? (right > left ? 1 : right < left ? -1 : 0) : (left > right ? 1 : left < right ? -1 : 0);
        });
      }
      return copy(result.slice(skip, skip + take));
    },
    async findUnique({ where }) {
      return copy(records.find((record) => record.id === where.id) || null);
    },
    async count({ where } = {}) {
      return records.filter((record) => matches(record, where)).length;
    },
    async update({ where, data }) {
      const index = records.findIndex((record) => record.id === where.id);
      if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' });
      records[index] = { ...records[index], ...copy(data), updatedAt: new Date() };
      return copy(records[index]);
    },
    async delete({ where }) {
      const index = records.findIndex((record) => record.id === where.id);
      if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' });
      return copy(records.splice(index, 1)[0]);
    },
    async groupBy({ by }) {
      const field = by[0];
      const counts = new Map();
      for (const record of records) {
        const key = field === 'date' ? dateKey(record.date) : record[field];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return [...counts.entries()].map(([key, count]) => ({
        [field]: field === 'date' ? new Date(`${key}T00:00:00.000Z`) : key,
        _count: { _all: count },
      }));
    },
    async $queryRaw() {
      return [{ '?column?': 1 }];
    },
    reset() {
      records = [];
      nextId = 1;
    },
  };
  return { codingQuestion, $queryRaw: codingQuestion.$queryRaw };
}

const validQuestion = {
  date: '2026-10-18',
  type: 'DSA',
  questionContent: 'Find the second-largest element',
  expectedOutput: 'Input: [4, 8, 2, 6]; Output: 6',
};

describe('Coding Questions API', () => {
  const prisma = createFakePrisma();
  let server;
  let baseUrl;

  before(async () => {
    server = createApp({ corsOrigin: 'http://localhost:5173', prisma }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  beforeEach(() => prisma.codingQuestion.reset());

  async function request(path, { method = 'GET', body, rawBody } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body || rawBody ? { 'content-type': 'application/json' } : undefined,
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const data = await response.json();
    return { response, data };
  }

  async function add(question) {
    const { response, data } = await request('/coding-questions', { method: 'POST', body: question });
    assert.equal(response.status, 201, JSON.stringify(data));
    return data.data.question;
  }

  it('creates a question and returns the persisted record', async () => {
    const { response, data } = await request('/coding-questions', { method: 'POST', body: validQuestion });
    assert.equal(response.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.question.type, 'DSA');
    assert.equal(new Date(data.data.question.date).toISOString().slice(0, 10), validQuestion.date);
    const listed = await request('/coding-questions');
    assert.equal(listed.data.data.pagination.total, 1);
    assert.equal(listed.data.data.items[0].id, data.data.question.id);
  });

  it('rejects missing fields, invalid enums, invalid dates, and empty text', async () => {
    for (const body of [
      { type: 'DSA' },
      { ...validQuestion, type: 'PYTHON' },
      { ...validQuestion, date: '2026-02-30' },
      { ...validQuestion, questionContent: '  ' },
    ]) {
      const { response, data } = await request('/coding-questions', { method: 'POST', body });
      assert.equal(response.status, 400);
      assert.equal(data.success, false);
      assert.ok(data.error.message);
    }
  });

  it('filters by type and date in the list response', async () => {
    await add(validQuestion);
    await add({ ...validQuestion, type: 'INTERVIEW' });
    await add({ ...validQuestion, date: '2026-10-19' });

    const { response, data } = await request('/coding-questions?type=DSA&date=2026-10-18');
    assert.equal(response.status, 200);
    assert.equal(data.data.pagination.total, 1);
    assert.equal(data.data.items[0].type, 'DSA');
  });

  it('paginates with stable total metadata', async () => {
    await add(validQuestion);
    await add({ ...validQuestion, date: '2026-10-19' });
    await add({ ...validQuestion, date: '2026-10-20' });
    const { response, data } = await request('/coding-questions?page=2&pageSize=2');
    assert.equal(response.status, 200);
    assert.deepEqual(data.data.pagination, { page: 2, pageSize: 2, total: 3, totalPages: 2 });
    assert.equal(data.data.items.length, 1);
    const first = await request('/coding-questions?page=1&pageSize=100');
    assert.deepEqual(first.data.data.pagination, { page: 1, pageSize: 100, total: 3, totalPages: 1 });
    assert.equal(first.data.data.items.length, 3);
    const empty = await request('/coding-questions?page=2&pageSize=100');
    assert.equal(empty.data.data.items.length, 0);
    assert.equal(empty.data.data.pagination.total, 3);
  });

  it('retrieves, updates, and deletes a question; missing IDs return 404', async () => {
    const created = await add(validQuestion);
    const retrieved = await request(`/coding-questions/${created.id}`);
    assert.equal(retrieved.response.status, 200);

    const updated = await request(`/coding-questions/${created.id}`, {
      method: 'PATCH', body: { type: 'INTERVIEW', expectedOutput: 'Returns 6' },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.data.data.question.type, 'INTERVIEW');
    assert.equal(updated.data.data.question.expectedOutput, 'Returns 6');

    const deleted = await request(`/coding-questions/${created.id}`, { method: 'DELETE' });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.data.data.deleted, true);
    assert.equal((await request(`/coding-questions/${created.id}`)).response.status, 404);
    assert.equal((await request('/coding-questions/c000000000000000000000099', { method: 'DELETE' })).response.status, 404);
  });

  it('rejects empty and invalid updates and invalid query parameters', async () => {
    const created = await add(validQuestion);
    assert.equal((await request(`/coding-questions/${created.id}`, { method: 'PATCH', body: {} })).response.status, 400);
    assert.equal((await request(`/coding-questions/${created.id}`, { method: 'PATCH', body: { date: 'yesterday' } })).response.status, 400);
    assert.equal((await request('/coding-questions?startDate=2026-10-20&endDate=2026-10-18')).response.status, 400);
    assert.equal((await request('/coding-questions?pageSize=101')).response.status, 400);
  });

  it('returns accurate totals, date counts, and zero-filled daily counts', async () => {
    await add(validQuestion);
    await add({ ...validQuestion, type: 'INTERVIEW' });
    await add({ ...validQuestion, date: '2026-10-20' });

    const { response, data } = await request('/coding-questions/stats?date=2026-10-18&startDate=2026-10-18&endDate=2026-10-20');
    assert.equal(response.status, 200);
    assert.deepEqual(data.data, {
      totalQuestions: 3,
      dsaQuestions: 2,
      interviewQuestions: 1,
      dateCount: { date: '2026-10-18', count: 2 },
      dailyCounts: [
        { date: '2026-10-18', count: 2 },
        { date: '2026-10-19', count: 0 },
        { date: '2026-10-20', count: 1 },
      ],
    });
    assert.equal((await request('/coding-questions/stats?startDate=2026-10-19')).response.status, 400);
  });

  it('reports API and database readiness using the injected database query', async () => {
    const health = await request('/health');
    assert.equal(health.response.status, 200);
    const ready = await request('/health/ready');
    assert.equal(ready.response.status, 200);
    assert.equal(ready.data.data.database, 'reachable');
  });
});
