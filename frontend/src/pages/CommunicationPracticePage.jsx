import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { communicationPracticeApi, formatPracticeDate, getLocalDateString } from '../services/apiClient.js';
import '../styles/communicationPractice.css';

const PAGE_SIZE = 10;
const newSession = (practiceDate = getLocalDateString()) => ({ practiceDate, topic: '', durationMinutes: '', notes: '', completed: false });
const dateValue = (value) => String(value).slice(0, 10);

export default function CommunicationPracticePage() {
  const today = useMemo(() => getLocalDateString(), []);
  const [form, setForm] = useState(() => newSession(today));
  const [filters, setFilters] = useState({ date: '', completed: '' });
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ state: 'loading', items: [], pagination: null, error: '' });
  const [stats, setStats] = useState({ state: 'loading', data: null, error: '' });
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const createLock = useRef(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const dialogRef = useRef(null);
  const query = useMemo(() => ({ ...filters, page, pageSize: PAGE_SIZE }), [filters, page]);

  const refresh = useCallback(async (signal) => {
    setList((current) => ({ ...current, state: 'loading', error: '' }));
    setStats((current) => ({ ...current, state: 'loading', error: '' }));
    const [listResult, statsResult] = await Promise.allSettled([
      communicationPracticeApi.list(query, { signal }),
      communicationPracticeApi.stats({ signal }),
    ]);
    if (signal?.aborted) return;
    if (listResult.status === 'fulfilled') { setList({ state: 'success', items: listResult.value.items, pagination: listResult.value.pagination, error: '' }); const lastPage = Math.max(1, listResult.value.pagination.totalPages); if (page > lastPage) setPage(lastPage); }
    else setList((current) => ({ ...current, state: 'error', error: listResult.reason.message || 'Could not load sessions.' }));
    if (statsResult.status === 'fulfilled') setStats({ state: 'success', data: statsResult.value, error: '' });
    else setStats({ state: 'error', data: null, error: statsResult.reason.message || 'Could not load session statistics.' });
  }, [query, page]);

  useEffect(() => { const controller = new AbortController(); refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  useEffect(() => { if (editing && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [editing]);

  async function createSession(event) {
    event.preventDefault();
    if (createLock.current) return;
    createLock.current = true; setSaving(true); setNotice(null);
    try {
      await communicationPracticeApi.create({ ...form, durationMinutes: Number(form.durationMinutes) });
      setForm(newSession(today)); setPage(1); setNotice({ kind: 'success', message: 'Practice session saved.' }); await refresh();
    } catch (error) { setNotice({ kind: 'error', message: error.message || 'Could not save this session. Your entries are still here.' }); }
    finally { createLock.current = false; setSaving(false); }
  }

  function beginEdit(session) {
    setEditing(session); setEditError('');
    setEditForm({ practiceDate: dateValue(session.practiceDate), topic: session.topic, durationMinutes: String(session.durationMinutes), notes: session.notes || '', completed: session.completed });
  }

  async function saveEdit(event) {
    event.preventDefault(); if (!editing || !editForm) return;
    setEditSaving(true); setEditError('');
    try {
      await communicationPracticeApi.update(editing.id, { ...editForm, durationMinutes: Number(editForm.durationMinutes) });
      setEditing(null); setEditForm(null); setNotice({ kind: 'success', message: 'Practice session updated.' }); await refresh();
    } catch (error) { setEditError(error.message || 'Could not update this session.'); }
    finally { setEditSaving(false); }
  }

  async function toggleCompleted(session) {
    setBusyId(session.id); setNotice(null);
    try { await communicationPracticeApi.update(session.id, { completed: !session.completed }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', message: error.message || 'Could not update completion status.' }); }
    finally { setBusyId(''); }
  }

  async function deleteSession(session) {
    if (!window.confirm(`Delete “${session.topic}” from your practice history? This cannot be undone.`)) return;
    setBusyId(session.id); setNotice(null);
    try { await communicationPracticeApi.remove(session.id); setNotice({ kind: 'success', message: 'Practice session deleted.' }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', message: error.message || 'Could not delete this session.' }); }
    finally { setBusyId(''); }
  }

  const hasFilters = Boolean(filters.date || filters.completed !== '');
  return <main className="page-wrap communication-page">
    <header className="page-header"><div><div className="eyebrow">SPEAKING & INTERVIEW PRACTICE</div><h1>Communication Practice</h1><p>Track deliberate practice, session length, and your reflections.</p></div><Link className="button button-secondary" to="/">Dashboard</Link></header>
    {notice && <div className={`page-notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}

    <section className="cp-stats" aria-label="Communication practice statistics">
      <StatCard label="TOTAL SESSIONS" value={stats.data?.totalSessions} state={stats.state} error={stats.error}/>
      <StatCard label="SESSIONS COMPLETED" value={stats.data?.completedSessions} state={stats.state} error={stats.error}/>
      <StatCard label="IN PROGRESS" value={stats.data?.incompleteSessions} state={stats.state} error={stats.error}/>
    </section>

    <section className="panel cp-entry-panel"><div className="panel-heading"><div><span className="eyebrow">LOG A SESSION</span><h2>Add practice session</h2></div><span className="required-hint">Date, topic and duration required</span></div>
      <form className="question-form" onSubmit={createSession}><div className="cp-form-grid">
        <label className="form-field"><span>Practice date <b>*</b></span><input type="date" required value={form.practiceDate} onChange={(event) => setForm({ ...form, practiceDate: event.target.value })} disabled={saving}/></label>
        <label className="form-field"><span>Topic or activity <b>*</b></span><input type="text" required maxLength={180} placeholder="e.g. Mock interview introduction" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} disabled={saving}/></label>
        <label className="form-field"><span>Duration in minutes <b>*</b></span><input type="number" required min="0" max="1440" step="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} disabled={saving}/></label>
        <label className="form-field"><span>Completion status</span><select value={String(form.completed)} onChange={(event) => setForm({ ...form, completed: event.target.value === 'true' })} disabled={saving}><option value="false">In progress</option><option value="true">Completed</option></select></label>
      </div><details className="cp-notes"><summary>Notes or self-assessment <span>(optional)</span></summary><label className="form-field"><span>Reflection</span><textarea rows="3" maxLength={20000} placeholder="What went well? What would you improve next time?" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={saving}/></label></details>
        <div className="form-actions"><button type="submit" className="button button-primary" disabled={saving || !form.practiceDate || !form.topic.trim() || form.durationMinutes === ''}>{saving && <span className="button-spinner"/>}Save session</button></div>
      </form>
    </section>

    <section className="panel cp-history-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR PRACTICE LOG</span><h2>Recent sessions <span className="history-total">{list.pagination?.total ?? '—'}</span></h2></div></div>
      <div className="cp-filters"><label className="form-field"><span>Practice date</span><input type="date" value={filters.date} onChange={(event) => { setFilters((current) => ({ ...current, date: event.target.value })); setPage(1); }}/></label><label className="form-field"><span>Completion</span><select value={filters.completed} onChange={(event) => { setFilters((current) => ({ ...current, completed: event.target.value })); setPage(1); }}><option value="">All sessions</option><option value="true">Completed</option><option value="false">In progress</option></select></label><button className="clear-filters" type="button" disabled={!hasFilters} onClick={() => { setFilters({ date: '', completed: '' }); setPage(1); }}>Clear filters</button></div>
      {list.state === 'loading' && <div className="questions-loading" role="status"><span className="loading-spinner"/>Loading practice history…</div>}
      {list.state === 'error' && <div className="list-error" role="alert"><span>{list.error}</span><button type="button" className="button button-secondary" onClick={() => refresh()}>Try again</button></div>}
      {list.state === 'success' && list.items.length === 0 && <div className="questions-empty"><span className="empty-symbol">◉</span><strong>{hasFilters ? 'No sessions match these filters' : 'No practice sessions yet'}</strong><p>{hasFilters ? 'Adjust your filters or clear them to see all sessions.' : 'Log your first practice session above to start your history.'}</p></div>}
      {list.state === 'success' && list.items.length > 0 && <><div className="cp-session-list">{list.items.map((session) => <article className="cp-session-row" key={session.id}><div className="cp-session-main"><span className={`cp-completion ${session.completed ? 'complete' : ''}`} aria-label={session.completed ? 'Completed' : 'In progress'}>{session.completed ? '✓' : '○'}</span><div className="cp-session-copy"><div className="cp-session-title"><h3>{session.topic}</h3><span>{session.completed ? 'Completed' : 'In progress'}</span></div><div className="cp-session-meta"><time dateTime={dateValue(session.practiceDate)}>{formatPracticeDate(session.practiceDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</time><span>{session.durationMinutes} min</span></div>{session.notes && <p>{session.notes}</p>}</div></div><div className="cp-session-actions"><label className="cp-complete-toggle"><input type="checkbox" checked={session.completed} disabled={busyId === session.id} onChange={() => toggleCompleted(session)}/><span>Completed</span></label><button className="icon-action" type="button" onClick={() => beginEdit(session)} aria-label={`Edit ${session.topic}`}>✎</button><button className="icon-action delete-action" type="button" disabled={busyId === session.id} onClick={() => deleteSession(session)} aria-label={`Delete ${session.topic}`}>×</button></div></article>)}</div><div className="pagination-bar"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, list.pagination.total)} of {list.pagination.total}</span><div className="pagination-controls"><button className="page-button" type="button" disabled={page <= 1 || list.state === 'loading'} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page">←</button><span>Page {list.pagination.page} of {Math.max(1, list.pagination.totalPages)}</span><button className="page-button" type="button" disabled={page >= list.pagination.totalPages || list.state === 'loading'} onClick={() => setPage((value) => Math.min(list.pagination.totalPages, value + 1))} aria-label="Next page">→</button></div></div></>}
    </section>

    {editing && editForm && <dialog className="edit-dialog cp-edit-dialog" ref={dialogRef} aria-labelledby="cp-edit-title" onCancel={(event) => { if (editSaving) event.preventDefault(); }} onClose={() => { setEditing(null); setEditForm(null); setEditError(''); }}><div className="panel-heading"><div><span className="eyebrow">UPDATE PRACTICE LOG</span><h2 id="cp-edit-title">Edit session</h2></div><button type="button" className="modal-close" aria-label="Close edit form" disabled={editSaving} onClick={() => dialogRef.current?.close()}>×</button></div>{editError && <div className="page-notice notice-error" role="alert">{editError}</div>}<form className="question-form" onSubmit={saveEdit}><div className="cp-form-grid"><label className="form-field"><span>Practice date <b>*</b></span><input type="date" required value={editForm.practiceDate} onChange={(event) => setEditForm({ ...editForm, practiceDate: event.target.value })}/></label><label className="form-field"><span>Topic or activity <b>*</b></span><input type="text" required maxLength={180} value={editForm.topic} onChange={(event) => setEditForm({ ...editForm, topic: event.target.value })}/></label><label className="form-field"><span>Duration in minutes <b>*</b></span><input type="number" required min="0" max="1440" step="1" value={editForm.durationMinutes} onChange={(event) => setEditForm({ ...editForm, durationMinutes: event.target.value })}/></label><label className="form-field"><span>Completion status</span><select value={String(editForm.completed)} onChange={(event) => setEditForm({ ...editForm, completed: event.target.value === 'true' })}><option value="false">In progress</option><option value="true">Completed</option></select></label></div><label className="form-field"><span>Notes or self-assessment</span><textarea rows="3" maxLength={20000} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}/></label><div className="form-actions"><button type="button" className="button button-secondary" disabled={editSaving} onClick={() => dialogRef.current?.close()}>Cancel</button><button type="submit" className="button button-primary" disabled={editSaving}>{editSaving && <span className="button-spinner"/>}Save changes</button></div></form></dialog>}
  </main>;
}

function StatCard({ label, value, state, error }) { return <div className="summary-card"><span className="cp-stat-label">{label}</span><strong>{state === 'loading' ? '…' : state === 'error' ? 'Unavailable' : value ?? 0}</strong><small>{state === 'error' ? error : 'From recorded sessions'}</small></div>; }
