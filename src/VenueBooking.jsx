import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import './VenueBooking.css';

function VenueBooking() {
	const { venue_id } = useParams();
	const navigate = useNavigate();
	const [availableDates, setAvailableDates] = useState([]);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [error, setError] = useState(null);
	const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token')); // Check if user is signed in

	// Fetch available dates for the venue
	useEffect(() => {
		const fetchAvailableDates = async () => {
			try {
				const response = await fetch(`http://localhost:5001/api/venues/${venue_id}/available_dates`);
				if (!response.ok) throw new Error('Failed to fetch available dates.');
				const data = await response.json();
				setAvailableDates(data.data.map((date) => date.available_date)); // Store dates as strings
			} catch (err) {
				console.error(err.message);
				setAvailableDates([]); // Fallback to an empty array if an error occurs
			}
		};

		fetchAvailableDates();
	}, [venue_id]);

	// Handle booking submission
	const handleBooking = async () => {
		if (!isAuthenticated) {
			setError('You must be signed in to book a venue.');
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
			const response = await fetch(`http://localhost:5001/api/venue_rentals`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
				body: JSON.stringify({ venue_id, start_date: startDate, end_date: endDate }),
			});

			if (!response.ok) throw new Error('Failed to book venue.');

			navigate('/venues'); // Redirect back to venues after successful booking
		} catch (err) {
			setError(err.message);
		}
	};

	// Open sign-in/register modal via the Navbar
	const promptSignIn = () => {
		// Assume Navbar component has a method to toggle the modal
		const signInModal = document.getElementById('sign-in-modal');
		if (signInModal) {
			signInModal.style.display = 'block'; // Example: Show the modal
		}
	};

	return (
		<>
			<Navbar />
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
				{isAuthenticated ? (
					<button
						onClick={handleBooking}
						className="confirm-booking-button"
						disabled={availableDates.length === 0}
					>
						Confirm Booking
					</button>
				) : (
					<button onClick={promptSignIn} className="confirm-booking-button">
						Sign In to Book
					</button>
				)}
			</div>
		</>
	);
}

export default VenueBooking;