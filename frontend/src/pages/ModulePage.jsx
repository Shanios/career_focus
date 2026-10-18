import { Link } from 'react-router-dom';

export default function ModulePage({ title, description }) {
  return <div className="page-wrap"><header className="page-header"><div><div className="eyebrow">SPRINT WORKSPACE</div><h1>{title}</h1><p>{description}</p></div><Link to="/" className="button button-secondary">← Dashboard</Link></header><section className="panel module-intro"><div className="module-icon">✳</div><div><span className="eyebrow">PROJECT FOUNDATION</span><h2>This section is ready for the next build stage</h2><p>The application shell is in place. Features will connect to the PostgreSQL-backed API as they are implemented.</p></div></section></div>;
}

