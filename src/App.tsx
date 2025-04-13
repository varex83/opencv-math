import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { OpenCVProvider } from './providers/OpenCVProvider';
import BasicOperations from './pages/BasicOperations';
import './App.css';

const App = () => {
  return (
    <OpenCVProvider>
      <Router>
        <Routes>
          <Route path="/" element={<BasicOperations />} />
        </Routes>
      </Router>
    </OpenCVProvider>
  );
};

export default App; 