import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodingQuestionForm, { emptyQuestion } from '../components/CodingQuestionForm.jsx';
import { codingQuestionsApi, formatPracticeDate, getLocalDateString } from '../services/apiClient.js';
import '../styles/codingTracker.css';

const PAGE_SIZE = 10;

function questionDate(value) {
  return String(value).slice(0, 10);
}

function typeLabel(type) {
  return type === 'INTERVIEW' ? 'Interview' : 'DSA';
}

export default function CodingTrackerPage() {
  const today = useMemo(() => getLocalDateString(), []);
  const [form, setForm] = useState(() => emptyQuestion(today));
  const [filters, setFilters] = useState({ type: '', date: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const editDialogRef = useRef(null);

  const query = useMemo(() => ({
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  }), [filters, page]);

  const loadData = useCallback(async (signal) => {
    setLoading(true);
    setListError('');
    setStatsError('');
    const [listResult, statsResult] = await Promise.allSettled([
      codingQuestionsApi.list(query, { signal }),
      codingQuestionsApi.stats({ date: today }, { signal }),
    ]);
    if (signal?.aborted) return;
    if (listResult.status === 'fulfilled') {
      setItems(listResult.value.items);
      setPagination(listResult.value.pagination);
      const lastPage = Math.max(1, listResult.value.pagination.totalPages);
      if (page > lastPage) setPage(lastPage);
    } else {
      setListError(listResult.reason.message || 'Could not load coding questions.');
    }
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    else {
      setStats(null);
      setStatsError(statsResult.reason.message || 'Could not load question statistics.');
    }
    setLoading(false);
  }, [query, today, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    if (editing && editDialogRef.current && !editDialogRef.current.open) {
      editDialogRef.current.showModal();
    }
  }, [editing]);

  function changeFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
    setNotice(null);
  }

  function clearFilters() {
    setFilters({ type: '', date: '', startDate: '', endDate: '' });
    setPage(1);
    setNotice(null);
  }

  async function createQuestion(question) {
    setSaving(true);
    setNotice(null);
    try {
      await codingQuestionsApi.create(question);
      setForm((current) => emptyQuestion(current.date || today, current.type || 'DSA'));
      setNotice({ kind: 'success', message: 'Question saved.' });
      await loadData();
    } catch (error) {
      setNotice({ kind: 'error', message: error.message || 'Could not save this question. Your entries are still here.' });
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(question) {
    setNotice(null);
    setEditError('');
    setEditing(question);
    setEditForm({
      date: questionDate(question.date),
      type: question.type,
      questionContent: question.questionContent,
      expectedOutput: question.expectedOutput,
    });
  }

  async function updateQuestion(question) {
    if (!editing) return;
    setEditSaving(true);
    try {
      await codingQuestionsApi.update(editing.id, question);
      setEditing(null);
      setEditForm(null);
      setEditError('');
      setNotice({ kind: 'success', message: 'Question updated.' });
      await loadData();
    } catch (error) {
      setEditError(error.message || 'Could not update this question.');
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteQuestion(question) {
    const confirmed = window.confirm(`Delete this ${typeLabel(question.type)} question from ${formatPracticeDate(question.date)}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(question.id);
    setNotice(null);
    try {
      await codingQuestionsApi.remove(question.id);
      setNotice({ kind: 'success', message: 'Question deleted.' });
      await loadData();
    } catch (error) {
      setNotice({ kind: 'error', message: error.message || 'Could not delete this question.' });
    } finally {
      setDeletingId('');
    }
  }

  return <div className="page-wrap coding-page">
    <header className="page-header">
      <div><div className="eyebrow">DAILY PRACTICE</div><h1>Coding Tracker</h1><p>Save every problem you practise and keep your interview preparation moving.</p></div>
      <div className="coding-page-date"><span className="today-indicator" />{formatPracticeDate(today, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
    </header>

    {notice && <div className={`page-notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}

    <section className="coding-stats-grid" aria-label="Coding question statistics">
      <StatCard label="TOTAL QUESTIONS" value={stats?.totalQuestions} mark="⌘" loading={!stats && !statsError} error={Boolean(statsError)} />
      <StatCard label="DSA QUESTIONS" value={stats?.dsaQuestions} mark="</>" tone="blue" loading={!stats && !statsError} error={Boolean(statsError)} />
      <StatCard label="INTERVIEW QUESTIONS" value={stats?.interviewQuestions} mark="◉" tone="amber" loading={!stats && !statsError} error={Boolean(statsError)} />
      <StatCard label="PRACTISED TODAY" value={stats?.dateCount?.count} note={formatPracticeDate(today)} mark="▦" tone="green" loading={!stats && !statsError} error={Boolean(statsError)} />
    </section>
    {statsError && <p className="inline-error" role="alert">{statsError} Statistics will update when the server is available.</p>}

    <section className="panel question-entry-panel">
      <div className="panel-heading entry-heading"><div><span className="eyebrow">LOG A SESSION</span><h2>Add a coding question</h2></div><span className="required-hint"><b>*</b> Required fields</span></div>
      <CodingQuestionForm value={form} onChange={setForm} onSubmit={createQuestion} submitLabel="Save question" disabled={saving} />
    </section>

    <section className="panel question-history-panel">
      <div className="panel-heading history-heading"><div><span className="eyebrow">YOUR PRACTICE LOG</span><h2>Question history <span className="history-total">{pagination.total}</span></h2></div></div>
      <div className="question-filters">
        <div className="filter-tabs" role="group" aria-label="Filter questions by type">
          {[['', 'All'], ['DSA', 'DSA'], ['INTERVIEW', 'Interview']].map(([value, label]) => <button type="button" key={value || 'all'} className={`filter-tab ${filters.type === value ? 'selected' : ''}`} aria-pressed={filters.type === value} onClick={() => changeFilter('type', value)}>{label}</button>)}
        </div>
        <div className="filter-date-group">
          <label><span>Practice date</span><input aria-label="Filter by practice date" type="date" value={filters.date} onChange={(event) => changeFilter('date', event.target.value)} /></label>
          <span className="filter-or">or range</span>
          <label><span>From</span><input aria-label="Filter from date" type="date" value={filters.startDate} onChange={(event) => changeFilter('startDate', event.target.value)} /></label>
          <label><span>To</span><input aria-label="Filter to date" type="date" value={filters.endDate} onChange={(event) => changeFilter('endDate', event.target.value)} /></label>
          <button type="button" className="clear-filters" onClick={clearFilters} disabled={!filters.type && !filters.date && !filters.startDate && !filters.endDate}>Clear filters</button>
        </div>
      </div>

      {listError && <div className="list-error" role="alert"><span>{listError}</span><button type="button" className="button button-secondary" onClick={() => loadData()}>Try again</button></div>}
      {loading && <div className="questions-loading" role="status"><span className="loading-spinner" />Loading questions…</div>}
      {!loading && !listError && items.length === 0 && <div className="questions-empty"><div className="empty-symbol">⌁</div><strong>{hasActiveFilters(filters) ? 'No questions match these filters' : 'No coding questions yet'}</strong><p>{hasActiveFilters(filters) ? 'Try adjusting your filters or clear them to see your full practice history.' : 'Add your first question above to start building your practice log.'}</p>{hasActiveFilters(filters) && <button type="button" className="text-link clear-empty" onClick={clearFilters}>Clear filters →</button>}</div>}
      {!loading && !listError && items.length > 0 && <>
        <div className="question-list">{items.map((question) => <article className="question-row" key={question.id}>
          <div className="question-meta"><span className={`type-badge ${question.type === 'INTERVIEW' ? 'badge-interview' : 'badge-dsa'}`}>{typeLabel(question.type)}</span><span className="question-date">{formatPracticeDate(question.date)}</span></div>
          <div className="question-copy"><h3>{question.questionContent}</h3><p><span>Expected output</span>{question.expectedOutput}</p></div>
          <div className="question-actions"><button type="button" className="icon-action edit-action" onClick={() => beginEdit(question)} aria-label={`Edit question: ${question.questionContent.slice(0, 48)}`} title="Edit question">✎</button><button type="button" className="icon-action delete-action" onClick={() => deleteQuestion(question)} disabled={deletingId === question.id} aria-label={`Delete question: ${question.questionContent.slice(0, 48)}`} title="Delete question">{deletingId === question.id ? '…' : '×'}</button></div>
        </article>)}</div>
        <div className="pagination-bar"><span>Showing <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)}</strong> of <strong>{pagination.total}</strong></span><div className="pagination-controls"><button type="button" className="page-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page">←</button><span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span><button type="button" className="page-button" onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={page >= pagination.totalPages || loading} aria-label="Next page">→</button></div></div>
      </>}
    </section>

    {editing && editForm && <dialog ref={editDialogRef} className="edit-dialog" aria-labelledby="edit-question-title" onCancel={(event) => { if (editSaving) event.preventDefault(); }} onClose={() => { setEditing(null); setEditForm(null); setEditError(''); }}>
      <div className="panel-heading"><div><span className="eyebrow">UPDATE PRACTICE LOG</span><h2 id="edit-question-title">Edit coding question</h2></div><button type="button" className="modal-close" aria-label="Close edit form" disabled={editSaving} onClick={() => editDialogRef.current?.close()}>×</button></div>
      {editError && <div className="page-notice notice-error edit-error" role="alert">{editError}</div>}
      <CodingQuestionForm value={editForm} onChange={setEditForm} onSubmit={updateQuestion} submitLabel="Save changes" disabled={editSaving} compact onCancel={() => editDialogRef.current?.close()} />
    </dialog>}
  </div>;
}

function hasActiveFilters(filters) {
  return Boolean(filters.type || filters.date || filters.startDate || filters.endDate);
}

function StatCard({ label, value, note, mark, tone = '', loading, error }) {
  return <div className="summary-card coding-stat-card"><div className="card-top"><span>{label}</span><span className={`card-mark ${tone ? `mark-${tone}` : ''}`}>{mark}</span></div><div className="card-value">{loading ? <span className="stat-skeleton" /> : error ? '—' : value ?? 0}</div><div className="card-note">{note || 'All time'}</div></div>;
}
