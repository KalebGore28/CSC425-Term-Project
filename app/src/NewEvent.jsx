import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./NewEvent.css";

function NewEvent() {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state || {};

	// Initialize formData with venue_name and venue_id if provided
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		start_date: state.start_date || "",
		end_date: state.end_date || "",
		venue_id: state.venue_id || "",
		venue_name: state.venue_name || "",
		invite_only: false,
	});

	const [isRented, setIsRented] = useState(!!state.start_date);
	const [venues, setVenues] = useState([]);
	const [error, setError] = useState(null);
	const [validationError, setValidationError] = useState(""); // Store specific validation errors

	// Fetch user's venues on mount
	useEffect(() => {
		const fetchVenues = async () => {
			try {
				const response = await fetch("http://localhost:5001/api/users/me/venues", {
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to fetch venues.");
				}
				const { data } = await response.json();
				setVenues(data);

				// Auto-select venue if venue_id is provided
				if (state.venue_id) {
					const selectedVenue = data.find((venue) => venue.venue_id === state.venue_id);
					if (selectedVenue) {
						setFormData((prev) => ({
							...prev,
							venue_id: selectedVenue.venue_id,
							venue_name: selectedVenue.name,
						}));
					}
				}
			} catch (err) {
				setError(err.message);
			}
		};
		fetchVenues();
	}, [state.venue_id]);

	// Handle form field changes
	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		if (isRented && (name === "start_date" || name === "end_date")) return; // Prevent changes to rental dates
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await fetch("http://localhost:5001/api/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				if (errorData.error) {
					// Handle backend-specific error message
					setValidationError(errorData.error);
				} else {
					throw new Error("Failed to create the event.");
				}
			} else {
				alert("Event created successfully!");
				navigate("/my-events");
			}
		} catch (err) {
			setValidationError(err.message); // Catch other errors
		}
	};

	if (error) return <p>Error: {error}</p>;

	return (
		<div className="new-event-container">
			<h1>Create a New Event</h1>
			{validationError && (
				<div className="error-message">
					<p>{validationError}</p>
				</div>
			)}
			<form onSubmit={handleSubmit} className="new-event-form">
				<label>
					Name:
					<input
						type="text"
						name="name"
						value={formData.name}
						onChange={handleInputChange}
						required
					/>
				</label>
				<label>
					Description:
					<textarea
						name="description"
						value={formData.description}
						onChange={handleInputChange}
						required
					></textarea>
				</label>
				<label>
					Start Date:
					<input
						type="date"
						name="start_date"
						value={formData.start_date}
						onChange={handleInputChange}
						disabled={isRented}
						required
					/>
				</label>
				<label>
					End Date:
					<input
						type="date"
						name="end_date"
						value={formData.end_date}
						onChange={handleInputChange}
						disabled={isRented}
						required
					/>
				</label>
				<label>
					Venue:
					<select
						name="venue_id"
						value={formData.venue_id}
						onChange={handleInputChange}
						required
					>
						<option value={formData.venue_id || ""}>
							{formData.venue_name || "Select a venue"}
						</option>
						{venues.map((venue) =>
							venue.venue_id !== formData.venue_id ? (
								<option key={venue.venue_id} value={venue.venue_id}>
									{venue.name} - {venue.location}
								</option>
							) : null
						)}
					</select>
				</label>
				<label>
					Invite Only:
					<input
						type="checkbox"
						name="invite_only"
						checked={formData.invite_only}
						onChange={handleInputChange}
					/>
				</label>
				<button type="submit">Create Event</button>
			</form>
		</div>
	);
}

export default NewEvent;