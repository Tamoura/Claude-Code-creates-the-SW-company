import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Calculator } from './pages/Calculator';
import { Methodology } from './pages/Methodology';
import { About } from './pages/About';

/**
 * Main App component for GPU Calculator
 *
 * Sets up routing for all pages:
 * - / - Main calculator interface
 * - /methodology - Calculation methodology (Coming Soon)
 * - /about - About the project (Coming Soon)
 *
 * Uses React Router for client-side navigation.
 */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
