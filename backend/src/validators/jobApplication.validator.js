import { HttpError } from '../lib/httpError.js';

const statuses = new Set(['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN']);
const jobTypes = new Set(['FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'OTHER']);
const workArrangements = new Set(['ONSITE', 'HYBRID', 'REMOTE']);
const fields = new Set([
  'companyName', 'jobTitle', 'jobUrl', 'jobDescription', 'applicationDate', 'jobType',
  'workArrangement', 'matchAssessment', 'resumeVersion', 'status', 'followUpDate', 'notes',
]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value, field) {
  if (value === null) return null;
  if (typeof value !== 'string' || !datePattern.test(value)) {
    throw new HttpError(400, `${field} must be a valid date in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${field} must be a valid date in YYYY-MM-DD format.`);
  }
  return parsed;
}

function optionalText(body, data, field, maxLength = 20000) {
  if (!Object.hasOwn(body, field)) return;
  const value = body[field];
  if (value === null) {
    data[field] = null;
    return;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be a string or null.`);
  if (value.length > maxLength) throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
  data[field] = value.trim() || null;
}

function optionalEnum(body, data, field, values) {
  if (!Object.hasOwn(body, field)) return;
  const value = body[field];
  if (value === null || value === '') {
    data[field] = null;
  } else if (typeof value === 'string' && values.has(value)) {
    data[field] = value;
  } else {
    throw new HttpError(400, `${field} has an unsupported value.`);
  }
}

export function validateJobApplicationBody(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  const keys = Object.keys(body);
  const unknown = keys.find((field) => !fields.has(field));
  if (unknown) throw new HttpError(400, `Unsupported field: ${unknown}.`);
  if (partial && keys.length === 0) throw new HttpError(400, 'At least one field must be provided.');

  const data = {};
  for (const field of ['companyName', 'jobTitle']) {
    if (!partial && !Object.hasOwn(body, field)) throw new HttpError(400, `${field} is required.`);
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    const maxLength = field === 'companyName' ? 160 : 180;
    if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${field} must be a non-empty string.`);
    if (value.trim().length > maxLength) throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
    data[field] = value.trim();
  }

  if (Object.hasOwn(body, 'jobUrl')) {
    const rawUrl = body.jobUrl;
    if (rawUrl === null || rawUrl === '') data.jobUrl = null;
    else if (typeof rawUrl !== 'string' || rawUrl.length > 2048) throw new HttpError(400, 'jobUrl must be a valid HTTP or HTTPS URL no longer than 2048 characters.');
    else {
      try {
        const parsed = new URL(rawUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('Invalid protocol');
        data.jobUrl = parsed.toString();
      } catch {
        throw new HttpError(400, 'jobUrl must be a valid HTTP or HTTPS URL.');
      }
    }
  }

  optionalText(body, data, 'jobDescription');
  optionalText(body, data, 'matchAssessment', 5000);
  optionalText(body, data, 'resumeVersion', 160);
  optionalText(body, data, 'notes');
  optionalEnum(body, data, 'jobType', jobTypes);
  optionalEnum(body, data, 'workArrangement', workArrangements);

  for (const field of ['applicationDate', 'followUpDate']) {
    if (Object.hasOwn(body, field)) data[field] = parseDate(body[field], field);
  }
  if (Object.hasOwn(body, 'status')) {
    if (!statuses.has(body.status)) throw new HttpError(400, 'status has an unsupported value.');
    data.status = body.status;
  }
  return data;
}

function queryString(query, name) {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${name} must be supplied once as a string.`);
  return value;
}

function positiveInteger(value, field, defaultValue, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return defaultValue;
  if (!/^\d+$/.test(value)) throw new HttpError(400, `${field} must be a positive integer.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new HttpError(400, `${field} must be between 1 and ${max}.`);
  return number;
}

export function validateJobApplicationListQuery(query) {
  const allowed = new Set(['search', 'status', 'date', 'startDate', 'endDate', 'page', 'pageSize']);
  const unknown = Object.keys(query).find((name) => !allowed.has(name));
  if (unknown) throw new HttpError(400, `Unsupported query parameter: ${unknown}.`);
  const search = queryString(query, 'search')?.trim();
  if (search && search.length > 160) throw new HttpError(400, 'search must be 160 characters or fewer.');
  const status = queryString(query, 'status');
  if (status !== undefined && !statuses.has(status)) throw new HttpError(400, 'status has an unsupported value.');
  const dateValue = queryString(query, 'date');
  const startValue = queryString(query, 'startDate');
  const endValue = queryString(query, 'endDate');
  const date = dateValue === undefined ? undefined : parseDate(dateValue, 'date');
  const startDate = startValue === undefined ? undefined : parseDate(startValue, 'startDate');
  const endDate = endValue === undefined ? undefined : parseDate(endValue, 'endDate');
  if (startDate && endDate && startDate > endDate) throw new HttpError(400, 'startDate must be on or before endDate.');
  const page = positiveInteger(queryString(query, 'page'), 'page', 1);
  const pageSize = positiveInteger(queryString(query, 'pageSize'), 'pageSize', 10, 100);
  if (!Number.isSafeInteger((page - 1) * pageSize)) throw new HttpError(400, 'page and pageSize produce an unsafe pagination offset.');
  return { search, status, date, startDate, endDate, page, pageSize };
}

export function validateJobApplicationStatsQuery(query) {
  const unknown = Object.keys(query).find((name) => name !== 'date');
  if (unknown) throw new HttpError(400, `Unsupported query parameter: ${unknown}.`);
  const value = queryString(query, 'date');
  return { date: value === undefined ? undefined : parseDate(value, 'date') };
}

export function validateJobApplicationId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,30}$/.test(id)) throw new HttpError(400, 'id must be a valid application identifier.');
  return id;
}
