// src/main.jsx

// Import the necessary modules
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar, { NavbarContext } from './components/Navbar';

// Import components
import LandingPage from './LandingPage';
import ProfilePage from './ProfilePage';
import VenuePage from './VenuePage';
import VenueDetail from './VenueDetail';
import VenueBooking from './VenueBooking';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Navbar>
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* Define routes for your pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/venues" element={<VenuePage />} />
            <Route path="/venues/:venue_id" element={<VenueDetail />} />
            <Route path="/venues/:venue_id/booking" element={<VenueBooking />} />
            {/* Fallback route for unmatched paths */}
            <Route path="*" element={<div>404 - Page Not Found</div>} />
          </Routes>
        </Suspense>
      </Router>
    </Navbar>
  </React.StrictMode>
);