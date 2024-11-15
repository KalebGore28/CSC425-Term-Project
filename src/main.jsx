// src/main.jsx

// Import the necessary modules
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import components
import LandingPage from './LandingPage';
import PartyPage from './PartyPage';
import WeddingPage from './WeddingPage';
import MeetingPage from './MeetingPage';
import ProfilePage from './ProfilePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />  {/* Landing page */}
        <Route path="/party" element={<PartyPage />} /> {/* Party page */}
        <Route path="/wedding" element={<WeddingPage />} /> {/* Wedding page */}
        <Route path="/meeting" element={<MeetingPage />} /> {/* Meeting page */}
        <Route path="/profile" element={<ProfilePage />} /> {/* Profile page */}
      </Routes>
    </Router>
  </React.StrictMode>
);