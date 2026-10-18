import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function createFakePrisma() {
  const rows = { jobApplication: [], codingQuestion: [], pythonLearningEntry: [], communicationPractice: [] };
  const defaults = { jobApplications: 2, dsaQuestions: 2, interviewQuestions: 1, pythonLessons: 1, communicationSessions: 1 };
  let targetSettings = null;
  let failCommunication = false;
  const dateKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  function matches(row, where = {}, dateField) {
    if (where.status?.in && !where.status.in.includes(row.status)) return false;
    if (where.type && row.type !== where.type) return false;
    if (where.completed !== undefined && row.completed !== where.completed) return false;
    if (where.applicationDate && dateKey(row.applicationDate) !== dateKey(where.applicationDate)) return false;
    if (where.date && dateKey(row.date) !== dateKey(where.date)) return false;
    if (where.practiceDate && dateKey(row.practiceDate) !== dateKey(where.practiceDate)) return false;
    return true;
  }
  const countModel = (name, dateField) => ({ count: async ({ where } = {}) => {
    if (name === 'communicationPractice' && failCommunication) throw new Error('table unavailable');
    return rows[name].filter((row) => matches(row, where, dateField)).length;
  } });
  return {
    ...countModel('jobApplication', 'applicationDate'),
    jobApplication: countModel('jobApplication', 'applicationDate'),
    codingQuestion: countModel('codingQuestion', 'date'),
    pythonLearningEntry: countModel('pythonLearningEntry', 'practiceDate'),
    communicationPractice: countModel('communicationPractice', 'practiceDate'),
    dailyTargetSettings: {
      async upsert({ create, update }) { targetSettings = { ...defaults, ...targetSettings, ...(!targetSettings ? create : update) }; return structuredClone(targetSettings); },
    },
    $queryRaw: async () => [{ '?column?': 1 }],
    seed(values) { for (const [key, items] of Object.entries(values)) rows[key].push(...items); },
    reset() { for (const value of Object.values(rows)) value.length = 0; targetSettings = null; failCommunication = false; },
    failCommunication() { failCommunication = true; },
  };
}

const selectedDate = '2026-10-17';
const date = new Date(`${selectedDate}T00:00:00.000Z`);

describe('Daily Progress API', () => {
  const prisma = createFakePrisma();
  let server;
  let baseUrl;
  before(async () => { server = createApp({ corsOrigin: 'http://localhost:5173', prisma }).listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}/api`; });
  after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
  beforeEach(() => prisma.reset());
  async function request(path, { method = 'GET', body } = {}) { const response = await fetch(`${baseUrl}${path}`, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { response, data: await response.json() }; }

  it('aggregates date-specific activity by source and counts only submitted/completed records', async () => {
    prisma.seed({
      jobApplication: [
        { status: 'APPLIED', applicationDate: date }, { status: 'INTERVIEW', applicationDate: date },
        { status: 'SAVED', applicationDate: date }, { status: 'WITHDRAWN', applicationDate: date },
        { status: 'OFFER', applicationDate: new Date('2026-10-16T00:00:00.000Z') },
      ],
      codingQuestion: [
        { type: 'DSA', date }, { type: 'DSA', date }, { type: 'INTERVIEW', date },
        { type: 'DSA', date: new Date('2026-10-16T00:00:00.000Z') },
      ],
      pythonLearningEntry: [{ completed: true, practiceDate: date }, { completed: false, practiceDate: date }],
      communicationPractice: [{ completed: true, practiceDate: date }, { completed: false, practiceDate: date }],
    });
    const result = await request(`/daily-progress?date=${selectedDate}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.data.metrics.jobApplications.actual, 2);
    assert.equal(result.data.data.metrics.dsaQuestions.actual, 2);
    assert.equal(result.data.data.metrics.interviewQuestions.actual, 1);
    assert.equal(result.data.data.metrics.pythonLessons.actual, 1);
    assert.equal(result.data.data.metrics.communicationSessions.actual, 1);
    assert.equal(result.data.data.totalCompletedActivities, 7);
    assert.equal(result.data.data.complete, true);
  });

  it('creates persisted default targets and lets users update targets independently of actual counts', async () => {
    const initial = await request('/daily-progress/targets');
    assert.deepEqual(initial.data.data.targets, { jobApplications: 2, dsaQuestions: 2, interviewQuestions: 1, pythonLessons: 1, communicationSessions: 1 });
    const saved = await request('/daily-progress/targets', { method: 'PATCH', body: { jobApplications: 0, dsaQuestions: 3, interviewQuestions: 0, pythonLessons: 0, communicationSessions: 0 } });
    assert.equal(saved.response.status, 200); assert.equal(saved.data.data.targets.jobApplications, 0); assert.equal(saved.data.data.targets.dsaQuestions, 3);
    const emptyDay = await request(`/daily-progress?date=2026-10-18`);
    assert.equal(emptyDay.data.data.metrics.dsaQuestions.progressPercent, 0);
    assert.equal(emptyDay.data.data.metrics.jobApplications.progressPercent, 0);
    assert.equal(emptyDay.data.data.metrics.jobApplications.remaining, 0);
    assert.equal(emptyDay.data.data.totalCompletedActivities, 0);
  });

  it('handles zero targets safely when activity exists and does not inflate counts from target changes', async () => {
    prisma.seed({ codingQuestion: [{ type: 'DSA', date }] });
    await request('/daily-progress/targets', { method: 'PATCH', body: { dsaQuestions: 0 } });
    const result = await request(`/daily-progress?date=${selectedDate}`);
    assert.equal(result.data.data.metrics.dsaQuestions.actual, 1);
    assert.equal(result.data.data.metrics.dsaQuestions.progressPercent, 100);
    assert.equal(result.data.data.totalCompletedActivities, 1);
  });

  it('rejects invalid or missing dates and invalid target values', async () => {
    for (const query of ['', '?date=2026-02-30', '?date=17-10-2026', '?date=2026-10-17&extra=1']) assert.equal((await request(`/daily-progress${query}`)).response.status, 400);
    for (const body of [{}, { unknown: 1 }, { dsaQuestions: -1 }, { jobApplications: 1001 }, { communicationSessions: 1.5 }, { pythonLessons: '2' }]) {
      assert.equal((await request('/daily-progress/targets', { method: 'PATCH', body })).response.status, 400);
    }
  });

  it('returns explicit partial-data state when an activity source fails', async () => {
    prisma.failCommunication();
    const result = await request(`/daily-progress?date=${selectedDate}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.data.complete, false);
    assert.equal(result.data.data.metrics.communicationSessions.available, false);
    assert.equal(result.data.data.metrics.communicationSessions.actual, null);
    assert.equal(result.data.data.totalCompletedActivities, null);
  });
});
