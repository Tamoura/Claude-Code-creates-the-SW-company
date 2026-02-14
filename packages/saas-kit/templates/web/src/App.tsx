import { Routes, Route, Navigate } from 'react-router-dom';
{{#if feature.auth}}import Login from './pages/Login.js';
{{/if feature.auth}}import DashboardLayout from './components/DashboardLayout.js';
import Dashboard from './pages/dashboard/Dashboard.js';

export default function App() {
  return (
    <Routes>
{{#if feature.auth}}      <Route path="/login" element={<Login />} />
{{/if feature.auth}}      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
