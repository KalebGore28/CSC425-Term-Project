// src/main.jsx

// Import the necessary modules
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import components
import LandingPage from './LandingPage';
import './index.css'; // Optional for styling

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />  {/* Landing page */}
      </Routes>
    </Router>
  </React.StrictMode>
);