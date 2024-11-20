import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyEvents.css";

function MyEvents() {
	const [events, setEvents] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Fetch events for the authenticated user
	useEffect(() => {
		const fetchEvents = async () => {
			try {
				const response = await fetch("http://localhost:5001/api/users/me/events", {
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to fetch events.");
				}
				const { data } = await response.json();
				setEvents(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchEvents();
	}, []);

	// Handle delete event
	const handleDelete = async (eventId) => {
		if (window.confirm("Are you sure you want to delete this event?")) {
			try {
				const response = await fetch(`http://localhost:5001/api/events/${eventId}`, {
					method: "DELETE",
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to delete the event.");
				}
				setEvents((prev) => prev.filter((event) => event.event_id !== eventId));
				alert("Event deleted successfully.");
			} catch (err) {
				alert(err.message);
			}
		}
	};

	if (isLoading) return <p>Loading your events...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="my-events-page">
			<h1>My Events</h1>
			<button
				className="create-event-button"
				onClick={() => navigate("/events/new")}
			>
				Create a New Event
			</button>
			{events.length > 0 ? (
				<div className="events-grid">
					{events.map((event) => (
						<div className="event-card" key={event.event_id}>
							<div className="event-info">
								<h2>{event.event_name}</h2>
								<p><strong>Venue:</strong> {event.venue_name}</p>
								<p><strong>Location:</strong> {event.venue_location}</p>
								<p><strong>Dates:</strong> {event.start_date} - {event.end_date}</p>
							</div>
							<div className="event-actions">
								<button
									onClick={() => navigate(`/events/${event.event_id}/edit`)}
									className="edit-button"
								>
									Edit
								</button>
								<button
									onClick={() => handleDelete(event.event_id)}
									className="delete-button"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			) : (
				<p>You have no events yet.</p>
			)}
		</div>
	);
}

export default MyEvents;