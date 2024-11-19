import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { NavbarContext } from "./components/Navbar"; // Assuming Navbar provides modal control via context
import "./EventDetail.css";

const EventDetail = () => {
	const { event_id } = useParams();
	const [event, setEvent] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [invitationMessage, setInvitationMessage] = useState("");
	// Use NavbarContext for authentication handling
	const { toggleAuthModal, currentUser } = useContext(NavbarContext);

	useEffect(() => {
		// Fetch event details from the API
		const fetchEventDetails = async () => {
			try {
				const response = await fetch(`http://localhost:5001/api/events/${event_id}`);
				if (!response.ok) {
					throw new Error(`Error fetching event details: ${response.statusText}`);
				}
				const data = await response.json();
				setEvent(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchEventDetails();
	}, [event_id]);

	const handleSelfInvite = async () => {
		if (!currentUser) {
			// User is not signed in, prompt the login modal
			toggleAuthModal(true); // Open the login modal
			return;
		}

		try {
			const response = await fetch(`http://localhost:5001/api/invitations`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include", // Include cookies for authentication
				body: JSON.stringify({ event_id }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to invite yourself to the event.");
			}

			const result = await response.json();
			setInvitationMessage(result.message || "Successfully invited yourself to the event!");
		} catch (err) {
			setInvitationMessage(err.message);
		}
	};

	if (loading) {
		return <div className="event-detail-page">Loading...</div>;
	}

	if (error) {
		return <div className="event-detail-page error">{error}</div>;
	}

	if (!event) {
		return <div className="event-detail-page">Event not found</div>;
	}

	return (
		<div className="event-detail-page">
			<header className="event-header">
				<h1>{event.name}</h1>
				<p>{event.description}</p>
			</header>
			<section className="event-details">
				<p><strong>Date:</strong> {event.start_date} to {event.end_date}</p>
				<p><strong>Location:</strong> {event.venue_name}, {event.venue_location}</p>
				<p><strong>Organizer:</strong> {event.organizer_name}</p>
			</section>

			{/* Self-invite Button */}
			<section className="event-actions">
				<button onClick={handleSelfInvite} className="self-invite-button">Join This Event</button>
				{invitationMessage && <p className="invitation-message">{invitationMessage}</p>}
			</section>
		</div>
	);
};

export default EventDetail;