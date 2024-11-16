import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
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
					const { data } = await response.json();
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
				) : venues.length > 0 ? (
					<div className="venue-list">
						{venues.map((venue) => (
							<Link to={`/venues/${venue.venue_id}`} key={venue.venue_id} className="venue-card-link">
								<div className="venue-card">
									<img
										src={`http://localhost:5001/api/images/${venue.thumbnail_image_id}`}
										alt={venue.name}
										className="venue-image"
									/>
									<h2 className="venue-name">{venue.name}</h2>
									<p className="venue-location"><strong>Location:</strong> {venue.location}</p>
									<p className="venue-description">{venue.description}</p>
									<p className="venue-capacity"><strong>Capacity:</strong> {venue.capacity}</p>
									<p className="venue-price"><strong>Price:</strong> ${venue.price}</p>
								</div>
							</Link>
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