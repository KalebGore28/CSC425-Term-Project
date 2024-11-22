// src/VenueBooking.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavbarContext } from './components/Navbar'; // Use Navbar context to toggle modal
import './VenueBooking.css';

function VenueBooking() {
    const { venue_id } = useParams();
    const navigate = useNavigate();
    const { toggleAuthModal } = useContext(NavbarContext);
    const [availableDates, setAvailableDates] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Fetch user authentication status
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('http://localhost:5001/api/auth/session', {
                    credentials: 'include',
                });
                setIsAuthenticated(response.ok);
            } catch {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    // Fetch available dates for the venue
    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const response = await fetch(`http://localhost:5001/api/venues/${venue_id}/available_dates`);
                if (!response.ok) throw new Error('Failed to fetch available dates.');
                const data = await response.json();
                setAvailableDates(data.data.map((date) => date.available_date));
            } catch (err) {
                console.error(err.message);
                setAvailableDates([]);
            }
        };

        fetchAvailableDates();
    }, [venue_id]);

    // Handle booking submission
    const handleBooking = async () => {
        setError(null);

        if (!isAuthenticated) {
            setError('You must be signed in to book a venue.');
            toggleAuthModal(); // Show the sign-in modal
            return;
        }

        if (!startDate || !endDate) {
            setError('Please select both start and end dates.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date cannot be after end date.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/api/venue_rentals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venue_id, start_date: startDate, end_date: endDate }),
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to book venue.');

            navigate('/venues'); // Redirect back to venues after successful booking
        } catch (err) {
            setError(err.message || 'An error occurred while booking the venue.');
        }
    };

    return (
        <div className="venue-booking-page">
            <button className="back-button" onClick={() => navigate(-1)}>
                &larr; Back
            </button>
            <h1>Book Venue</h1>
            <p>Select a start and end date for your booking:</p>
            <div className="date-inputs">
                <label>
                    Start Date:
                    <select
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={availableDates.length === 0}
                    >
                        <option value="">
                            {availableDates.length > 0 ? 'Select a start date' : 'Not available'}
                        </option>
                        {availableDates.map((date, index) => (
                            <option key={index} value={date}>
                                {date}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    End Date:
                    <select
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={availableDates.length === 0}
                    >
                        <option value="">
                            {availableDates.length > 0 ? 'Select an end date' : 'Not available'}
                        </option>
                        {availableDates.map((date, index) => (
                            <option key={index} value={date}>
                                {date}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {error && <p className="error-message">{error}</p>}
            <button
                onClick={handleBooking}
                className="confirm-booking-button"
                disabled={availableDates.length === 0}
            >
                {isAuthenticated ? 'Confirm Booking' : 'Sign In to Book'}
            </button>
        </div>
    );
}

export default VenueBooking;