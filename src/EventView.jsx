import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EventView.css";

function EventView() {
	const { event_id } = useParams();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("details");
	const [eventDetails, setEventDetails] = useState(null);
	const [attendees, setAttendees] = useState([]);
	const [communityPosts, setCommunityPosts] = useState([]);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [isOrganizer, setIsOrganizer] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filterStatus, setFilterStatus] = useState("All"); // Default to show all attendees

	// Fetch current user info
	useEffect(() => {
		const fetchCurrentUser = async () => {
			try {
				const response = await fetch("http://localhost:5001/api/users/me", {
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to fetch current user info.");
				}
				const userData = await response.json();
				setCurrentUserId(userData.user_id);
			} catch (err) {
				console.error(err);
			}
		};

		fetchCurrentUser();
	}, []);

	// Fetch event details, attendees, and posts on mount
	useEffect(() => {
		const fetchEventData = async () => {
			try {
				// Fetch event details
				const eventResponse = await fetch(`http://localhost:5001/api/events/${event_id}`, {
					credentials: "include",
				});
				if (!eventResponse.ok) {
					throw new Error("Failed to fetch event details.");
				}
				const eventData = await eventResponse.json();
				setEventDetails(eventData);

				// Check if the logged-in user is the organizer
				if (currentUserId && eventData.organizer_id === currentUserId) {
					setIsOrganizer(true);
				}

				// Fetch attendees
				const attendeesResponse = await fetch(`http://localhost:5001/api/events/${event_id}/attendees`, {
					credentials: "include",
				});
				if (!attendeesResponse.ok) {
					throw new Error("Failed to fetch attendees.");
				}
				const attendeesData = await attendeesResponse.json();
				setAttendees(attendeesData.data);

				// Fetch community posts
				const postsResponse = await fetch(`http://localhost:5001/api/events/${event_id}/posts`, {
					credentials: "include",
				});
				if (!postsResponse.ok) {
					throw new Error("Failed to fetch community posts.");
				}
				const postsData = await postsResponse.json();
				setCommunityPosts(postsData.data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		if (currentUserId) {
			fetchEventData();
		}
	}, [event_id, currentUserId]);

	// Handle tab switching
	const handleTabClick = (tab) => setActiveTab(tab);

	// Handle deleting a community post
	const handleDeletePost = async (post_id) => {
		try {
			const response = await fetch(
				`http://localhost:5001/api/events/${event_id}/posts/${post_id}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to delete post.");
			}
			// Refresh posts list after successful deletion
			setCommunityPosts((prevPosts) =>
				prevPosts.filter((post) => post.post_id !== post_id)
			);
			alert("Post deleted successfully.");
		} catch (err) {
			alert(err.message);
		}
	};

	// Handle attendee removal
	const handleRemoveAttendee = async (user_id) => {
		try {
			const response = await fetch(
				`http://localhost:5001/api/events/${event_id}/attendees/${user_id}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to remove attendee.");
			}
			// Refresh attendees list after successful removal
			setAttendees((prevAttendees) =>
				prevAttendees.filter((attendee) => attendee.user_id !== user_id)
			);
			alert("Attendee removed successfully.");
		} catch (err) {
			alert(err.message);
		}
	};

	// Handle navigation back to the Events page
	const handleBackClick = () => navigate("/my-events");

	if (isLoading) return <p>Loading event details...</p>;
	if (error) return <p className="error-message">Error: {error}</p>;

	return (
		<div className="event-view-container">
			{/* Left Menu */}
			<div className="left-menu">
				<div className="menu-group">
					<button
						className={`menu-item ${activeTab === "details" ? "active" : ""}`}
						onClick={() => handleTabClick("details")}
					>
						Event Details
					</button>
					<button
						className={`menu-item ${activeTab === "attendees" ? "active" : ""}`}
						onClick={() => handleTabClick("attendees")}
					>
						Attendees
					</button>
					<button
						className={`menu-item ${activeTab === "posts" ? "active" : ""}`}
						onClick={() => handleTabClick("posts")}
					>
						Community Posts
					</button>
				</div>
				<button className="back-button" onClick={handleBackClick}>
					&larr; Back to Events
				</button>
			</div>

			{/* Main Content */}
			<div className="content-area">
				{activeTab === "details" && eventDetails && (
					<div className="tab-content">
						<h1>{eventDetails.name}</h1>
						<p><strong>Description:</strong> {eventDetails.description}</p>
						<p><strong>Date:</strong> {eventDetails.start_date} to {eventDetails.end_date}</p>
						<p><strong>Venue:</strong> {eventDetails.venue_name} - {eventDetails.venue_location}</p>
						<p><strong>Invite Only:</strong> {eventDetails.invite_only ? "Yes" : "No"}</p>
					</div>
				)}
				{activeTab === "attendees" && (
					<div className="tab-content">
						<h2>Attendees</h2>

						{/* Filter Buttons */}
						<div className="filter-buttons">
							<button
								className={`filter-button ${filterStatus === "All" ? "active" : ""}`}
								onClick={() => setFilterStatus("All")}
							>
								All
							</button>
							<button
								className={`filter-button ${filterStatus === "Accepted" ? "active" : ""}`}
								onClick={() => setFilterStatus("Accepted")}
							>
								Accepted
							</button>
							<button
								className={`filter-button ${filterStatus === "Sent" ? "active" : ""}`}
								onClick={() => setFilterStatus("Sent")}
							>
								Sent
							</button>
							<button
								className={`filter-button ${filterStatus === "Declined" ? "active" : ""}`}
								onClick={() => setFilterStatus("Declined")}
							>
								Declined
							</button>
						</div>

						{/* Filtered Attendees List */}
						{attendees.length > 0 ? (
							<ul>
								{attendees
									.filter((attendee) =>
										filterStatus === "All" ? true : attendee.status === filterStatus
									)
									.map((attendee) => (
										<li key={attendee.user_id} className="attendee-item">
											<span>
												{attendee.name} - {attendee.status}
											</span>
										</li>
									))}
							</ul>
						) : (
							<p>No attendees yet for this event.</p>
						)}
					</div>
				)}

				{activeTab === "posts" && (
					<div className="tab-content">
						<h2>Community Posts</h2>
						{communityPosts.length > 0 ? (
							<ul>
								{communityPosts.map((post) => (
									<li key={post.post_id} className="post-item">
										<div>
											<strong>{post.user_name}</strong>: {post.content}
										</div>
										<div className="post-actions">
											{/* Allow organizer to delete any post, and user to delete their own */}
											{isOrganizer || post.author_id === currentUserId ? (
												<button
													className="delete-post-button"
													onClick={() => handleDeletePost(post.post_id)}
												>
													Delete
												</button>
											) : null}
										</div>
									</li>
								))}
							</ul>
						) : (
							<p>No posts yet for this event.</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export default EventView;