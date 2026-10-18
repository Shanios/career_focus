import { HttpError } from '../lib/httpError.js';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const targetFields = new Set(['jobApplications', 'dsaQuestions', 'interviewQuestions', 'pythonLessons', 'communicationSessions']);

export function validateDailyProgressDate(query) {
  const keys = Object.keys(query);
  if (keys.some((key) => key !== 'date')) throw new HttpError(400, `Unsupported query parameter: ${keys.find((key) => key !== 'date')}.`);
  const value = query.date;
  if (typeof value !== 'string' || !datePattern.test(value)) throw new HttpError(400, 'date must be a valid date in YYYY-MM-DD format.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new HttpError(400, 'date must be a valid date in YYYY-MM-DD format.');
  return parsed;
}

export function validateDailyTargets(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  const keys = Object.keys(body);
  if (!keys.length) throw new HttpError(400, 'At least one daily target must be provided.');
  const unknown = keys.find((key) => !targetFields.has(key));
  if (unknown) throw new HttpError(400, `Unsupported target: ${unknown}.`);
  for (const key of keys) {
    if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > 1000) throw new HttpError(400, `${key} must be a whole number between 0 and 1000.`);
  }
  return Object.fromEntries(keys.map((key) => [key, body[key]]));
}
