import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createFakePrisma() {
  let records = [];
  let serial = 0;
  const copy = (value) => structuredClone(value);
  const day = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
  function matches(entry, where = {}) {
    if (where.completed !== undefined && entry.completed !== where.completed) return false;
    if (where.practiceDate instanceof Date && day(entry.practiceDate) !== day(where.practiceDate)) return false;
    if (where.practiceDate && !(where.practiceDate instanceof Date)) {
      if (where.practiceDate.gte && day(entry.practiceDate) < day(where.practiceDate.gte)) return false;
      if (where.practiceDate.lte && day(entry.practiceDate) > day(where.practiceDate.lte)) return false;
    }
    return true;
  }
  const pythonLearningEntry = {
    async create({ data }) { const now = new Date(); const entry = { id: `p${String(++serial).padStart(24, '0')}`, notes: null, exerciseDescription: null, completed: false, ...copy(data), createdAt: now, updatedAt: now }; records.push(entry); return copy(entry); },
    async findMany({ where, skip, take, orderBy }) { let result = records.filter((entry) => matches(entry, where)); for (const order of [...orderBy].reverse()) { const [field, direction] = Object.entries(order)[0]; result.sort((a, b) => { const left = a[field] instanceof Date ? a[field].getTime() : a[field]; const right = b[field] instanceof Date ? b[field].getTime() : b[field]; return direction === 'desc' ? (right > left ? 1 : right < left ? -1 : 0) : (left > right ? 1 : left < right ? -1 : 0); }); } return copy(result.slice(skip, skip + take)); },
    async findUnique({ where }) { return copy(records.find((entry) => entry.id === where.id) || null); },
    async count({ where } = {}) { return records.filter((entry) => matches(entry, where)).length; },
    async update({ where, data }) { const entry = records.find((item) => item.id === where.id); if (!entry) throw Object.assign(new Error('not found'), { code: 'P2025' }); Object.assign(entry, copy(data), { updatedAt: new Date() }); return copy(entry); },
    async delete({ where }) { const index = records.findIndex((entry) => entry.id === where.id); if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' }); return copy(records.splice(index, 1)[0]); },
    reset() { records = []; serial = 0; },
  };
  return { pythonLearningEntry, $queryRaw: async () => [{ '?column?': 1 }] };
}

const validEntry = { practiceDate: '2026-10-17', topic: 'Loops', exerciseDescription: 'Iterate over a list' };

describe('Python Learning API', () => {
  const prisma = createFakePrisma();
  let server;
  let baseUrl;
  before(async () => { server = createApp({ corsOrigin: 'http://localhost:5173', prisma }).listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}/api`; });
  after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
  beforeEach(() => prisma.pythonLearningEntry.reset());
  async function request(path, { method = 'GET', body } = {}) { const response = await fetch(`${baseUrl}${path}`, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { response, data: await response.json() }; }
  async function add(body) { const { response, data } = await request('/python-learning', { method: 'POST', body }); assert.equal(response.status, 201, JSON.stringify(data)); return data.data.entry; }

  it('creates an incomplete entry by default and returns zero completion statistics', async () => {
    const created = await add(validEntry);
    assert.equal(created.completed, false);
    assert.equal(new Date(created.practiceDate).toISOString().slice(0, 10), validEntry.practiceDate);
    const stats = await request('/python-learning/stats');
    assert.deepEqual(stats.data.data, { totalEntries: 1, completedEntries: 0, incompleteEntries: 1, completionRate: 0 });
  });

  it('retrieves, updates, persists across list requests, and deletes entries', async () => {
    const created = await add(validEntry);
    assert.equal((await request(`/python-learning/${created.id}`)).response.status, 200);
    const updated = await request(`/python-learning/${created.id}`, { method: 'PATCH', body: { completed: true, notes: 'Practised two examples' } });
    assert.equal(updated.response.status, 200); assert.equal(updated.data.data.entry.completed, true); assert.equal(updated.data.data.entry.notes, 'Practised two examples');
    const listed = await request('/python-learning?completed=true');
    assert.equal(listed.data.data.pagination.total, 1); assert.equal(listed.data.data.items[0].id, created.id);
    assert.deepEqual((await request('/python-learning/stats')).data.data, { totalEntries: 1, completedEntries: 1, incompleteEntries: 0, completionRate: 100 });
    assert.equal((await request(`/python-learning/${created.id}`, { method: 'DELETE' })).response.status, 200);
    assert.equal((await request(`/python-learning/${created.id}`)).response.status, 404);
  });

  it('filters by date and completion, and paginates with stable totals', async () => {
    await add({ ...validEntry, topic: 'Loops one', practiceDate: '2026-10-17', completed: true });
    await add({ ...validEntry, topic: 'Loops two', practiceDate: '2026-10-18', completed: true });
    await add({ ...validEntry, topic: 'Strings', practiceDate: '2026-10-18', completed: false });
    const filtered = await request('/python-learning?startDate=2026-10-17&endDate=2026-10-18&completed=true&page=1&pageSize=1');
    assert.equal(filtered.response.status, 200); assert.equal(filtered.data.data.pagination.total, 2); assert.equal(filtered.data.data.pagination.totalPages, 2); assert.equal(filtered.data.data.items.length, 1); assert.equal(filtered.data.data.items[0].completed, true);
    const last = await request('/python-learning?completed=true&page=2&pageSize=1'); assert.equal(last.data.data.pagination.page, 2); assert.equal(last.data.data.items.length, 1);
    const empty = await request('/python-learning?completed=true&page=3&pageSize=1'); assert.equal(empty.data.data.items.length, 0); assert.equal(empty.data.data.pagination.total, 2);
    const exactDate = await request('/python-learning?date=2026-10-18&completed=false');
    assert.equal(exactDate.data.data.pagination.total, 1); assert.equal(exactDate.data.data.items[0].topic, 'Strings');
  });

  it('rejects missing required fields and invalid dates, completion values, IDs, and pagination', async () => {
    for (const body of [{ topic: 'Missing date' }, { ...validEntry, topic: '  ' }, { ...validEntry, practiceDate: '2026-02-30' }, { ...validEntry, completed: 'yes' }, { ...validEntry, unknown: true }]) {
      assert.equal((await request('/python-learning', { method: 'POST', body })).response.status, 400);
    }
    assert.equal((await request('/python-learning?startDate=2026-10-20&endDate=2026-10-01')).response.status, 400);
    assert.equal((await request('/python-learning?completed=maybe')).response.status, 400);
    assert.equal((await request('/python-learning?pageSize=101')).response.status, 400);
    assert.equal((await request('/python-learning/not-an-id!')).response.status, 400);
    assert.equal((await request('/python-learning/not-an-id!', { method: 'DELETE' })).response.status, 400);
  });
});
