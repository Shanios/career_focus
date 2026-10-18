const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { signal, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server. Check that the backend is running and try again.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.ok ? 'The server returned an unreadable response.' : 'The request could not be completed.', response.status);
  }
  if (!response.ok || payload.success === false) {
    const message = response.status >= 500
      ? 'The server could not complete the request. Please try again.'
      : payload.error?.message || 'The request could not be completed.';
    throw new ApiError(message, response.status);
  }
  return payload.data;
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatPracticeDate(value, options = { dateStyle: 'medium' }) {
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return datePart;
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

function queryString(parameters) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  return search.size ? `?${search.toString()}` : '';
}

export const codingQuestionsApi = {
  list(parameters, options) {
    return request(`/coding-questions${queryString(parameters)}`, options);
  },
  get(id, options) {
    return request(`/coding-questions/${encodeURIComponent(id)}`, options);
  },
  create(question) {
    return request('/coding-questions', { method: 'POST', body: JSON.stringify(question) });
  },
  update(id, question) {
    return request(`/coding-questions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(question) });
  },
  remove(id) {
    return request(`/coding-questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  stats(parameters, options) {
    return request(`/coding-questions/stats${queryString(parameters)}`, options);
  },
};

export const jobApplicationsApi = {
  list(parameters, options) {
    return request(`/job-applications${queryString(parameters)}`, options);
  },
  get(id, options) {
    return request(`/job-applications/${encodeURIComponent(id)}`, options);
  },
  create(application) {
    return request('/job-applications', { method: 'POST', body: JSON.stringify(application) });
  },
  update(id, application) {
    return request(`/job-applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(application) });
  },
  remove(id) {
    return request(`/job-applications/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  stats(parameters, options) {
    return request(`/job-applications/stats${queryString(parameters)}`, options);
  },
};

export const pythonLearningApi = {
  list(parameters, options) {
    return request(`/python-learning${queryString(parameters)}`, options);
  },
  get(id, options) {
    return request(`/python-learning/${encodeURIComponent(id)}`, options);
  },
  create(entry) {
    return request('/python-learning', { method: 'POST', body: JSON.stringify(entry) });
  },
  update(id, entry) {
    return request(`/python-learning/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(entry) });
  },
  remove(id) {
    return request(`/python-learning/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  stats(options) {
    return request('/python-learning/stats', options);
  },
};

export const communicationPracticeApi = {
  list(parameters, options) {
    return request(`/communication-practice${queryString(parameters)}`, options);
  },
  get(id, options) {
    return request(`/communication-practice/${encodeURIComponent(id)}`, options);
  },
  create(session) {
    return request('/communication-practice', { method: 'POST', body: JSON.stringify(session) });
  },
  update(id, session) {
    return request(`/communication-practice/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(session) });
  },
  remove(id) {
    return request(`/communication-practice/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  stats(options) {
    return request('/communication-practice/stats', options);
  },
};

export const dailyProgressApi = {
  get(date, options) {
    return request(`/daily-progress${queryString({ date })}`, options);
  },
  targets(options) {
    return request('/daily-progress/targets', options);
  },
  updateTargets(targets) {
    return request('/daily-progress/targets', { method: 'PATCH', body: JSON.stringify(targets) });
  },
};

export const journalApi = {
  list(parameters, options) { return request(`/journal${queryString(parameters)}`, options); },
  get(id, options) { return request(`/journal/${encodeURIComponent(id)}`, options); },
  create(entry) { return request('/journal', { method: 'POST', body: JSON.stringify(entry) }); },
  update(id, entry) { return request(`/journal/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(entry) }); },
  remove(id) { return request(`/journal/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
};
