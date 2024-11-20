import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./NewEvent.css";

function NewEvent() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		start_date: "",
		end_date: "",
		venue_id: "",
		invite_only: false, // Default to false
	});
	const [venues, setVenues] = useState([]); // To populate venue options
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null); // Error for fetching venues or API call errors
	const [formError, setFormError] = useState(""); // Error specific to form submission

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
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchVenues();
	}, []);

	// Handle form field changes
	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value, // Handle checkbox for invite_only
		}));
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();
		setFormError(""); // Clear previous form error

		try {
			// Prepare the data with the desired YYYY-MM-DD format
			const formatDate = (date) => {
				const d = new Date(date);
				const year = d.getFullYear();
				const month = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				return `${year}-${month}-${day}`;
			};

			const formattedData = {
				...formData,
				start_date: formatDate(formData.start_date),
				end_date: formatDate(formData.end_date),
			};

			const response = await fetch("http://localhost:5001/api/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(formattedData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create the event.");
			}

			alert("Event created successfully!");
			navigate("/my-events");
		} catch (err) {
			setFormError(err.message); // Display error message to the user
		}
	};

	if (isLoading) return <p>Loading venues...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="new-event-page">
			<h1>Create a New Event</h1>
			{formError && <p className="form-error">{formError}</p>} {/* Display form submission error */}
			<form onSubmit={handleSubmit} className="new-event-form">
				<label>
					Event Name:
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
						<option value="">Select a venue</option>
						{venues.map((venue) => (
							<option key={venue.venue_id} value={venue.venue_id}>
								{venue.name} - {venue.location}
							</option>
						))}
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
				<div className="form-actions">
					<button type="submit" className="save-button">
						Create Event
					</button>
					<button type="button" onClick={() => navigate("/my-events")} className="cancel-button">
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

export default NewEvent;