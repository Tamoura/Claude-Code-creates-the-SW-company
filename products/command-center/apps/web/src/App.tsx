import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.js';
import Overview from './pages/Overview.js';
import Products from './pages/Products.js';
import ProductDetail from './pages/ProductDetail.js';
import Agents from './pages/Agents.js';
import AgentDetail from './pages/AgentDetail.js';
import Activity from './pages/Activity.js';
import Components from './pages/Components.js';
import Infrastructure from './pages/Infrastructure.js';
import Invoke from './pages/Invoke.js';
import Workflows from './pages/Workflows.js';
import Operations from './pages/Operations.js';
import AuditReports from './pages/AuditReports.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:name" element={<ProductDetail />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="activity" element={<Activity />} />
        <Route path="components" element={<Components />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="invoke" element={<Invoke />} />
        <Route path="operations" element={<Operations />} />
        <Route path="audit" element={<AuditReports />} />
      </Route>
    </Routes>
  );
}
