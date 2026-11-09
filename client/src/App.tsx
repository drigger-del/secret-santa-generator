import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './lib/api';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import RevealPage from './pages/RevealPage';
import ParticipantsPage from './pages/ParticipantsPage';
import ExclusionsPage from './pages/ExclusionsPage';
import GenerateDrawPage from './pages/GenerateDrawPage';
import ResultsPage from './pages/ResultsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('ss_admin_token');
      if (!token) {
        setAuthed(false);
        setChecked(true);
        return;
      }
      try {
        await api.get('/admin/me');
        if (!cancelled) setAuthed(true);
      } catch {
        if (!cancelled) {
          localStorage.removeItem('ss_admin_token');
          setAuthed(false);
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) return null;
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reveal" element={<RevealPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/participants" replace />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="exclusions" element={<ExclusionsPage />} />
        <Route path="generate" element={<GenerateDrawPage />} />
        <Route path="results" element={<ResultsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin/participants" replace />} />
    </Routes>
  );
}
