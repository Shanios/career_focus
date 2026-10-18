import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  ['/', 'Overview', '⌂'], ['/applications', 'Job Applications', '▤'], ['/coding', 'Coding Tracker', '⌘'],
  ['/python', 'Python Learning', 'λ'], ['/communication', 'Communication Practice', '◉'],
  ['/progress', 'Daily Progress', '▥'], ['/journal', 'Journal', '✎'], ['/settings', 'Settings', '⚙'],
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
  return <div className="app-shell">
    <button className="menu-toggle" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation">☰</button>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="primary-navigation" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark">C</span><span>Career Focus<small>JOB SEARCH TRACKER</small></span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Primary navigation">{links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="nav-icon">{icon}</span>{label}</NavLink>)}</nav>
      <div className="sidebar-footer"><div className="sprint-dot" />SPRINT MODE <span>OCT 18–25</span></div>
    </aside>
    <main className="main-area"><Outlet /></main>
  </div>;
}
