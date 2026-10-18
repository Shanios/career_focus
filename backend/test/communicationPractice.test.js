import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createFakePrisma() {
  let records = [];
  let serial = 0;
  const copy = (value) => structuredClone(value);
  const day = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
  function matches(session, where = {}) {
    if (where.completed !== undefined && session.completed !== where.completed) return false;
    if (where.practiceDate instanceof Date && day(session.practiceDate) !== day(where.practiceDate)) return false;
    if (where.practiceDate && !(where.practiceDate instanceof Date)) {
      if (where.practiceDate.gte && day(session.practiceDate) < day(where.practiceDate.gte)) return false;
      if (where.practiceDate.lte && day(session.practiceDate) > day(where.practiceDate.lte)) return false;
    }
    return true;
  }
  const communicationPractice = {
    async create({ data }) { const now = new Date(); const session = { id: `c${String(++serial).padStart(24, '0')}`, notes: null, completed: false, ...copy(data), createdAt: now, updatedAt: now }; records.push(session); return copy(session); },
    async findMany({ where, skip, take, orderBy }) { let result = records.filter((session) => matches(session, where)); for (const order of [...orderBy].reverse()) { const [field, direction] = Object.entries(order)[0]; result.sort((a, b) => { const left = a[field] instanceof Date ? a[field].getTime() : a[field]; const right = b[field] instanceof Date ? b[field].getTime() : b[field]; return direction === 'desc' ? (right > left ? 1 : right < left ? -1 : 0) : (left > right ? 1 : left < right ? -1 : 0); }); } return copy(result.slice(skip, skip + take)); },
    async findUnique({ where }) { return copy(records.find((session) => session.id === where.id) || null); },
    async count({ where } = {}) { return records.filter((session) => matches(session, where)).length; },
    async update({ where, data }) { const session = records.find((item) => item.id === where.id); if (!session) throw Object.assign(new Error('not found'), { code: 'P2025' }); Object.assign(session, copy(data), { updatedAt: new Date() }); return copy(session); },
    async delete({ where }) { const index = records.findIndex((session) => session.id === where.id); if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' }); return copy(records.splice(index, 1)[0]); },
    reset() { records = []; serial = 0; },
  };
  return { communicationPractice, $queryRaw: async () => [{ '?column?': 1 }] };
}

const validSession = { practiceDate: '2026-10-17', topic: 'Mock interview answers', durationMinutes: 25, notes: 'Practised concise examples' };

describe('Communication Practice API', () => {
  const prisma = createFakePrisma();
  let server;
  let baseUrl;
  before(async () => { server = createApp({ corsOrigin: 'http://localhost:5173', prisma }).listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}/api`; });
  after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
  beforeEach(() => prisma.communicationPractice.reset());
  async function request(path, { method = 'GET', body } = {}) { const response = await fetch(`${baseUrl}${path}`, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { response, data: await response.json() }; }
  async function add(body) { const { response, data } = await request('/communication-practice', { method: 'POST', body }); assert.equal(response.status, 201, JSON.stringify(data)); return data.data.session; }

  it('creates a session incomplete by default and reports database-derived totals', async () => {
    const session = await add(validSession);
    assert.equal(session.completed, false); assert.equal(session.durationMinutes, 25); assert.equal(new Date(session.practiceDate).toISOString().slice(0, 10), validSession.practiceDate);
    assert.deepEqual((await request('/communication-practice/stats')).data.data, { totalSessions: 1, completedSessions: 0, incompleteSessions: 1 });
  });

  it('retrieves, updates, persists completion and duration, then deletes with not-found behavior', async () => {
    const created = await add(validSession);
    assert.equal((await request(`/communication-practice/${created.id}`)).response.status, 200);
    const updated = await request(`/communication-practice/${created.id}`, { method: 'PATCH', body: { durationMinutes: 0, completed: true, practiceDate: '2026-10-18' } });
    assert.equal(updated.response.status, 200); assert.equal(updated.data.data.session.durationMinutes, 0); assert.equal(updated.data.data.session.completed, true);
    const persisted = await request('/communication-practice?date=2026-10-18&completed=true');
    assert.equal(persisted.data.data.pagination.total, 1); assert.equal(persisted.data.data.items[0].id, created.id);
    assert.deepEqual((await request('/communication-practice/stats')).data.data, { totalSessions: 1, completedSessions: 1, incompleteSessions: 0 });
    assert.equal((await request(`/communication-practice/${created.id}`, { method: 'DELETE' })).response.status, 200);
    assert.equal((await request(`/communication-practice/${created.id}`)).response.status, 404);
  });

  it('filters by date range and completion and paginates recent sessions', async () => {
    await add({ ...validSession, topic: 'One', practiceDate: '2026-10-16', completed: true });
    await add({ ...validSession, topic: 'Two', practiceDate: '2026-10-17', completed: true });
    await add({ ...validSession, topic: 'Three', practiceDate: '2026-10-18', completed: false });
    const result = await request('/communication-practice?startDate=2026-10-16&endDate=2026-10-18&completed=true&page=1&pageSize=1');
    assert.equal(result.response.status, 200); assert.equal(result.data.data.pagination.total, 2); assert.equal(result.data.data.pagination.totalPages, 2); assert.equal(result.data.data.items.length, 1);
    const last = await request('/communication-practice?completed=true&page=2&pageSize=1'); assert.equal(last.data.data.items.length, 1); assert.equal(last.data.data.pagination.page, 2);
    const empty = await request('/communication-practice?completed=true&page=3&pageSize=1'); assert.equal(empty.data.data.items.length, 0); assert.equal(empty.data.data.pagination.total, 2);
    assert.equal((await request('/communication-practice?completed=false')).data.data.items[0].topic, 'Three');
  });

  it('accepts zero and the upper duration bound and rejects invalid duration, date, fields, ID and pagination', async () => {
    assert.equal((await add({ ...validSession, durationMinutes: 0 })).durationMinutes, 0);
    assert.equal((await add({ ...validSession, durationMinutes: 1440 })).durationMinutes, 1440);
    for (const body of [
      { topic: 'Missing date and duration' },
      { ...validSession, topic: '  ' },
      { ...validSession, durationMinutes: -1 },
      { ...validSession, durationMinutes: 1.5 },
      { ...validSession, durationMinutes: '25' },
      { ...validSession, durationMinutes: 1441 },
      { ...validSession, practiceDate: '2026-02-30' },
      { ...validSession, completed: 'true' },
      { ...validSession, extra: true },
    ]) assert.equal((await request('/communication-practice', { method: 'POST', body })).response.status, 400);
    assert.equal((await request('/communication-practice?startDate=2026-10-20&endDate=2026-10-01')).response.status, 400);
    assert.equal((await request('/communication-practice?completed=yes')).response.status, 400);
    assert.equal((await request('/communication-practice?pageSize=101')).response.status, 400);
    assert.equal((await request('/communication-practice/not-valid!')).response.status, 400);
  });
});
