import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { dailyProgressApi, getLocalDateString } from '../services/apiClient.js';
import '../styles/dailyProgress.css';

const TARGET_FIELDS = [
  ['jobApplications', 'Job applications submitted'],
  ['dsaQuestions', 'DSA questions'],
  ['interviewQuestions', 'Interview coding questions'],
  ['pythonLessons', 'Python lessons completed'],
  ['communicationSessions', 'Communication sessions completed'],
];
const METRICS = [
  ['jobApplications', 'Applications submitted', '/applications', 'Submitted applications'],
  ['dsaQuestions', 'DSA questions', '/coding', 'Recorded DSA questions'],
  ['interviewQuestions', 'Interview coding questions', '/coding', 'Recorded interview questions'],
  ['pythonLessons', 'Python lessons completed', '/python', 'Completed lessons'],
  ['communicationSessions', 'Communication sessions completed', '/communication', 'Completed sessions'],
];
const formatDate = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
};
function shiftDate(value, amount) { const [year, month, day] = value.split('-').map(Number); const date = new Date(year, month - 1, day); date.setDate(date.getDate() + amount); return getLocalDateString(date); }

export default function DailyProgressPage() {
  const today = useMemo(() => getLocalDateString(), []);
  const [date, setDate] = useState(today);
  const [reload, setReload] = useState(0);
  const [progress, setProgress] = useState({ state: 'loading', data: null, error: '' });
  const [targetState, setTargetState] = useState({ state: 'loading', error: '' });
  const [targetForm, setTargetForm] = useState({});
  const [savingTargets, setSavingTargets] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadProgress = useCallback(async (signal) => {
    setProgress((current) => ({ ...current, state: 'loading', error: '' }));
    try {
      const data = await dailyProgressApi.get(date, { signal });
      if (!signal?.aborted) setProgress({ state: 'success', data, error: '' });
    } catch (error) {
      if (!signal?.aborted) setProgress({ state: 'error', data: null, error: error.message || 'Could not load daily progress.' });
    }
  }, [date]);

  useEffect(() => { const controller = new AbortController(); loadProgress(controller.signal); return () => controller.abort(); }, [loadProgress, reload]);
  useEffect(() => {
    const controller = new AbortController();
    dailyProgressApi.targets({ signal: controller.signal }).then(({ targets }) => {
      if (controller.signal.aborted) return;
      setTargetForm(Object.fromEntries(TARGET_FIELDS.map(([key]) => [key, String(targets[key])])));
      setTargetState({ state: 'success', error: '' });
    }).catch((error) => { if (!controller.signal.aborted) setTargetState({ state: 'error', error: error.message || 'Could not load daily targets.' }); });
    return () => controller.abort();
  }, []);

  async function saveTargets(event) {
    event.preventDefault(); setSavingTargets(true); setNotice(null);
    const targets = Object.fromEntries(TARGET_FIELDS.map(([key]) => [key, Number(targetForm[key])]));
    try {
      const result = await dailyProgressApi.updateTargets(targets);
      setTargetForm(Object.fromEntries(TARGET_FIELDS.map(([key]) => [key, String(result.targets[key])])));
      setTargetState({ state: 'success', error: '' });
      setNotice({ kind: 'success', message: 'Daily targets saved.' });
      setReload((value) => value + 1);
    } catch (error) { setNotice({ kind: 'error', message: error.message || 'Could not save daily targets.' }); }
    finally { setSavingTargets(false); }
  }

  const data = progress.data;
  const empty = data?.complete && data.totalCompletedActivities === 0;
  const hasUnavailable = data && Object.values(data.metrics).some((metric) => !metric.available);
  return <main className="page-wrap daily-progress-page">
    <header className="page-header"><div><div className="eyebrow">DAILY REVIEW</div><h1>Daily Progress</h1><p>Review activity recorded for a selected local calendar day.</p></div><Link className="button button-secondary" to="/">Dashboard</Link></header>
    {notice && <div className={`page-notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}

    <section className="panel dp-date-panel" aria-label="Select progress date"><button type="button" className="page-button" aria-label="Previous day" onClick={() => setDate((value) => shiftDate(value, -1))}>←</button><label className="form-field"><span>Progress for</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><button type="button" className="page-button" aria-label="Next day" onClick={() => setDate((value) => shiftDate(value, 1))}>→</button><button type="button" className="dp-today-button" disabled={date === today} onClick={() => setDate(today)}>Today</button><strong>{formatDate(date)}</strong></section>

    {progress.state === 'loading' && <section className="panel dp-state" role="status"><span className="loading-spinner"/>Loading activity for this date…</section>}
    {progress.state === 'error' && <section className="panel dp-state dp-error" role="alert"><strong>Daily progress could not be loaded</strong><p>{progress.error}</p><button className="button button-secondary" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></section>}
    {progress.state === 'success' && <>
      <section className="dp-overview-grid" aria-label="Daily totals">
        <article className="summary-card dp-overview-card"><span className="dp-overview-label">COMPLETED ACTIVITIES</span><strong>{data.totalCompletedActivities ?? 'Partial'}</strong><small>{data.complete ? 'Recorded or completed for this date' : 'Some activity sources are unavailable'}</small></article>
        <article className="summary-card dp-overview-card"><span className="dp-overview-label">OUTSTANDING TARGETS</span><strong>{data.outstandingTargets ?? 'Partial'}</strong><small>{data.complete ? 'Remaining to reach configured goals' : 'Some target gaps cannot be calculated'}</small></article>
      </section>
      {hasUnavailable && <div className="dp-partial-note" role="status">Some module data is temporarily unavailable. Available activity remains visible; unavailable values are not treated as zero.</div>}
      {empty && <div className="dp-empty-day"><strong>No activity recorded for this day</strong><p>This is an empty log, not a failed day. You can still add or complete work in the modules below.</p></div>}
      <section className="panel dp-metrics-panel"><div className="panel-heading"><div><span className="eyebrow">ACTUAL ACTIVITY VS TARGET</span><h2>{formatDate(date)}</h2></div></div><div className="dp-metrics-list">
        {METRICS.map(([key, label, to, explanation]) => {
          const metric = data.metrics[key];
          return <article className={`dp-metric ${metric.available ? '' : 'dp-metric-unavailable'}`} key={key}><div className="dp-metric-copy"><div className="dp-metric-heading"><h3>{label}</h3><span>{metric.available ? `${metric.actual} / ${metric.target}` : 'Unavailable'}</span></div><small>{metric.available ? explanation : 'This metric could not be retrieved right now.'}</small><div className="dp-progress-track" role="progressbar" aria-label={`${label} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={metric.progressPercent ?? 0}><i style={{ width: `${metric.progressPercent ?? 0}%` }}/></div></div><div className="dp-metric-meta"><span>{metric.available ? (metric.remaining === 0 ? 'Target met' : `${metric.remaining} remaining`) : 'Try again later'}</span><Link to={to}>Open module →</Link></div></article>;
        })}
      </div></section>
    </>}

    <section className="panel dp-targets-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR DAILY GOALS</span><h2>Daily targets</h2></div><span className="required-hint">Whole numbers · 0–1000</span></div><p className="dp-target-intro">Targets are goals only. Actual counts come from your saved activity.</p>
      {targetState.state === 'loading' && <div className="questions-loading" role="status"><span className="loading-spinner"/>Loading targets…</div>}
      {targetState.state === 'error' && <div className="dp-target-error" role="alert">{targetState.error}<button className="text-link" type="button" onClick={() => { setTargetState({ state: 'loading', error: '' }); dailyProgressApi.targets().then(({ targets }) => { setTargetForm(Object.fromEntries(TARGET_FIELDS.map(([key]) => [key, String(targets[key])]))); setTargetState({ state: 'success', error: '' }); }).catch((error) => setTargetState({ state: 'error', error: error.message })); }}>Retry</button></div>}
      {targetState.state === 'success' && <form className="dp-target-form" onSubmit={saveTargets}><div className="dp-target-grid">{TARGET_FIELDS.map(([key, label]) => <label className="form-field" key={key}><span>{label}</span><input type="number" min="0" max="1000" step="1" required value={targetForm[key] ?? ''} onChange={(event) => setTargetForm((current) => ({ ...current, [key]: event.target.value }))} disabled={savingTargets}/></label>)}</div><div className="form-actions"><button type="submit" className="button button-primary" disabled={savingTargets || TARGET_FIELDS.some(([key]) => targetForm[key] === '' || !Number.isInteger(Number(targetForm[key])) || Number(targetForm[key]) < 0 || Number(targetForm[key]) > 1000)}>{savingTargets && <span className="button-spinner"/>}Save targets</button></div></form>}
    </section>
    <footer className="page-footer">An honest record is useful at every pace.</footer>
  </main>;
}
