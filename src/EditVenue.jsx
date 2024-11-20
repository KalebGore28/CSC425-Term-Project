import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditVenue.css";

function EditVenue() {
	const { venue_id } = useParams();
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: "",
		location: "",
		description: "",
		capacity: "",
		price: "",
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	// Fetch the current venue details on mount
	useEffect(() => {
		const fetchVenue = async () => {
			try {
				const response = await fetch(`http://localhost:5001/api/venues/${venue_id}`, {
					credentials: "include",
				});
				if (!response.ok) {
					throw new Error("Failed to fetch venue details.");
				}
				const data = await response.json();
				setFormData(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchVenue();
	}, [venue_id]);

	// Handle form field changes
	const handleInputChange = (e) => {
		const { name, value } = e.target;

		// Parse numeric fields explicitly
		const numericFields = ["capacity", "price"];
		setFormData((prev) => ({
			...prev,
			[name]: numericFields.includes(name) ? (value === "" ? "" : parseFloat(value)) : value,
		}));
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const response = await fetch(`http://localhost:5001/api/venues/${venue_id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include", // Include cookies for authentication
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update the venue.");
			}

			alert("Venue updated successfully!");
			navigate("/my-venues"); // Redirect to My Venues page
		} catch (err) {
			setError(err.message);
		}
	};

	if (isLoading) return <p>Loading venue details...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="edit-venue-page">
			<h1>Edit Venue</h1>
			<form onSubmit={handleSubmit} className="edit-venue-form">
				<label>
					Venue Name:
					<input
						type="text"
						name="name"
						value={formData.name}
						onChange={handleInputChange}
						required
					/>
				</label>
				<label>
					Location:
					<input
						type="text"
						name="location"
						value={formData.location}
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
					Capacity:
					<input
						type="number"
						name="capacity"
						value={formData.capacity}
						onChange={handleInputChange}
						min="1"
						required
					/>
				</label>
				<label>
					Daily Rent Price ($):
					<input
						type="number"
						name="price"
						value={formData.price}
						onChange={handleInputChange}
						min="0.01"
						step="0.01"
						required
					/>
				</label>
				<div className="form-actions">
					<button type="submit" className="save-button">
						Save Changes
					</button>
					<button type="button" onClick={() => navigate("/my-venues")} className="cancel-button">
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

export default EditVenue;