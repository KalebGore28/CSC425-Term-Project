import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavbarContext } from './components/Navbar';
import Calendar from 'react-calendar';
import Slider from 'react-slick';
import './VenueDetail.css';
import 'react-calendar/dist/Calendar.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

function VenueDetail() {
	const { venue_id } = useParams();
	const navigate = useNavigate();
	const [venue, setVenue] = useState(null);
	const [availableDates, setAvailableDates] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	// Use NavbarContext for authentication handling
	const { toggleAuthModal, currentUser } = useContext(NavbarContext);

	// Fetch venue details and available dates
	useEffect(() => {
		const fetchVenueAndDates = async () => {
			try {
				const venueResponse = await fetch(`http://localhost:5001/api/venues/${venue_id}`);
				if (!venueResponse.ok) throw new Error('Failed to fetch venue details.');
				const venueData = await venueResponse.json();
				setVenue(venueData);

				const datesResponse = await fetch(`http://localhost:5001/api/venues/${venue_id}/available_dates`);
				if (!datesResponse.ok) throw new Error('Failed to fetch available dates.');
				const datesData = await datesResponse.json();
				const parsedDates = datesData.data.map((date) => new Date(date.available_date));
				setAvailableDates(parsedDates);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchVenueAndDates();
	}, [venue_id]);

	// Calendar highlighting for available dates
	const tileClassName = useMemo(() => {
		return ({ date, view }) => {
			if (view === 'month') {
				const isAvailable = availableDates.some(
					(d) => d.toISOString().split('T')[0] === date.toISOString().split('T')[0]
				);
				return isAvailable ? 'highlight-date' : null;
			}
			return null;
		};
	}, [availableDates]);

	// Handle navigation back to the venues page
	const handleBackClick = () => navigate('/venues');

	// Handle "Book Now" button click
	const handleBookNow = () => {
		if (!currentUser) {
			// If not authenticated, show the sign-in modal
			toggleAuthModal();
		} else {
			// If authenticated, navigate to the booking page
			navigate(`/venues/${venue_id}/booking`);
		}
	};

	// Slider settings for the image carousel
	const sliderSettings = {
		dots: true,
		infinite: true,
		speed: 500,
		slidesToShow: 1,
		slidesToScroll: 1,
		arrows: true,
	};

	// Placeholder image array (replace this with API-based image fetching when implemented)
	const images = [
		`http://localhost:5001/api/images/${venue?.thumbnail_image_id}`,
		`http://localhost:5001/api/images/${venue?.thumbnail_image_id}`, // Duplicate for testing
	];

	if (isLoading) return <p>Loading venue details...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<>
			<div className="venue-detail-page">
				<button onClick={handleBackClick} className="back-button">
					&larr; Back to Venues
				</button>
				<div className="venue-carousel">
					<Slider {...sliderSettings}>
						{images.map((img, index) => (
							<div key={index} className="carousel-slide">
								<img src={img} alt={`Venue ${index + 1}`} className="venue-detail-image" />
							</div>
						))}
					</Slider>
				</div>
				<div className="venue-detail">
					<div className="venue-detail-info">
						<h1>{venue.name}</h1>
						<p>
							<strong>Location:</strong> {venue.location}
						</p>
						<p>
							<strong>Description:</strong> {venue.description}
						</p>
						<p>
							<strong>Capacity:</strong> {venue.capacity}
						</p>
						<p>
							<strong>Price:</strong> ${venue.price}
						</p>
					</div>
					<div className="venue-detail-calendar">
						<h1>Available Dates</h1>
						<Calendar tileClassName={tileClassName} />
					</div>
				</div>
				<button onClick={handleBookNow} className="confirm-booking-button">
					Book Now
				</button>
			</div>
		</>
	);
}

export default VenueDetail;