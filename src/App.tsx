import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { OpenCVProvider } from './providers/OpenCVProvider';
import BasicOperations from './pages/BasicOperations';
import ImageFilters from './pages/ImageFilters';
import './App.css';

const App = () => {
  return (
    <OpenCVProvider>
      <Router>
        <Routes>
          <Route path="/" element={<BasicOperations />} />
          <Route path="/filters" element={<ImageFilters />} />
        </Routes>
      </Router>
    </OpenCVProvider>
  );
};

export default App; 