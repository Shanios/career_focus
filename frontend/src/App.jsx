import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ModulePage from './pages/ModulePage.jsx';
import CodingTrackerPage from './pages/CodingTrackerPage.jsx';
import JobApplicationsPage from './pages/JobApplicationsPage.jsx';
import PythonLearningPage from './pages/PythonLearningPage.jsx';
import CommunicationPracticePage from './pages/CommunicationPracticePage.jsx';
import DailyProgressPage from './pages/DailyProgressPage.jsx';
import JournalPage from './pages/JournalPage.jsx';

const modules = [
  { path: 'settings', title: 'Settings', description: 'Sprint dates, goals, and display preferences.' }
];

export default function App() {
  return <Routes><Route element={<AppLayout />}>
    <Route index element={<DashboardPage />} />
    <Route path="coding" element={<CodingTrackerPage />} />
    <Route path="python" element={<PythonLearningPage />} />
    <Route path="communication" element={<CommunicationPracticePage />} />
    <Route path="progress" element={<DailyProgressPage />} />
    <Route path="journal" element={<JournalPage />} />
    <Route path="applications" element={<JobApplicationsPage />} />
    {modules.map((module) => <Route key={module.path} path={module.path} element={<ModulePage {...module} />} />)}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}

