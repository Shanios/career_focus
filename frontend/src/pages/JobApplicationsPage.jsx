import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPracticeDate, jobApplicationsApi } from '../services/apiClient.js';
import '../styles/jobApplications.css';

const PAGE_SIZE = 10;
const STATUSES = ['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];
const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'OTHER'];
const ARRANGEMENTS = ['ONSITE', 'HYBRID', 'REMOTE'];
const blankForm = () => ({ companyName: '', jobTitle: '', jobUrl: '', status: 'SAVED', applicationDate: '', jobDescription: '', jobType: '', workArrangement: '', matchAssessment: '', resumeVersion: '', followUpDate: '', notes: '' });
const labels = { SAVED: 'Saved', APPLIED: 'Applied', ASSESSMENT: 'Assessment', INTERVIEW: 'Interview', OFFER: 'Offer', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' };
const pretty = (value) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateValue = (value) => value ? String(value).slice(0, 10) : '';

function toPayload(form, previousStatus) {
  const payload = { ...form };
  for (const key of ['jobUrl', 'jobDescription', 'jobType', 'workArrangement', 'matchAssessment', 'resumeVersion', 'followUpDate', 'notes']) if (!payload[key]) payload[key] = null;
  if (!payload.applicationDate && payload.status === 'APPLIED' && (previousStatus === undefined || previousStatus === 'SAVED')) delete payload.applicationDate;
  else if (!payload.applicationDate) payload.applicationDate = null;
  return payload;
}

export default function JobApplicationsPage() {
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ state: 'loading', items: [], pagination: null, error: '' });
  const [stats, setStats] = useState({ state: 'loading', data: null, error: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const dialogRef = useRef(null);
  const createLock = useRef(false);
  const query = useMemo(() => ({ search: search.trim(), status, startDate, endDate, page, pageSize: PAGE_SIZE }), [search, status, startDate, endDate, page]);

  const refresh = useCallback(async (signal) => {
    setList((value) => ({ ...value, state: 'loading', error: '' }));
    setStats((value) => ({ ...value, state: 'loading', error: '' }));
    const [listResult, statsResult] = await Promise.allSettled([jobApplicationsApi.list(query, { signal }), jobApplicationsApi.stats({}, { signal })]);
    if (signal?.aborted) return;
    if (listResult.status === 'fulfilled') { setList({ state: 'success', items: listResult.value.items, pagination: listResult.value.pagination, error: '' }); const lastPage = Math.max(1, listResult.value.pagination.totalPages); if (page > lastPage) setPage(lastPage); }
    else setList((value) => ({ ...value, state: 'error', error: listResult.reason.message || 'Could not load applications.' }));
    if (statsResult.status === 'fulfilled') setStats({ state: 'success', data: statsResult.value, error: '' });
    else setStats((value) => ({ ...value, state: 'error', error: statsResult.reason.message || 'Could not load application statistics.' }));
  }, [query, page]);

  useEffect(() => { const controller = new AbortController(); refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  useEffect(() => { if (editing && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [editing]);

  async function createApplication(event) {
    event.preventDefault();
    if (createLock.current) return;
    createLock.current = true; setSaving(true); setNotice(null);
    try { await jobApplicationsApi.create(toPayload(form)); setForm(blankForm()); setPage(1); setNotice({ kind: 'success', text: 'Application saved.' }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', text: error.message || 'Could not save this application. Your entries are still here.' }); }
    finally { createLock.current = false; setSaving(false); }
  }

  function beginEdit(item) {
    setEditing(item); setEditError('');
    const next = { ...blankForm(), ...item, applicationDate: dateValue(item.applicationDate), followUpDate: dateValue(item.followUpDate) };
    for (const key of Object.keys(next)) if (next[key] === null) next[key] = '';
    setEditForm(next);
  }

  async function saveEdit(event) {
    event.preventDefault(); setEditSaving(true);
    try { await jobApplicationsApi.update(editing.id, toPayload(editForm, editing.status)); setEditing(null); setEditForm(null); setNotice({ kind: 'success', text: 'Application updated.' }); await refresh(); }
    catch (error) { setEditError(error.message || 'Could not update this application.'); }
    finally { setEditSaving(false); }
  }

  async function changeStatus(item, nextStatus) {
    setBusyId(item.id); setNotice(null);
    try { await jobApplicationsApi.update(item.id, { status: nextStatus }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', text: error.message || 'Could not update status.' }); }
    finally { setBusyId(''); }
  }

  async function deleteApplication(item) {
    if (!window.confirm(`Delete the ${item.jobTitle} application at ${item.companyName}? This cannot be undone.`)) return;
    setBusyId(item.id); setNotice(null);
    try { await jobApplicationsApi.remove(item.id); setNotice({ kind: 'success', text: 'Application deleted.' }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', text: error.message || 'Could not delete this application.' }); }
    finally { setBusyId(''); }
  }

  function field(field, title, type = 'text', options) {
    if (options) return <label className="form-field" key={field}><span>{title}</span><select value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })}><option value="">Not specified</option>{options.map((option) => <option key={option} value={option}>{pretty(option)}</option>)}</select></label>;
    return <label className="form-field" key={field}><span>{title}</span><input type={type} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} maxLength={type === 'url' ? 2048 : undefined} /></label>;
  }
  function editFields() {
    return <>
      <div className="ja-form-grid">{['companyName', 'jobTitle', 'jobUrl', 'applicationDate'].map((key) => field(key, { companyName: 'Company', jobTitle: 'Job title', jobUrl: 'Job URL', applicationDate: 'Application date' }[key], key === 'applicationDate' ? 'date' : key === 'jobUrl' ? 'url' : 'text'))}
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((s) => <option value={s} key={s}>{labels[s]}</option>)}</select></label>
        {field('jobType', 'Job type', 'text', JOB_TYPES)}{field('workArrangement', 'Work arrangement', 'text', ARRANGEMENTS)}{field('followUpDate', 'Follow-up date', 'date')}{field('resumeVersion', 'Resume version')}</div>
      <label className="form-field"><span>Job description</span><textarea rows="3" maxLength="20000" value={form.jobDescription} onChange={(event) => setForm({ ...form, jobDescription: event.target.value })} /></label>
      <label className="form-field"><span>Match assessment</span><textarea rows="2" maxLength="5000" value={form.matchAssessment} onChange={(event) => setForm({ ...form, matchAssessment: event.target.value })} /></label>
      <label className="form-field"><span>Notes</span><textarea rows="2" maxLength="20000" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
    </>;
  }

  const hasFilters = Boolean(search || status || startDate || endDate);
  const submitted = stats.data?.submitted ?? 0;
  return <main className="page-wrap job-applications-page">
    <header className="page-header"><div><div className="eyebrow">CAREER SPRINT</div><h1>Job Applications</h1><p>Track every role, follow-up, and application outcome in one place.</p></div><Link to="/" className="button button-secondary">Dashboard</Link></header>
    {notice && <div className={`page-notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}
    <section className="ja-stats" aria-label="Application statistics">
      <div className="summary-card"><span className="ja-stat-label">SUBMITTED / TARGET</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : `${submitted} / 100`}</strong><small>{stats.state === 'error' ? stats.error : `${stats.data?.saved ?? 0} saved, not yet submitted`}</small></div>
      <div className="summary-card"><span className="ja-stat-label">TOTAL TRACKED</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : stats.data?.total ?? 0}</strong><small>All application statuses</small></div>
      <div className="summary-card"><span className="ja-stat-label">INTERVIEWS</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : stats.data?.byStatus?.INTERVIEW ?? 0}</strong><small>Applications at interview stage</small></div>
      <div className="summary-card"><span className="ja-stat-label">OFFERS</span><strong>{stats.state === 'loading' ? '…' : stats.state === 'error' ? 'Unavailable' : stats.data?.byStatus?.OFFER ?? 0}</strong><small>Offers received</small></div>
    </section>
    <section className="panel ja-entry-panel"><div className="panel-heading"><div><span className="eyebrow">ADD A ROLE</span><h2>New application</h2></div><span className="required-hint">Company and job title required</span></div>
      <form className="question-form" onSubmit={createApplication}><div className="ja-form-grid">{field('companyName', 'Company *')}{field('jobTitle', 'Job title *')}{field('jobUrl', 'Job URL', 'url')}{field('applicationDate', 'Application date', 'date')}
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((s) => <option value={s} key={s}>{labels[s]}</option>)}</select></label>
        {field('jobType', 'Job type', 'text', JOB_TYPES)}{field('workArrangement', 'Work arrangement', 'text', ARRANGEMENTS)}{field('followUpDate', 'Follow-up date', 'date')}{field('resumeVersion', 'Resume version')}</div>
        <details className="ja-extra-fields"><summary>Job details, match assessment and notes</summary><div className="ja-extra-grid"><label className="form-field"><span>Job description</span><textarea rows="3" maxLength="20000" value={form.jobDescription} onChange={(event) => setForm({ ...form, jobDescription: event.target.value })} /></label><label className="form-field"><span>Match assessment</span><textarea rows="3" maxLength="5000" value={form.matchAssessment} onChange={(event) => setForm({ ...form, matchAssessment: event.target.value })} /></label><label className="form-field"><span>Notes</span><textarea rows="3" maxLength="20000" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div></details>
        <div className="form-actions"><button type="submit" className="button button-primary" disabled={saving || !form.companyName.trim() || !form.jobTitle.trim()}>{saving && <span className="button-spinner"/>}Save application</button></div></form>
    </section>
    <section className="panel ja-history-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR JOB SEARCH</span><h2>Application history <span className="history-total">{list.pagination?.total ?? '—'}</span></h2></div></div>
      <div className="ja-filters"><label className="form-field"><span>Search company or job title</span><input type="search" placeholder="Search roles…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><label className="form-field"><span>Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</select></label><label className="form-field"><span>Applied from</span><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} /></label><label className="form-field"><span>Applied to</span><input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} /></label><button className="clear-filters" type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setStatus(''); setStartDate(''); setEndDate(''); setPage(1); }}>Clear filters</button></div>
      {list.state === 'loading' && <div className="questions-loading" role="status"><span className="loading-spinner"/>Loading applications…</div>}
      {list.state === 'error' && <div className="list-error" role="alert"><span>{list.error}</span><button type="button" className="button button-secondary" onClick={() => refresh()}>Try again</button></div>}
      {list.state === 'success' && list.items.length === 0 && <div className="questions-empty"><strong>{hasFilters ? 'No applications match these filters' : 'No applications tracked yet'}</strong><p>{hasFilters ? 'Adjust the filters or clear them to view all records.' : 'Add a role above to start your job search log.'}</p></div>}
      {list.state === 'success' && list.items.length > 0 && <><div className="ja-list">{list.items.map((item) => <article className="ja-row" key={item.id}><div className="ja-company"><span className={`ja-status status-${item.status.toLowerCase()}`}>{labels[item.status]}</span><strong>{item.companyName}</strong><span>{item.jobTitle}</span></div><div className="ja-meta"><span>{item.applicationDate ? `Applied ${formatPracticeDate(item.applicationDate)}` : 'Application date not set'}</span>{item.followUpDate && <span>Follow up {formatPracticeDate(item.followUpDate)}</span>}{item.workArrangement && <span>{pretty(item.workArrangement)}</span>}{item.jobType && <span>{pretty(item.jobType)}</span>}</div><div className="ja-row-actions"><label className="sr-only" htmlFor={`status-${item.id}`}>Status for {item.companyName}, {item.jobTitle}</label><select id={`status-${item.id}`} aria-label={`Status for ${item.companyName}, ${item.jobTitle}`} disabled={busyId === item.id} value={item.status} onChange={(event) => changeStatus(item, event.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</select><button className="icon-action" type="button" onClick={() => beginEdit(item)} aria-label={`Edit ${item.jobTitle} at ${item.companyName}`}>✎</button><button className="icon-action delete-action" type="button" disabled={busyId === item.id} onClick={() => deleteApplication(item)} aria-label={`Delete ${item.jobTitle} at ${item.companyName}`}>×</button></div>{(item.jobUrl || item.jobDescription || item.matchAssessment || item.notes) && <div className="ja-row-detail">{item.jobUrl && <a href={item.jobUrl} target="_blank" rel="noreferrer">View job posting ↗</a>}{item.jobDescription && <p>{item.jobDescription}</p>}{item.matchAssessment && <p><b>Match:</b> {item.matchAssessment}</p>}{item.notes && <p><b>Notes:</b> {item.notes}</p>}</div>}</article>)}</div><div className="pagination-bar"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, list.pagination.total)} of {list.pagination.total}</span><div className="pagination-controls"><button className="page-button" type="button" disabled={page <= 1 || list.state === 'loading'} onClick={() => setPage((n) => Math.max(1, n - 1))}>←</button><span>Page {list.pagination.page} of {Math.max(1, list.pagination.totalPages)}</span><button className="page-button" type="button" disabled={page >= list.pagination.totalPages || list.state === 'loading'} onClick={() => setPage((n) => Math.min(list.pagination.totalPages, n + 1))}>→</button></div></div></>}
    </section>
    {editing && editForm && <dialog ref={dialogRef} className="edit-dialog ja-dialog" aria-labelledby="ja-edit-title" onCancel={(event) => { if (editSaving) event.preventDefault(); }} onClose={() => { setEditing(null); setEditForm(null); setEditError(''); }}><div className="panel-heading"><div><span className="eyebrow">UPDATE APPLICATION</span><h2 id="ja-edit-title">Edit {editing.companyName}</h2></div><button type="button" className="modal-close" disabled={editSaving} onClick={() => dialogRef.current?.close()}>×</button></div>{editError && <div className="page-notice notice-error" role="alert">{editError}</div>}<form className="question-form" onSubmit={saveEdit}><div className="ja-form-grid">{['companyName', 'jobTitle', 'jobUrl', 'applicationDate'].map((key) => { const title = { companyName: 'Company *', jobTitle: 'Job title *', jobUrl: 'Job URL', applicationDate: 'Application date' }[key]; return <label className="form-field" key={key}><span>{title}</span><input type={key === 'applicationDate' ? 'date' : key === 'jobUrl' ? 'url' : 'text'} required={key !== 'jobUrl'} value={editForm[key]} onChange={(event) => setEditForm({ ...editForm, [key]: event.target.value })}/></label>; })}<label className="form-field"><span>Status</span><select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</select></label>{['jobType', 'workArrangement'].map((key) => <label className="form-field" key={key}><span>{pretty(key)}</span><select value={editForm[key]} onChange={(event) => setEditForm({ ...editForm, [key]: event.target.value })}><option value="">Not specified</option>{(key === 'jobType' ? JOB_TYPES : ARRANGEMENTS).map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></label>)}{['followUpDate', 'resumeVersion'].map((key) => <label className="form-field" key={key}><span>{pretty(key)}</span><input type={key === 'followUpDate' ? 'date' : 'text'} value={editForm[key]} onChange={(event) => setEditForm({ ...editForm, [key]: event.target.value })}/></label>)}</div>{['jobDescription', 'matchAssessment', 'notes'].map((key) => <label className="form-field" key={key}><span>{pretty(key)}</span><textarea rows="2" value={editForm[key]} onChange={(event) => setEditForm({ ...editForm, [key]: event.target.value })}/></label>)}<div className="form-actions"><button className="button button-secondary" type="button" disabled={editSaving} onClick={() => dialogRef.current?.close()}>Cancel</button><button className="button button-primary" type="submit" disabled={editSaving}>{editSaving && <span className="button-spinner"/>}Save changes</button></div></form></dialog>}
  </main>;
}
