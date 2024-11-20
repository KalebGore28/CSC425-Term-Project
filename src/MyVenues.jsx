import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MyVenues.css";

function MyVenues() {
	const [venues, setVenues] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Fetch the user's venues on mount
	useEffect(() => {
		const fetchMyVenues = async () => {
			try {
				const response = await fetch("http://localhost:5001/api/users/me/venues", {
					credentials: "include", // Include cookies for authentication
				});
				if (!response.ok) {
					throw new Error("Failed to fetch your venues.");
				}
				const { data } = await response.json();
				setVenues(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMyVenues();
	}, []);

	// Handle edit button click
	const handleEdit = (venueId) => {
		navigate(`/venues/${venueId}/edit`);
	};

	// Handle delete venue
	const handleDelete = async (venueId) => {
		if (window.confirm("Are you sure you want to delete this venue?")) {
			try {
				const response = await fetch(`http://localhost:5001/api/venues/${venueId}`, {
					method: "DELETE",
					credentials: "include", // Include cookies for authentication
				});
				if (!response.ok) {
					throw new Error("Failed to delete the venue.");
				}
				// Refresh venues after deletion
				setVenues((prev) => prev.filter((venue) => venue.venue_id !== venueId));
				alert("Venue deleted successfully.");
			} catch (err) {
				alert(err.message);
			}
		}
	};

	if (isLoading) return <p>Loading your venues...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="my-venues-page">
			<h1>My Venues</h1>
			{venues.length > 0 ? (
				<div className="venues-grid">
					{venues.map((venue) => (
						<div className="venue-card" key={venue.venue_id}>
							<img
								src={`http://localhost:5001${venue.thumbnail_image}`}
								alt={`${venue.name} Thumbnail`}
								className="venue-thumbnail"
								onError={(e) => {
									e.target.onerror = null; // Prevent infinite loop
									e.target.src = "/fallback-image.webp"; // Fallback image
								}}
							/>
							<div className="venue-info">
								<h2>{venue.name}</h2>
								<p><strong>Location:</strong> {venue.location}</p>
								<p>{venue.description}</p>
								<p><strong>Capacity:</strong> {venue.capacity}</p>
								<p><strong>Price:</strong> ${venue.price}/day</p>
							</div>
							<div className="venue-actions">
								<button onClick={() => handleEdit(venue.venue_id)} className="edit-button">Edit</button>
								<button onClick={() => handleDelete(venue.venue_id)} className="delete-button">Delete</button>
							</div>
						</div>
					))}
				</div>
			) : (
				<p>You have no venues. <Link to="/venues/new">List a new venue</Link></p>
			)}
		</div>
	);
}

export default MyVenues;