import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditEvent.css";

function EditEvent() {
	const { event_id } = useParams(); // Get the event ID from the URL
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		start_date: "",
		end_date: "",
		invite_only: false, // Default to false
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	// Fetch event details on mount
	useEffect(() => {
		const fetchEventDetails = async () => {
			try {
				const response = await fetch(`http://localhost:5001/api/events/${event_id}`, {
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to fetch event details.");
				}
				const data = await response.json();
				// Populate the form with existing event details
				setFormData({
					name: data.name,
					description: data.description,
					start_date: data.start_date,
					end_date: data.end_date,
					invite_only: data.invite_only,
				});
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchEventDetails();
	}, [event_id]);

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

		try {
			const response = await fetch(`http://localhost:5001/api/events/${event_id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update the event.");
			}

			alert("Event updated successfully!");
			navigate("/my-events");
		} catch (err) {
			setError(err.message);
		}
	};

	if (isLoading) return <p>Loading event details...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="edit-event-page">
			<h1>Edit Event</h1>
			<form onSubmit={handleSubmit} className="edit-event-form">
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
						Save Changes
					</button>
					<button type="button" onClick={() => navigate("/my-events")} className="cancel-button">
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

export default EditEvent;