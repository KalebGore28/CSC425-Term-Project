import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyEvents.css";

function MyEvents() {
	const [events, setEvents] = useState([]);
	const [invitedEvents, setInvitedEvents] = useState([]);
	const [acceptedInvites, setAcceptedInvites] = useState([]); // Accepted events from invitations
	const [filter, setFilter] = useState("My Events"); // Default filter
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Fetch events for the authenticated user
	useEffect(() => {
		const fetchEvents = async () => {
			try {
				// Fetch personal events
				const eventsResponse = await fetch("http://localhost:5001/api/users/me/events", {
					credentials: "include",
				});
				if (!eventsResponse.ok) {
					throw new Error("Failed to fetch events.");
				}
				const { data: personalEvents } = await eventsResponse.json();
				setEvents(personalEvents);

				// Fetch invited events
				const invitesResponse = await fetch("http://localhost:5001/api/users/me/invites", {
					credentials: "include",
				});
				if (!invitesResponse.ok) {
					throw new Error("Failed to fetch invited events.");
				}
				const { data: inviteEvents } = await invitesResponse.json();
				setInvitedEvents(inviteEvents);

				// Fetch accepted invites
				const acceptedResponse = await fetch("http://localhost:5001/api/users/me/accepted-invites", {
					credentials: "include",
				});
				if (!acceptedResponse.ok) {
					throw new Error("Failed to fetch accepted invites.");
				}
				const { data: acceptedEvents } = await acceptedResponse.json();
				setAcceptedInvites(acceptedEvents);
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

	// Handle accepting an invitation
	const handleAcceptInvite = async (eventId) => {
		try {
			const response = await fetch(`http://localhost:5001/api/invitations/${eventId}/accept`, {
				method: "POST",
				credentials: "include",
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to accept the invitation.");
			}
			alert("Invitation accepted successfully.");
			// Remove the event from the invited list and add it to accepted invites
			setInvitedEvents((prev) => prev.filter((event) => event.event_id !== eventId));
			const acceptedEvent = invitedEvents.find((event) => event.event_id === eventId);
			setAcceptedInvites((prev) => [...prev, acceptedEvent]);
		} catch (err) {
			alert(err.message);
		}
	};

	if (isLoading) return <p>Loading your events...</p>;
	if (error) return <p>Error: {error}</p>;

	// Determine which events to show based on the current filter
	const displayedEvents =
		filter === "My Events"
			? events
			: filter === "Invited Events"
				? invitedEvents
				: acceptedInvites; // Add acceptedInvites for "Accepted Events"

	return (
		<div className="my-events-page">
			<h1>My Events</h1>

			{/* Filter Buttons */}
			<div className="filter-buttons">
				<button
					className={`filter-button ${filter === "My Events" ? "active" : ""}`}
					onClick={() => setFilter("My Events")}
				>
					My Events
				</button>
				<button
					className={`filter-button ${filter === "Invited Events" ? "active" : ""}`}
					onClick={() => setFilter("Invited Events")}
				>
					Invited Events
				</button>
				<button
					className={`filter-button ${filter === "Accepted Events" ? "active" : ""}`}
					onClick={() => setFilter("Accepted Events")}
				>
					Accepted Events
				</button>
			</div>

			{/* Create Event Button */}
			{filter === "My Events" && (
				<button
					className="create-event-button"
					onClick={() => navigate("/events/new")}
				>
					Create a New Event
				</button>
			)}

			{/* Events Grid */}
			{displayedEvents.length > 0 ? (
				<div className="events-grid">
					{displayedEvents.map((event) => (
						<div className="event-card" key={event.event_id}>
							<div className="event-info">
								<h2>{event.event_name}</h2>
								<p><strong>Venue:</strong> {event.venue_name}</p>
								<p><strong>Location:</strong> {event.venue_location}</p>
								<p><strong>Dates:</strong> {event.start_date} - {event.end_date}</p>
							</div>
							<div className="event-actions">
								{/* Conditional Buttons Based on Filter */}
								{filter === "My Events" && (
									<>
										<button
											onClick={() => navigate(`/events/${event.event_id}/view`)}
											className="view-button"
										>
											View
										</button>
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
									</>
								)}
								{filter === "Invited Events" && (
									<button
										onClick={() => handleAcceptInvite(event.event_id)}
										className="accept-button"
									>
										Accept
									</button>
								)}
								{filter === "Accepted Events" && (
									<button
										onClick={() => navigate(`/events/${event.event_id}/view`)}
										className="view-button"
									>
										View
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<p>You have no {filter.toLowerCase()} yet.</p>
			)}
		</div>
	);
}

export default MyEvents;