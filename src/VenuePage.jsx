// src/VenuePage.jsx

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './VenuePage.css';

function VenuePage() {
	// State variables
	const [venues, setVenues] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch venues on mount
	useEffect(() => {
		const fetchVenues = async () => {
			try {
				const response = await fetch('http://localhost:5001/api/venues');
				if (response.ok) {
					const { data } = await response.json(); // Extract the `data` array
					setVenues(data);
				} else {
					console.error('Failed to fetch venues. Status:', response.status);
				}
			} catch (error) {
				console.error('Error fetching venues:', error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchVenues();
	}, []);

	return (
		<>
			<Navbar />
			<div className="venue-page">
				<h1>Explore Venues</h1>
				{isLoading ? (
					<p>Loading venues...</p>
				) : venues && venues.length > 0 ? (
					<div className="venue-list">
						{venues.map((venue) => (
							<div className="venue-card" key={venue.venue_id}>
								<img src={venue.image_url} alt={venue.name} className="venue-image" />
								<h2 className="venue-name">{venue.name}</h2>
								<p className="venue-location"><strong>Location:</strong> {venue.location}</p>
								<p className="venue-description">{venue.description}</p>
								<p className="venue-capacity"><strong>Capacity:</strong> {venue.capacity}</p>
								<p className="venue-price"><strong>Price:</strong> ${venue.price}</p>
							</div>
						))}
					</div>
				) : (
					<p>No venues available.</p>
				)}
			</div>
		</>
	);
}

export default VenuePage;