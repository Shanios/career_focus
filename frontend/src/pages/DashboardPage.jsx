import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { codingQuestionsApi, communicationPracticeApi, dailyProgressApi, formatPracticeDate, getLocalDateString, jobApplicationsApi, pythonLearningApi } from '../services/apiClient.js';
import '../styles/dashboard.css';

function greetingForHour(hour) { return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }
function todayLabel(date) { const [year, month, day] = date.split('-').map(Number); return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day)); }
const appLabels = { SAVED: 'Saved', APPLIED: 'Applied', ASSESSMENT: 'Assessment', INTERVIEW: 'Interview', OFFER: 'Offer', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' };

export default function DashboardPage() {
  const today = useMemo(() => getLocalDateString(), []);
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const [codingStats, setCodingStats] = useState({ status: 'loading', data: null, error: '' });
  const [recentCoding, setRecentCoding] = useState({ status: 'loading', items: [], error: '' });
  const [applicationStats, setApplicationStats] = useState({ status: 'loading', data: null, error: '' });
  const [recentApplications, setRecentApplications] = useState({ status: 'loading', items: [], error: '' });
  const [pythonStats, setPythonStats] = useState({ status: 'loading', data: null, error: '' });
  const [recentPython, setRecentPython] = useState({ status: 'loading', items: [], error: '' });
  const [communicationStats, setCommunicationStats] = useState({ status: 'loading', data: null, error: '' });
  const [recentCommunication, setRecentCommunication] = useState({ status: 'loading', items: [], error: '' });
  const [dailyProgress, setDailyProgress] = useState({ status: 'loading', data: null, error: '' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCodingStats((current) => ({ ...current, status: 'loading', error: '' }));
    setRecentCoding((current) => ({ ...current, status: 'loading', error: '' }));
    setApplicationStats((current) => ({ ...current, status: 'loading', error: '' }));
    setRecentApplications((current) => ({ ...current, status: 'loading', error: '' }));
    setPythonStats((current) => ({ ...current, status: 'loading', error: '' }));
    setRecentPython((current) => ({ ...current, status: 'loading', error: '' }));
    setCommunicationStats((current) => ({ ...current, status: 'loading', error: '' }));
    setRecentCommunication((current) => ({ ...current, status: 'loading', error: '' }));
    setDailyProgress((current) => ({ ...current, status: 'loading', error: '' }));
    codingQuestionsApi.stats({ date: today }, { signal: controller.signal }).then((data) => setCodingStats({ status: 'success', data, error: '' })).catch((error) => { if (!controller.signal.aborted) setCodingStats({ status: 'error', data: null, error: error.message }); });
    codingQuestionsApi.list({ page: 1, pageSize: 5 }, { signal: controller.signal }).then((data) => setRecentCoding({ status: 'success', items: data.items, error: '' })).catch((error) => { if (!controller.signal.aborted) setRecentCoding({ status: 'error', items: [], error: error.message }); });
    jobApplicationsApi.stats({ date: today }, { signal: controller.signal }).then((data) => setApplicationStats({ status: 'success', data, error: '' })).catch((error) => { if (!controller.signal.aborted) setApplicationStats({ status: 'error', data: null, error: error.message }); });
    jobApplicationsApi.list({ page: 1, pageSize: 5 }, { signal: controller.signal }).then((data) => setRecentApplications({ status: 'success', items: data.items, error: '' })).catch((error) => { if (!controller.signal.aborted) setRecentApplications({ status: 'error', items: [], error: error.message }); });
    pythonLearningApi.stats({ signal: controller.signal }).then((data) => setPythonStats({ status: 'success', data, error: '' })).catch((error) => { if (!controller.signal.aborted) setPythonStats({ status: 'error', data: null, error: error.message }); });
    pythonLearningApi.list({ page: 1, pageSize: 5 }, { signal: controller.signal }).then((data) => setRecentPython({ status: 'success', items: data.items, error: '' })).catch((error) => { if (!controller.signal.aborted) setRecentPython({ status: 'error', items: [], error: error.message }); });
    communicationPracticeApi.stats({ signal: controller.signal }).then((data) => setCommunicationStats({ status: 'success', data, error: '' })).catch((error) => { if (!controller.signal.aborted) setCommunicationStats({ status: 'error', data: null, error: error.message }); });
    communicationPracticeApi.list({ page: 1, pageSize: 5 }, { signal: controller.signal }).then((data) => setRecentCommunication({ status: 'success', items: data.items, error: '' })).catch((error) => { if (!controller.signal.aborted) setRecentCommunication({ status: 'error', items: [], error: error.message }); });
    dailyProgressApi.get(today, { signal: controller.signal }).then((data) => setDailyProgress({ status: 'success', data, error: '' })).catch((error) => { if (!controller.signal.aborted) setDailyProgress({ status: 'error', data: null, error: error.message }); });
    return () => controller.abort();
  }, [today, reload]);

  const stats = codingStats.data;
  const submitted = applicationStats.data?.submitted;
  const cards = [
    { label: 'APPLICATIONS SUBMITTED', value: submitted == null ? 0 : `${submitted} / 100`, note: 'Submitted toward a target of 100', to: '/applications', mark: '↗', status: applicationStats.status },
    { label: 'CODING QUESTIONS', value: stats?.totalQuestions ?? 0, note: 'All saved questions', to: '/coding', mark: '</>', status: codingStats.status },
    { label: 'DSA QUESTIONS', value: stats?.dsaQuestions ?? 0, note: 'Saved DSA practice', to: '/coding', mark: '⌘', status: codingStats.status },
    { label: 'INTERVIEW CODING', value: stats?.interviewQuestions ?? 0, note: 'Saved interview questions', to: '/coding', mark: '◉', status: codingStats.status },
    { label: 'PYTHON LESSONS COMPLETED', value: pythonStats.data?.completedEntries ?? 0, note: `${pythonStats.data?.totalEntries ?? 0} learning entries recorded`, to: '/python', mark: 'Py', status: pythonStats.status },
    { label: 'COMMUNICATION SESSIONS', value: communicationStats.data?.totalSessions ?? 0, note: `${communicationStats.data?.completedSessions ?? 0} completed`, to: '/communication', mark: '◉', status: communicationStats.status },
  ];
  const busy = [codingStats, recentCoding, applicationStats, recentApplications, pythonStats, recentPython, communicationStats, recentCommunication, dailyProgress].some((item) => item.status === 'loading');

  return <div className="page-wrap dashboard-page">
    <header className="page-header dashboard-header"><div><div className="eyebrow">{todayLabel(today)} <span className="live-dot" /></div><h1>{greeting}, keep going.</h1><p>Your sprint progress, grounded in the work you have logged.</p></div><div className="dashboard-header-actions"><button className="button button-secondary refresh-button" type="button" onClick={() => setReload((current) => current + 1)} disabled={busy}>↻ Refresh</button><Link className="button button-primary" to="/coding">＋ Log practice</Link></div></header>
    <section className="summary-grid dashboard-stats-grid" aria-label="Sprint summary">{cards.map((card) => <Link className={`summary-card dashboard-stat-card ${card.muted ? 'dashboard-stat-muted' : ''}`} to={card.to} key={card.label}><div className="card-top"><span>{card.label}</span><span className="card-mark">{card.mark}</span></div><div className={`card-value ${card.muted ? 'not-tracked-value' : ''} ${card.status === 'error' ? 'unavailable-value' : ''}`}>{card.status === 'loading' ? <span className="stat-skeleton" aria-label="Loading"/> : card.status === 'error' ? 'Unavailable' : card.value}</div><div className="card-note">{card.status === 'error' ? 'This module could not be reached' : card.note}</div></Link>)}</section>

    <section className="dashboard-main-grid">
      <div className="panel dashboard-panel recent-coding-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST PRACTICE</span><h2>Recent coding questions</h2></div><Link to="/coding" className="text-link">All questions →</Link></div>
        {recentCoding.status === 'loading' && <DashboardLoading label="Loading recent questions…"/>}
        {recentCoding.status === 'error' && <DashboardError message={recentCoding.error} retry={() => setReload((current) => current + 1)} title="Recent questions could not be loaded"/>}
        {recentCoding.status === 'success' && recentCoding.items.length === 0 && <div className="dashboard-empty"><strong>No coding questions saved yet</strong><p>Your practice history will appear here after you save a question.</p><Link to="/coding" className="text-link">Add a question →</Link></div>}
        {recentCoding.status === 'success' && recentCoding.items.length > 0 && <div className="dashboard-question-list">{recentCoding.items.map((item) => <article className="dashboard-question-row" key={item.id}><div className="dashboard-question-meta"><span className={`type-badge ${item.type === 'INTERVIEW' ? 'badge-interview' : 'badge-dsa'}`}>{item.type === 'INTERVIEW' ? 'Interview' : 'DSA'}</span><time dateTime={String(item.date).slice(0, 10)}>{formatPracticeDate(item.date)}</time></div><div className="dashboard-question-copy"><strong>{item.questionContent}</strong><span>{item.expectedOutput}</span></div></article>)}</div>}
      </div>
      <div className="panel dashboard-panel today-activity-panel"><div className="panel-heading"><div><span className="eyebrow">TODAY</span><h2>Daily activity</h2></div><Link to="/progress" className="text-link">Daily progress →</Link></div>
        <div className="today-coding-highlight"><span className="check-icon">⌘</span><span><strong>Coding questions</strong><small>Practised today</small></span><b className="count-pill">{codingStats.status === 'loading' ? '…' : codingStats.status === 'error' ? '—' : stats?.dateCount?.count ?? 0}</b></div><div className="dashboard-today-note">{formatPracticeDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div className="daily-availability">
          <div className="availability-row"><span className="availability-mark mark-apps">↗</span><span><strong>Applications submitted</strong><small>Submitted today</small></span><span className="not-tracked-pill">{applicationStats.status === 'loading' ? '…' : applicationStats.status === 'error' ? 'Unavailable' : applicationStats.data?.submittedOnDate?.count ?? 0}</span></div>
          <div className="availability-row"><span className="availability-mark mark-python">Py</span><span><strong>Python lessons</strong><small>Completed all time</small></span><span className="not-tracked-pill">{pythonStats.status === 'loading' ? '…' : pythonStats.status === 'error' ? 'Unavailable' : pythonStats.data.completedEntries}</span></div>
          <div className="availability-row"><span className="availability-mark mark-communication">◉</span><span><strong>Communication sessions</strong><small>Completed all time</small></span><span className="not-tracked-pill">{communicationStats.status === 'loading' ? '…' : communicationStats.status === 'error' ? 'Unavailable' : communicationStats.data.completedSessions}</span></div>
        </div>
        {codingStats.status === 'error' && <p className="today-data-error" role="status">Today’s coding count is unavailable until the API responds.</p>}
        {applicationStats.status === 'error' && <p className="today-data-error" role="status">Today’s application count is unavailable until the API responds.</p>}
        {pythonStats.status === 'error' && <p className="today-data-error" role="status">Python completion totals are unavailable until the API responds.</p>}
        {communicationStats.status === 'error' && <p className="today-data-error" role="status">Communication session totals are unavailable until the API responds.</p>}
      </div>
    </section>
    <section className="panel dashboard-daily-progress"><div className="panel-heading"><div><span className="eyebrow">TODAY VS TARGETS</span><h2>Daily progress</h2></div><Link to="/progress" className="text-link">Configure targets →</Link></div>
      {dailyProgress.status === 'loading' && <DashboardLoading label="Loading today's progress…"/>}
      {dailyProgress.status === 'error' && <DashboardError title="Daily progress is unavailable" message={dailyProgress.error} retry={() => setReload((current) => current + 1)}/>}
      {dailyProgress.status === 'success' && <><div className="dashboard-progress-total"><strong>{dailyProgress.data.totalCompletedActivities ?? '—'}</strong><span>completed activities logged today</span></div><div className="dashboard-progress-metrics">{[['jobApplications','Applications'],['dsaQuestions','DSA'],['interviewQuestions','Interview'],['pythonLessons','Python'],['communicationSessions','Communication']].map(([key,label]) => { const metric = dailyProgress.data.metrics[key]; return <div className="dashboard-progress-metric" key={key}><span>{label}</span><strong>{metric.available ? `${metric.actual} / ${metric.target}` : 'Unavailable'}</strong><i><b style={{ width: `${metric.progressPercent ?? 0}%` }}/></i></div>; })}</div>{Object.values(dailyProgress.data.metrics).every((metric) => metric.available) && dailyProgress.data.totalCompletedActivities === 0 && <p className="dashboard-progress-empty">No activity recorded today yet. Your targets are ready when you are.</p>}</>}
    </section>
    <section className="dashboard-optional-grid" aria-label="Other recent activity">
      <ApplicationsActivity state={recentApplications} retry={() => setReload((current) => current + 1)}/>
      <PythonActivity state={recentPython} retry={() => setReload((current) => current + 1)}/>
      <CommunicationActivity state={recentCommunication} retry={() => setReload((current) => current + 1)}/>
    </section>
    <footer className="page-footer">Progress is built one day at a time.</footer>
  </div>;
}

function DashboardLoading({ label }) { return <div className="dashboard-loading" role="status"><span className="loading-spinner"/>{label}</div>; }
function DashboardError({ message, retry, title }) { return <div className="dashboard-empty dashboard-empty-error" role="alert"><strong>{title}</strong><p>{message}</p><button className="text-link" type="button" onClick={retry}>Try again →</button></div>; }
function ApplicationsActivity({ state, retry }) {
  return <section className="panel unavailable-activity-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Job Applications</h2></div><span className="card-mark">↗</span></div>
    {state.status === 'loading' && <DashboardLoading label="Loading applications…"/>}
    {state.status === 'error' && <DashboardError title="Applications could not be loaded" message={state.error} retry={retry}/>}
    {state.status === 'success' && state.items.length === 0 && <p>No applications tracked yet.</p>}
    {state.status === 'success' && state.items.length > 0 && <div className="dashboard-app-list">{state.items.map((item) => <div className="dashboard-app-row" key={item.id}><span><strong>{item.companyName}</strong><small>{item.jobTitle}</small></span><span className={`ja-status status-${item.status.toLowerCase()}`}>{appLabels[item.status]}</span></div>)}</div>}
    <Link to="/applications" className="text-link">All applications →</Link>
  </section>;
}
function PythonActivity({ state, retry }) {
  return <section className="panel unavailable-activity-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Python Learning</h2></div><span className="card-mark">Py</span></div>
    {state.status === 'loading' && <DashboardLoading label="Loading Python entries…"/>}
    {state.status === 'error' && <DashboardError title="Python activity could not be loaded" message={state.error} retry={retry}/>}
    {state.status === 'success' && state.items.length === 0 && <p>No Python learning entries yet.</p>}
    {state.status === 'success' && state.items.length > 0 && <div className="dashboard-app-list">{state.items.map((item) => <div className="dashboard-app-row" key={item.id}><span><strong>{item.topic}</strong><small>{formatPracticeDate(item.practiceDate)}</small></span><span className={`py-dashboard-completion ${item.completed ? 'complete' : ''}`}>{item.completed ? 'Completed' : 'In progress'}</span></div>)}</div>}
    <Link to="/python" className="text-link">All learning entries →</Link>
  </section>;
}
function CommunicationActivity({ state, retry }) {
  return <section className="panel unavailable-activity-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Communication Practice</h2></div><span className="card-mark">◉</span></div>
    {state.status === 'loading' && <DashboardLoading label="Loading practice sessions…"/>}
    {state.status === 'error' && <DashboardError title="Communication activity could not be loaded" message={state.error} retry={retry}/>}
    {state.status === 'success' && state.items.length === 0 && <p>No communication sessions yet.</p>}
    {state.status === 'success' && state.items.length > 0 && <div className="dashboard-app-list">{state.items.map((session) => <div className="dashboard-app-row" key={session.id}><span><strong>{session.topic}</strong><small>{formatPracticeDate(session.practiceDate)} · {session.durationMinutes} min</small></span><span className={`cp-dashboard-completion ${session.completed ? 'complete' : ''}`}>{session.completed ? 'Completed' : 'In progress'}</span></div>)}</div>}
    <Link to="/communication" className="text-link">All practice sessions →</Link>
  </section>;
}
