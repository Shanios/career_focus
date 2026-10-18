import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createFakePrisma() {
  let records = [];
  let serial = 0;
  const copy = (value) => structuredClone(value);
  const dateKey = (date) => date ? new Date(date).toISOString().slice(0, 10) : null;
  function matches(row, where = {}) {
    if (typeof where.status === 'string' && row.status !== where.status) return false;
    if (where.status?.in && !where.status.in.includes(row.status)) return false;
    if (where.applicationDate instanceof Date && dateKey(row.applicationDate) !== dateKey(where.applicationDate)) return false;
    if (where.applicationDate && !(where.applicationDate instanceof Date)) {
      if (!row.applicationDate) return false;
      if (where.applicationDate.gte && dateKey(row.applicationDate) < dateKey(where.applicationDate.gte)) return false;
      if (where.applicationDate.lte && dateKey(row.applicationDate) > dateKey(where.applicationDate.lte)) return false;
    }
    if (where.OR && !where.OR.some((filter) => row[Object.keys(filter)[0]].toLowerCase().includes(filter[Object.keys(filter)[0]].contains.toLowerCase()))) return false;
    return true;
  }
  const jobApplication = {
    async create({ data }) { const now = new Date(); const row = { id: `j${String(++serial).padStart(24, '0')}`, jobUrl: null, jobDescription: null, applicationDate: null, jobType: null, workArrangement: null, matchAssessment: null, resumeVersion: null, followUpDate: null, notes: null, ...copy(data), status: data.status || 'SAVED', createdAt: now, updatedAt: now }; records.push(row); return copy(row); },
    async findMany({ where, skip, take, orderBy }) { let rows = records.filter((row) => matches(row, where)); for (const order of [...orderBy].reverse()) { const [field, dir] = Object.entries(order)[0]; rows.sort((a, b) => dir === 'desc' ? (b[field] > a[field] ? 1 : b[field] < a[field] ? -1 : 0) : (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0)); } return copy(rows.slice(skip, skip + take)); },
    async findUnique({ where }) { return copy(records.find((row) => row.id === where.id) || null); },
    async count({ where } = {}) { return records.filter((row) => matches(row, where)).length; },
    async groupBy({ by }) { const groups = new Map(); for (const row of records) groups.set(row[by[0]], (groups.get(row[by[0]]) || 0) + 1); return [...groups].map(([status, count]) => ({ [by[0]]: status, _count: { _all: count } })); },
    async update({ where, data }) { const row = records.find((entry) => entry.id === where.id); if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' }); Object.assign(row, copy(data), { updatedAt: new Date() }); return copy(row); },
    async delete({ where }) { const index = records.findIndex((row) => row.id === where.id); if (index < 0) throw Object.assign(new Error('not found'), { code: 'P2025' }); return copy(records.splice(index, 1)[0]); },
    reset() { records = []; serial = 0; },
  };
  return { jobApplication, $queryRaw: async () => [{ '?column?': 1 }] };
}

const validApplication = { companyName: 'Acme Robotics', jobTitle: 'Software Engineer', status: 'SAVED' };
describe('Job Applications API', () => {
  const prisma = createFakePrisma();
  let server;
  let baseUrl;
  before(async () => { server = createApp({ corsOrigin: 'http://localhost:5173', prisma }).listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}/api`; });
  after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
  beforeEach(() => prisma.jobApplication.reset());
  async function request(path, { method = 'GET', body } = {}) { const response = await fetch(`${baseUrl}${path}`, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { response, data: await response.json() }; }
  async function add(body) { const { response, data } = await request('/job-applications', { method: 'POST', body }); assert.equal(response.status, 201, JSON.stringify(data)); return data.data.application; }

  it('creates saved records without counting them as submitted and applies the date fallback on submission', async () => {
    const saved = await add(validApplication);
    let stats = await request('/job-applications/stats');
    assert.equal(stats.data.data.total, 1); assert.equal(stats.data.data.saved, 1); assert.equal(stats.data.data.submitted, 0);
    const moved = await request(`/job-applications/${saved.id}`, { method: 'PATCH', body: { status: 'APPLIED' } });
    assert.equal(moved.response.status, 200); assert.ok(moved.data.data.application.applicationDate);
    stats = await request(`/job-applications/stats?date=${new Date().toISOString().slice(0, 10)}`);
    assert.equal(stats.data.data.submitted, 1); assert.equal(stats.data.data.submittedOnDate.count, 1);
  });

  it('supports case-insensitive search, status/date filters, pagination and submitted-status rules', async () => {
    await add({ ...validApplication, status: 'APPLIED', applicationDate: '2026-10-10' });
    await add({ ...validApplication, companyName: 'Northwind', jobTitle: 'Data Engineer', status: 'SAVED' });
    await add({ ...validApplication, companyName: 'Other', status: 'WITHDRAWN', applicationDate: '2026-10-12' });
    await add({ ...validApplication, companyName: 'Acme Labs', status: 'INTERVIEW', applicationDate: '2026-10-11' });
    const filtered = await request('/job-applications?search=ACME&status=APPLIED&startDate=2026-10-01&endDate=2026-10-20&page=1&pageSize=1');
    assert.equal(filtered.response.status, 200); assert.equal(filtered.data.data.pagination.total, 1); assert.equal(filtered.data.data.items.length, 1);
    const stats = await request('/job-applications/stats');
    assert.equal(stats.data.data.submitted, 2); assert.equal(stats.data.data.saved, 1); assert.equal(stats.data.data.byStatus.WITHDRAWN, 1);
  });

  it('retrieves, edits and deletes records; preserves explicit dates and returns 404 for missing IDs', async () => {
    const created = await add({ ...validApplication, status: 'APPLIED', applicationDate: '2026-09-15' });
    const fetched = await request(`/job-applications/${created.id}`); assert.equal(fetched.response.status, 200);
    const update = await request(`/job-applications/${created.id}`, { method: 'PATCH', body: { status: 'INTERVIEW', notes: 'Panel interview' } });
    assert.equal(update.response.status, 200); assert.equal(new Date(update.data.data.application.applicationDate).toISOString().slice(0, 10), '2026-09-15');
    assert.equal((await request(`/job-applications/${created.id}`, { method: 'DELETE' })).response.status, 200);
    assert.equal((await request(`/job-applications/${created.id}`)).response.status, 404);
  });

  it('rejects invalid fields, URL, dates, enums and query filters', async () => {
    for (const body of [{ jobTitle: 'Missing company' }, { ...validApplication, status: 'PENDING' }, { ...validApplication, jobUrl: 'javascript:alert(1)' }, { ...validApplication, applicationDate: '2026-02-30' }, { ...validApplication, unexpected: true }]) {
      assert.equal((await request('/job-applications', { method: 'POST', body })).response.status, 400);
    }
    assert.equal((await request('/job-applications?startDate=2026-10-20&endDate=2026-10-01')).response.status, 400);
    assert.equal((await request('/job-applications?pageSize=101')).response.status, 400);
    assert.equal((await request('/job-applications/not-an-id!')).response.status, 400);
  });
});
