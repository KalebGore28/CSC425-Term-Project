import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MyVenues.css";

function MyVenues() {
    const [venues, setVenues] = useState([]);
    const [rentedVenues, setRentedVenues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("myVenues"); // Track active tab
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const responseMyVenues = await fetch("http://localhost:5001/api/users/me/venues", {
                    credentials: "include",
                });
                const responseRentedVenues = await fetch("http://localhost:5001/api/users/me/rented-venues", {
                    credentials: "include",
                });

                if (!responseMyVenues.ok || !responseRentedVenues.ok) {
                    throw new Error("Failed to fetch venues.");
                }

                const myVenuesData = await responseMyVenues.json();
                const rentedVenuesData = await responseRentedVenues.json();

                setVenues(myVenuesData.data);
                setRentedVenues(rentedVenuesData.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleEdit = (venueId) => {
        navigate(`/venues/${venueId}/edit`);
    };

    const handleDelete = async (venueId) => {
        if (window.confirm("Are you sure you want to delete this venue?")) {
            try {
                const response = await fetch(`http://localhost:5001/api/venues/${venueId}`, {
                    method: "DELETE",
                    credentials: "include",
                });
                if (!response.ok) {
                    throw new Error("Failed to delete the venue.");
                }
                setVenues((prev) => prev.filter((venue) => venue.venue_id !== venueId));
                alert("Venue deleted successfully.");
            } catch (err) {
                alert(err.message);
            }
        }
    };

    if (isLoading) return <p>Loading your venues...</p>;
    if (error) return <p>Error: {error}</p>;

    const renderVenueCard = (venue, isRented = false) => (
        <div className="venue-card" key={venue.venue_id}>
            <img
                src={`http://localhost:5001${venue.thumbnail_image}`}
                alt={`${venue.name} Thumbnail`}
                className="venue-thumbnail"
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/fallback-image.webp";
                }}
            />
            <div className="venue-info">
                <h2>{venue.name}</h2>
                <p><strong>Location:</strong> {venue.location}</p>
                <p className="venue-description">{venue.description}</p>
                <p><strong>Capacity:</strong> {venue.capacity}</p>
                <p><strong>Price:</strong> ${venue.price}/day</p>
                {isRented && (
                    <>
                        <p><strong>Rental Start:</strong> {venue.start_date}</p>
                        <p><strong>Rental End:</strong> {venue.end_date}</p>
                    </>
                )}
            </div>
            {isRented ? (
                <div className="venue-actions">
                    <button
                        onClick={() =>
                            navigate("/events/new", {
                                state: {
                                    start_date: venue.start_date,
                                    end_date: venue.end_date,
                                    venue_id: venue.venue_id,
                                    venue_name: venue.name,
                                },
                            })
                        }
                        className="create-event-button"
                    >
                        Create Event
                    </button>
                </div>
            ) : (
                <div className="venue-actions">
                    <button onClick={() => handleEdit(venue.venue_id)} className="edit-button">
                        Edit
                    </button>
                    <button onClick={() => handleDelete(venue.venue_id)} className="delete-button">
                        Delete
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="my-venues-page">
            <h1>My Venues</h1>
            <div className="tab-selector">
                <button
                    className={activeTab === "myVenues" ? "active-tab" : ""}
                    onClick={() => setActiveTab("myVenues")}
                >
                    My Venues
                </button>
                <button
                    className={activeTab === "rentedVenues" ? "active-tab" : ""}
                    onClick={() => setActiveTab("rentedVenues")}
                >
                    Rented Venues
                </button>
            </div>
            {activeTab === "myVenues" ? (
                venues.length > 0 ? (
                    <div className="venues-grid">
                        {venues.map((venue) => renderVenueCard(venue))}
                    </div>
                ) : (
                    <p>You have no venues. <Link to="/list-venue">List a new venue</Link></p>
                )
            ) : (
                rentedVenues.length > 0 ? (
                    <div className="venues-grid">
                        {rentedVenues.map((venue) => renderVenueCard(venue, true))}
                    </div>
                ) : (
                    <p>You have no rented venues.</p>
                )
            )
            }
        </div >
    );
}

export default MyVenues;