// src/main.jsx

// Import the necessary modules
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import components
import LandingPage from './LandingPage';
import ProfilePage from './ProfilePage';
import VenuePage from './VenuePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />  {/* Landing page */}
        <Route path="/profile" element={<ProfilePage />} /> {/* Profile page */}
        <Route path="/venues" element={<VenuePage />} /> {/* Venue page */}
      </Routes>
    </Router>
  </React.StrictMode>
);