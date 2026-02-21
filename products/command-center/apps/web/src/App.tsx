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
import HealthScorecard from './pages/HealthScorecard.js';
import GitAnalytics from './pages/GitAnalytics.js';
import QualityGates from './pages/QualityGates.js';
import AgentMonitor from './pages/AgentMonitor.js';
import DependencyGraph from './pages/DependencyGraph.js';
import KnowledgeBase from './pages/KnowledgeBase.js';
import SprintBoard from './pages/SprintBoard.js';
import ProductProgress from './pages/ProductProgress.js';
import AlertCenter from './pages/AlertCenter.js';
import Settings from './pages/Settings.js';
import Simulate from './pages/Simulate.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:name" element={<ProductDetail />} />
        <Route path="products/:name/progress" element={<ProductProgress />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="activity" element={<Activity />} />
        <Route path="audit" element={<AuditReports />} />
        <Route path="components" element={<Components />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="operations" element={<Operations />} />
        <Route path="invoke" element={<Invoke />} />
        <Route path="health" element={<HealthScorecard />} />
        <Route path="git-analytics" element={<GitAnalytics />} />
        <Route path="quality-gates" element={<QualityGates />} />
        <Route path="monitor" element={<AgentMonitor />} />
        <Route path="dependencies" element={<DependencyGraph />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="sprint" element={<SprintBoard />} />
        <Route path="alerts" element={<AlertCenter />} />
        <Route path="simulate" element={<Simulate />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
