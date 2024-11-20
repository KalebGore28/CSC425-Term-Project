// src/main.jsx

// Import the necessary modules
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

// Import components
import LandingPage from './LandingPage';
import ProfilePage from './ProfilePage';

import VenuePage from './VenuePage';
import VenueDetail from './VenueDetail';
import VenueBooking from './VenueBooking';
import ListVenue from './ListVenue';
import MyVenues from './MyVenues';
import EditVenue from './EditVenue';

import EventPage from './EventPage';
import EventDetail from './EventDetail';
import NewEvent from './NewEvent';
import MyEvents from './MyEvents';
import EditEvent from './EditEvent';
import EventView from './EventView';



import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap the entire application in the Navbar component for context utilization */}
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
            <Route path="/list-venue" element={<ListVenue />} />
            <Route path="/my-venues" element={<MyVenues />} />
            <Route path="/venues/:venue_id/edit" element={<EditVenue />} />

            <Route path="/events" element={<EventPage />} />
            <Route path="/events/:event_id" element={<EventDetail />} />
            <Route path="/events/new" element={<NewEvent />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/events/:event_id/edit" element={<EditEvent />} />
            <Route path="/events/:event_id/view" element={<EventView />} />

            {/* Fallback route for unmatched paths */}
            <Route path="*" element={<strong><br /><br /><br /><br />404 - Page Not Found</strong>} />
          </Routes>
        </Suspense>
      </Router>
    </Navbar>
  </React.StrictMode>
);