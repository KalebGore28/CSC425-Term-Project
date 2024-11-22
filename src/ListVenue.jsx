import React, { useState, useContext } from "react";
import { NavbarContext } from "./components/Navbar";
import "./ListVenue.css";

const ListVenue = () => {
  const { currentUser, toggleAuthModal } = useContext(NavbarContext); // Check if the user is signed in
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    capacity: "",
    price: "",
  });
  const [images, setImages] = useState([]); // State for image files
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image uploads
  const handleImageChange = (e) => {
    setImages([...e.target.files]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
	e.preventDefault();
  
	if (!currentUser) {
	  toggleAuthModal();
	  return;
	}
  
	try {
	  // Step 1: Create the venue
	  const venueResponse = await fetch("http://localhost:5001/api/venues", {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify(formData),
	  });
  
	  if (!venueResponse.ok) {
		const errorData = await venueResponse.json();
		throw new Error(errorData.error || "Failed to list the venue.");
	  }
  
	  const venueResult = await venueResponse.json();
	  const venueId = venueResult.venue_id;
  
	  // Step 2: Upload all images in a single request
	  if (images.length > 0) {
		const formData = new FormData();
		images.forEach((image) => {
		  formData.append("images", image); // Append each image file
		});
  
		const imageResponse = await fetch(`http://localhost:5001/api/venues/${venueId}/images`, {
		  method: "POST",
		  credentials: "include",
		  body: formData,
		});
  
		if (!imageResponse.ok) {
		  const errorData = await imageResponse.json();
		  throw new Error(errorData.error || "Failed to upload images.");
		}
	  }
  
	  // Step 3: Show success message and reset form
	  setSuccessMessage("Venue listed successfully!");
	  setFormData({ name: "", description: "", location: "", capacity: "", price: "" });
	  setImages([]);
	} catch (error) {
	  setErrorMessage(error.message);
	}
  };

  return (
    <div className="list-venue-page">
      <h1>List Your Venue</h1>
      <p>Provide the details of your venue to make it available for booking.</p>
      <form onSubmit={handleSubmit} className="list-venue-form">
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
          Description:
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
          ></textarea>
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
          Capacity:
          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                handleInputChange({ target: { name: "capacity", value } });
              } else {
                handleInputChange({ target: { name: "capacity", value: "" } });
              }
            }}
            min="1"
            step="1"
            required
          />
        </label>
        <label>
          Daily Rent Price ($):
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0) {
                handleInputChange({ target: { name: "price", value } });
              } else {
                handleInputChange({ target: { name: "price", value: "" } });
              }
            }}
            step="0.01"
            min="0.01"
            required
          />
        </label>
        <label>
          Upload Pictures:
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
        </label>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        <button type="submit" className="submit-button">List Venue</button>
      </form>
    </div>
  );
};

export default ListVenue;