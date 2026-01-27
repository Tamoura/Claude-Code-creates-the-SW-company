import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import UseCases from './pages/UseCases';
import UseCaseDetail from './pages/UseCaseDetail';
import Compare from './pages/Compare';
import LearningPath from './pages/LearningPath';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/use-cases/:slug" element={<UseCaseDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/learning-path" element={<LearningPath />} />
      </Routes>
    </Layout>
  );
}

export default App;
