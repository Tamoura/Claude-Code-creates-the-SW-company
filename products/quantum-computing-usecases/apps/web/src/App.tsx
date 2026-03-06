import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import UseCases from './pages/UseCases';
import UseCaseDetail from './pages/UseCaseDetail';
import Compare from './pages/Compare';
import LearningPath from './pages/LearningPath';
import QuantumSovereigntyArab from './pages/QuantumSovereigntyArab';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment';
import PriorityMatrix from './pages/PriorityMatrix';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/use-cases/:slug" element={<UseCaseDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/learning-path" element={<LearningPath />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/priority-matrix" element={<PriorityMatrix />} />
        <Route path="/quantum-sovereignty-arab-world" element={<QuantumSovereigntyArab />} />
      </Routes>
    </Layout>
  );
}

export default App;
