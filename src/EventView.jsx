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
	const [replyingTo, setReplyingTo] = useState(null); // Current post being replied to
	const [replyContent, setReplyContent] = useState(""); // Content of the reply
	const [showReplies, setShowReplies] = useState({}); // Track visible replies for posts
	const [replies, setReplies] = useState({}); // Store replies for each post

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
				setCommunityPosts(postsData.data.map((post) => ({
					...post,
					likedByCurrentUser: Array.isArray(post.liked_by) && currentUserId
						? post.liked_by.includes(currentUserId)
						: false,
				})));
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

	// Handle toggling replies visibility
	const handlePostReply = async (post_id, content) => {
		try {
			const response = await fetch(`http://localhost:5001/api/posts/${post_id}/reply`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ content }),
			});
			if (!response.ok) {
				throw new Error("Failed to post reply.");
			}
			setReplyingTo(null);
			setReplyContent("");
			// Optionally refresh replies
			toggleViewReplies(post_id);
		} catch (error) {
			alert(error.message);
		}
	};

	// Toggle visibility of replies for a post
	const toggleViewReplies = async (post_id) => {
		if (!showReplies[post_id]) {
			try {
				const response = await fetch(`http://localhost:5001/api/posts/${post_id}/replies`, {
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to fetch replies.");
				}
				const replyData = await response.json();
				setReplies((prev) => ({ ...prev, [post_id]: replyData.data }));
			} catch (error) {
				alert(error.message);
			}
		}
		setShowReplies((prev) => ({ ...prev, [post_id]: !prev[post_id] }));
	};

	// Handle deleting a community post
	const handleDeletePost = async (post_id) => {
		console.log("Attempting to delete post with ID:", post_id);
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

			// Refresh community posts for top-level posts
			setCommunityPosts((prevPosts) =>
				prevPosts.filter((post) => post.post_id !== post_id)
			);

			// Refresh replies if the deleted post is a reply
			setReplies((prevReplies) => {
				const updatedReplies = { ...prevReplies };

				// Remove the reply from all parent posts' reply lists
				for (const parentPostId in updatedReplies) {
					updatedReplies[parentPostId] = updatedReplies[parentPostId].filter(
						(reply) => reply.post_id !== post_id
					);
				}

				return updatedReplies;
			});
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

	// Handle toggling like/unlike
	const handleToggleLikePost = async (post_id, liked) => {
		try {
			const url = liked
				? `http://localhost:5001/api/posts/${post_id}/unlike`
				: `http://localhost:5001/api/posts/${post_id}/like`;

			const response = await fetch(url, {
				method: "PATCH",
				credentials: "include",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to toggle like.");
			}

			// Update UI state
			setCommunityPosts((prevPosts) =>
				prevPosts.map((post) =>
					post.post_id === post_id
						? {
							...post,
							likedByCurrentUser: !liked,
							like_count: liked ? post.like_count - 1 : post.like_count + 1,
						}
						: post
				)
			);
		} catch (err) {
			alert(err.message);
		}
	};

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

			{/* Top Navigation Buttons */}
			<div className="top-nav">
				<button
					className={`top-nav-button ${activeTab === "details" ? "active" : ""}`}
					onClick={() => handleTabClick("details")}
				>
					Event Details
				</button>
				<button
					className={`top-nav-button ${activeTab === "attendees" ? "active" : ""}`}
					onClick={() => handleTabClick("attendees")}
				>
					Attendees
				</button>
				<button
					className={`top-nav-button ${activeTab === "posts" ? "active" : ""}`}
					onClick={() => handleTabClick("posts")}
				>
					Community Posts
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

						{/* Show filter buttons only for the organizer */}
						{isOrganizer && (
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
						)}

						{/* Attendees List */}
						{attendees.filter((attendee) =>
							isOrganizer
								? filterStatus === "All" || attendee.status === filterStatus
								: attendee.status === "Accepted"
						).length > 0 ? (
							<ul>
								{attendees
									.filter((attendee) =>
										isOrganizer
											? filterStatus === "All" || attendee.status === filterStatus
											: attendee.status === "Accepted"
									)
									.map((attendee) => (
										<li key={attendee.user_id} className="attendee-item">
											<span>
												{attendee.name} - {attendee.status}
											</span>
											{/* Organizer can remove attendees */}
											{isOrganizer && (
												<button
													className="remove-attendee-button"
													onClick={() => handleRemoveAttendee(attendee.user_id)}
												>
													Remove
												</button>
											)}
										</li>
									))}
							</ul>
						) : (
							<p>
								{isOrganizer
									? "No attendees found for the selected filter."
									: "No attendees have accepted the invitation yet."}
							</p>
						)}
					</div>
				)}

				{activeTab === "posts" && (
					<div className="tab-content">
						<h2>Community Posts</h2>
						{communityPosts.length > 0 ? (
							<ul className="timeline">
								{communityPosts.map((post) => (
									<li key={post.post_id} className="timeline-item">
										<div className="timeline-content">
											<div className="post-header">
												<strong>{post.user_name}</strong>
												<span className="post-date">{new Date(post.created_at).toLocaleString()}</span>
											</div>
											<p>{post.content}</p>
											<div className="post-actions">
												<button
													className={`like-button ${post.likedByCurrentUser ? "liked" : ""}`}
													onClick={() => handleToggleLikePost(post.post_id, post.likedByCurrentUser)}
												>
													{post.likedByCurrentUser ? "Unlike" : "Like"} ({post.like_count})
												</button>
												<button
													className="reply-button"
													onClick={() => setReplyingTo(post.post_id)} // Opens the reply form
												>
													Reply
												</button>
												<button
													className="view-replies-button"
													onClick={() => toggleViewReplies(post.post_id)} // Toggles replies visibility
												>
													{showReplies[post.post_id] ? "Hide Replies" : "View Replies"}
												</button>
												{(isOrganizer || post.user_id === currentUserId) && (
													<button
														className="delete-post-button"
														onClick={() => handleDeletePost(post.post_id)}
													>
														Delete
													</button>
												)}
											</div>
											{/* Reply Form */}
											{replyingTo === post.post_id && (
												<form
													className="reply-form"
													onSubmit={(e) => {
														e.preventDefault();
														handlePostReply(post.post_id, replyContent);
													}}
												>
													<textarea
														value={replyContent}
														onChange={(e) => setReplyContent(e.target.value)}
														placeholder="Write your reply here..."
													/>
													<button type="submit">Post Reply</button>
												</form>
											)}
											{/* Replies Section */}
											{showReplies[post.post_id] && (
												<ul className="replies-list">
													{replies[post.post_id]?.map((reply) => (
														<li key={reply.post_id} className="reply-item">
															<div className="reply-header">
																<strong>{reply.user_name}</strong>
																<span>{new Date(reply.created_at).toLocaleString()}</span>
															</div>
															<div className="reply-actions">
																<p>{reply.content}</p>
																{/* Delete button logic for organizer and reply author */}
																{(isOrganizer || reply.user_id === currentUserId) && (
																	<button
																		className="delete-reply-button"
																		onClick={() => handleDeletePost(reply.post_id)}
																	>
																		Delete
																	</button>
																)}
															</div>
														</li>
													))}
												</ul>
											)}
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