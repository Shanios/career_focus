import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function fakePrisma() {
  let rows = [], serial = 0;
  const copy = (value) => structuredClone(value);
  const key = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
  function matches(row, where = {}) {
    if (where.entryDate?.gte && key(row.entryDate) < key(where.entryDate.gte)) return false;
    if (where.entryDate?.lte && key(row.entryDate) > key(where.entryDate.lte)) return false;
    if (where.OR && !where.OR.some((clause) => Object.entries(clause).some(([field, condition]) => row[field].toLowerCase().includes(condition.contains.toLowerCase())))) return false;
    return true;
  }
  const journalEntry = {
    async create({ data }) { const now = new Date(); const row = { id: `j${String(++serial).padStart(24, '0')}`, mood: null, tags: [], ...copy(data), createdAt: now, updatedAt: now }; rows.push(row); return copy(row); },
    async findMany({ where, skip, take, orderBy }) { let found = rows.filter((row) => matches(row, where)); for (const order of [...orderBy].reverse()) { const [field, direction] = Object.entries(order)[0]; found.sort((a, b) => direction === 'desc' ? (a[field] > b[field] ? -1 : a[field] < b[field] ? 1 : 0) : (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0)); } return copy(found.slice(skip, skip + take)); },
    async findUnique({ where }) { return copy(rows.find((row) => row.id === where.id) || null); },
    async count({ where } = {}) { return rows.filter((row) => matches(row, where)).length; },
    async update({ where, data }) { const row = rows.find((item) => item.id === where.id); if (!row) throw Object.assign(new Error(), { code: 'P2025' }); Object.assign(row, copy(data), { updatedAt: new Date() }); return copy(row); },
    async delete({ where }) { const index = rows.findIndex((row) => row.id === where.id); if (index < 0) throw Object.assign(new Error(), { code: 'P2025' }); return copy(rows.splice(index, 1)[0]); },
    reset() { rows = []; serial = 0; },
  };
  return { journalEntry, $queryRaw: async () => [{ '?column?': 1 }] };
}
const valid = { entryDate: '2026-10-17', title: 'A day', content: 'Learned something new', mood: 'GOOD', tags: ['learning'] };
describe('Journal API', () => {
  const prisma = fakePrisma(); let server, baseUrl;
  before(async () => { server = createApp({ corsOrigin: '*', prisma }).listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}/api`; });
  after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
  beforeEach(() => prisma.journalEntry.reset());
  async function request(path, { method = 'GET', body } = {}) { const response = await fetch(`${baseUrl}${path}`, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { response, data: await response.json() }; }
  async function add(body = valid) { const result = await request('/journal', { method: 'POST', body }); assert.equal(result.response.status, 201, JSON.stringify(result.data)); return result.data.data.entry; }
  it('supports CRUD and preserves journal content as ordinary entry data', async () => {
    const row = await add(); assert.equal((await request(`/journal/${row.id}`)).data.data.entry.content, valid.content);
    const updated = await request(`/journal/${row.id}`, { method: 'PATCH', body: { title: 'Updated', tags: ['one', 'one', 'two'] } }); assert.equal(updated.data.data.entry.title, 'Updated'); assert.deepEqual(updated.data.data.entry.tags, ['one', 'two']);
    assert.equal((await request(`/journal/${row.id}`, { method: 'DELETE' })).response.status, 200); assert.equal((await request(`/journal/${row.id}`)).response.status, 404);
  });
  it('filters by date range and content search; paginates stably and reports empty pages', async () => {
    await add({ ...valid, title: 'First', entryDate: '2026-10-16' }); await add({ ...valid, title: 'Second', content: 'A unique reflection', entryDate: '2026-10-17' }); await add({ ...valid, title: 'Third', entryDate: '2026-10-18' });
    const page = await request('/journal?startDate=2026-10-16&endDate=2026-10-18&page=2&pageSize=1'); assert.deepEqual(page.data.data.pagination, { page: 2, pageSize: 1, total: 3, totalPages: 3 }); assert.equal(page.data.data.items.length, 1);
    const searched = await request('/journal?search=UNIQUE'); assert.equal(searched.data.data.pagination.total, 1); assert.equal(searched.data.data.items[0].title, 'Second');
    const empty = await request('/journal?page=9&pageSize=2'); assert.equal(empty.data.data.items.length, 0); assert.equal(empty.data.data.pagination.total, 3);
  });
  it('validates required content, dates, mood, tags, IDs and pagination', async () => {
    for (const body of [{ title: 'x', content: 'body' }, { ...valid, entryDate: '2026-02-30' }, { ...valid, content: ' ' }, { ...valid, mood: 'BAD' }, { ...valid, tags: [''] }]) assert.equal((await request('/journal', { method: 'POST', body })).response.status, 400);
    assert.equal((await request('/journal?startDate=2026-10-20&endDate=2026-10-01')).response.status, 400); assert.equal((await request('/journal?pageSize=101')).response.status, 400); assert.equal((await request('/journal/not-valid!')).response.status, 400);
  });
});
