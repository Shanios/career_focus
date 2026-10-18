import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPracticeDate, getLocalDateString, pythonLearningApi } from '../services/apiClient.js';
import '../styles/pythonLearning.css';

const PAGE_SIZE = 10;
const OUTLINE = [
  'Variables and data types',
  'Conditions and Boolean logic',
  'Loops',
  'Strings and slicing',
  'Lists, tuples and sets',
  'Dictionaries and frequency counting',
  'Functions and scope',
  'Exceptions, files and revision',
];
const newForm = (practiceDate = getLocalDateString()) => ({ practiceDate, topic: '', notes: '', exerciseDescription: '', completed: false });
const dateValue = (value) => String(value).slice(0, 10);

export default function PythonLearningPage() {
  const today = useMemo(() => getLocalDateString(), []);
  const [form, setForm] = useState(() => newForm(today));
  const [filters, setFilters] = useState({ date: '', completed: '' });
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ state: 'loading', items: [], pagination: null, error: '' });
  const [stats, setStats] = useState({ state: 'loading', data: null, error: '' });
  const [saving, setSaving] = useState(false);
  const createLock = useRef(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState(null);
  const dialogRef = useRef(null);
  const query = useMemo(() => ({ ...filters, page, pageSize: PAGE_SIZE }), [filters, page]);

  const refresh = useCallback(async (signal) => {
    setList((value) => ({ ...value, state: 'loading', error: '' }));
    setStats((value) => ({ ...value, state: 'loading', error: '' }));
    const [listResult, statsResult] = await Promise.allSettled([
      pythonLearningApi.list(query, { signal }),
      pythonLearningApi.stats({ signal }),
    ]);
    if (signal?.aborted) return;
    if (listResult.status === 'fulfilled') { setList({ state: 'success', items: listResult.value.items, pagination: listResult.value.pagination, error: '' }); const lastPage = Math.max(1, listResult.value.pagination.totalPages); if (page > lastPage) setPage(lastPage); }
    else setList((value) => ({ ...value, state: 'error', error: listResult.reason.message || 'Could not load learning history.' }));
    if (statsResult.status === 'fulfilled') setStats({ state: 'success', data: statsResult.value, error: '' });
    else setStats((value) => ({ ...value, state: 'error', data: null, error: statsResult.reason.message || 'Could not load completion statistics.' }));
  }, [query, page]);

  useEffect(() => { const controller = new AbortController(); refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  useEffect(() => { if (editing && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [editing]);

  async function createEntry(event) {
    event.preventDefault();
    if (createLock.current) return;
    createLock.current = true; setSaving(true); setNotice(null);
    try {
      await pythonLearningApi.create(form);
      setForm(newForm(today)); setPage(1);
      setNotice({ kind: 'success', message: 'Learning entry saved.' });
      await refresh();
    } catch (error) {
      setNotice({ kind: 'error', message: error.message || 'Could not save this entry. Your text is still here.' });
    } finally { createLock.current = false; setSaving(false); }
  }

  function beginEdit(entry) {
    setEditing(entry); setEditError('');
    setEditForm({ practiceDate: dateValue(entry.practiceDate), topic: entry.topic, notes: entry.notes || '', exerciseDescription: entry.exerciseDescription || '', completed: entry.completed });
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing || !editForm) return;
    setEditSaving(true); setEditError('');
    try {
      await pythonLearningApi.update(editing.id, editForm);
      setEditing(null); setEditForm(null);
      setNotice({ kind: 'success', message: 'Learning entry updated.' });
      await refresh();
    } catch (error) { setEditError(error.message || 'Could not update this entry.'); }
    finally { setEditSaving(false); }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Delete “${entry.topic}” from your learning history? This cannot be undone.`)) return;
    setBusyId(entry.id); setNotice(null);
    try {
      await pythonLearningApi.remove(entry.id);
      setNotice({ kind: 'success', message: 'Learning entry deleted.' });
      await refresh();
    } catch (error) { setNotice({ kind: 'error', message: error.message || 'Could not delete this entry.' }); }
    finally { setBusyId(''); }
  }

  async function toggleCompleted(entry) {
    setBusyId(entry.id); setNotice(null);
    try { await pythonLearningApi.update(entry.id, { completed: !entry.completed }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', message: error.message || 'Could not update completion.' }); }
    finally { setBusyId(''); }
  }

  const hasFilters = Boolean(filters.date || filters.completed !== '');
  const statData = stats.data;
  return <main className="page-wrap python-learning-page">
    <header className="page-header"><div><div className="eyebrow">PYTHON PRACTICE</div><h1>Python Learning</h1><p>Build a steady learning log with topics, exercises, and progress.</p></div><Link className="button button-secondary" to="/">Dashboard</Link></header>
    {notice && <div className={`page-notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}

    <section className="py-stats" aria-label="Python learning statistics">
      <div className="summary-card"><span className="py-stat-label">LESSONS COMPLETED</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : statData.completedEntries}</strong><small>Entries marked complete</small></div>
      <div className="summary-card"><span className="py-stat-label">TOTAL ENTRIES</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : statData.totalEntries}</strong><small>Completed and in progress</small></div>
      <div className="summary-card"><span className="py-stat-label">IN PROGRESS</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : statData.incompleteEntries}</strong><small>Not yet marked complete</small></div>
      <div className="summary-card"><span className="py-stat-label">COMPLETION RATE</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : `${statData.completionRate}%`}</strong><small>{stats.state === 'error' ? stats.error : 'Based on recorded entries'}</small></div>
    </section>

    <section className="panel py-entry-panel">
      <div className="panel-heading"><div><span className="eyebrow">LOG YOUR WORK</span><h2>Add a learning entry</h2></div><span className="required-hint">Date and topic required</span></div>
      <form className="question-form" onSubmit={createEntry}>
        <div className="py-form-grid">
          <label className="form-field"><span>Practice date <b>*</b></span><input type="date" required value={form.practiceDate} onChange={(event) => setForm({ ...form, practiceDate: event.target.value })} disabled={saving}/></label>
          <label className="form-field"><span>Topic <b>*</b></span><input type="text" required maxLength={180} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="What are you learning?" disabled={saving}/></label>
          <label className="form-field"><span>Completion status</span><select value={String(form.completed)} onChange={(event) => setForm({ ...form, completed: event.target.value === 'true' })} disabled={saving}><option value="false">In progress</option><option value="true">Completed</option></select></label>
        </div>
        <details className="py-details"><summary>Notes and exercise description <span>(optional)</span></summary><div className="py-extra-grid"><label className="form-field"><span>Notes</span><textarea rows="3" maxLength={20000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Capture concepts or questions…" disabled={saving}/></label><label className="form-field"><span>Exercise description</span><textarea rows="3" maxLength={20000} value={form.exerciseDescription} onChange={(event) => setForm({ ...form, exerciseDescription: event.target.value })} placeholder="What did you practise?" disabled={saving}/></label></div></details>
        <div className="form-actions"><button type="submit" className="button button-primary" disabled={saving || !form.practiceDate || !form.topic.trim()}>{saving && <span className="button-spinner"/>}Save entry</button></div>
      </form>
    </section>

    <section className="panel py-outline-panel"><div className="panel-heading"><div><span className="eyebrow">OPTIONAL STARTER OUTLINE</span><h2>Eight-day learning outline</h2></div><span className="py-outline-note">Suggestions only · not logged as work</span></div><p className="py-outline-intro">Select a topic to edit it into your form. Suggestions do not create entries or count as completed.</p><ol className="py-outline-list">{OUTLINE.map((topic, index) => <li key={topic}><span className="py-outline-day">{String(index + 1).padStart(2, '0')}</span><button type="button" onClick={() => { setForm((current) => ({ ...current, topic })); document.querySelector('.py-entry-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{topic}</button></li>)}</ol></section>

    <section className="panel py-history-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR LEARNING LOG</span><h2>Recent history <span className="history-total">{list.pagination?.total ?? '—'}</span></h2></div></div>
      <div className="py-filters"><label className="form-field"><span>Practice date</span><input type="date" value={filters.date} onChange={(event) => { setFilters((current) => ({ ...current, date: event.target.value })); setPage(1); }}/></label><label className="form-field"><span>Completion</span><select value={filters.completed} onChange={(event) => { setFilters((current) => ({ ...current, completed: event.target.value })); setPage(1); }}><option value="">All entries</option><option value="true">Completed</option><option value="false">In progress</option></select></label><button className="clear-filters" type="button" disabled={!hasFilters} onClick={() => { setFilters({ date: '', completed: '' }); setPage(1); }}>Clear filters</button></div>
      {list.state === 'loading' && <div className="questions-loading" role="status"><span className="loading-spinner"/>Loading learning history…</div>}
      {list.state === 'error' && <div className="list-error" role="alert"><span>{list.error}</span><button type="button" className="button button-secondary" onClick={() => refresh()}>Try again</button></div>}
      {list.state === 'success' && list.items.length === 0 && <div className="questions-empty"><span className="empty-symbol">Py</span><strong>{hasFilters ? 'No entries match these filters' : 'No learning entries yet'}</strong><p>{hasFilters ? 'Adjust the filters or clear them to view all entries.' : 'Record your first topic above. The outline is only a set of suggestions.'}</p></div>}
      {list.state === 'success' && list.items.length > 0 && <><div className="py-entry-list">{list.items.map((entry) => <article className="py-entry-row" key={entry.id}><div className="py-entry-top"><div className="py-entry-title"><span className={`py-completion ${entry.completed ? 'is-complete' : 'is-pending'}`} aria-label={entry.completed ? 'Completed' : 'In progress'}>{entry.completed ? '✓' : '○'}</span><div><h3>{entry.topic}</h3><time dateTime={dateValue(entry.practiceDate)}>{formatPracticeDate(entry.practiceDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</time></div></div><div className="py-entry-actions"><label className="py-completion-toggle"><input type="checkbox" checked={entry.completed} disabled={busyId === entry.id} onChange={() => toggleCompleted(entry)}/><span>Completed</span></label><button className="icon-action" type="button" onClick={() => beginEdit(entry)} aria-label={`Edit ${entry.topic}`}>✎</button><button className="icon-action delete-action" type="button" disabled={busyId === entry.id} onClick={() => deleteEntry(entry)} aria-label={`Delete ${entry.topic}`}>×</button></div></div>{(entry.exerciseDescription || entry.notes) && <div className="py-entry-body">{entry.exerciseDescription && <p><b>Exercise:</b> {entry.exerciseDescription}</p>}{entry.notes && <p><b>Notes:</b> {entry.notes}</p>}</div>}</article>)}</div><div className="pagination-bar"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, list.pagination.total)} of {list.pagination.total}</span><div className="pagination-controls"><button className="page-button" type="button" disabled={page <= 1 || list.state === 'loading'} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page">←</button><span>Page {list.pagination.page} of {Math.max(1, list.pagination.totalPages)}</span><button className="page-button" type="button" disabled={page >= list.pagination.totalPages || list.state === 'loading'} onClick={() => setPage((value) => Math.min(list.pagination.totalPages, value + 1))} aria-label="Next page">→</button></div></div></>}
    </section>

    {editing && editForm && <dialog className="edit-dialog py-edit-dialog" ref={dialogRef} aria-labelledby="py-edit-title" onCancel={(event) => { if (editSaving) event.preventDefault(); }} onClose={() => { setEditing(null); setEditForm(null); setEditError(''); }}><div className="panel-heading"><div><span className="eyebrow">UPDATE LEARNING LOG</span><h2 id="py-edit-title">Edit entry</h2></div><button type="button" className="modal-close" aria-label="Close edit form" disabled={editSaving} onClick={() => dialogRef.current?.close()}>×</button></div>{editError && <div className="page-notice notice-error" role="alert">{editError}</div>}<form className="question-form" onSubmit={saveEdit}><div className="py-form-grid"><label className="form-field"><span>Practice date <b>*</b></span><input type="date" required value={editForm.practiceDate} onChange={(event) => setEditForm({ ...editForm, practiceDate: event.target.value })}/></label><label className="form-field"><span>Topic <b>*</b></span><input type="text" required maxLength={180} value={editForm.topic} onChange={(event) => setEditForm({ ...editForm, topic: event.target.value })}/></label><label className="form-field"><span>Completion status</span><select value={String(editForm.completed)} onChange={(event) => setEditForm({ ...editForm, completed: event.target.value === 'true' })}><option value="false">In progress</option><option value="true">Completed</option></select></label></div><label className="form-field"><span>Exercise description</span><textarea rows="3" maxLength={20000} value={editForm.exerciseDescription} onChange={(event) => setEditForm({ ...editForm, exerciseDescription: event.target.value })}/></label><label className="form-field"><span>Notes</span><textarea rows="3" maxLength={20000} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}/></label><div className="form-actions"><button type="button" className="button button-secondary" disabled={editSaving} onClick={() => dialogRef.current?.close()}>Cancel</button><button type="submit" className="button button-primary" disabled={editSaving}>{editSaving && <span className="button-spinner"/>}Save changes</button></div></form></dialog>}
  </main>;
}
