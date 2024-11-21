// src/LandingPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from './components/Footer';
import './LandingPage.css';

function LandingPage() {
	const images = [
		'/images/birthday-hero.webp',
		'/images/wedding-hero.webp',
		'/images/meeting-hero.webp',
	];

	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	useEffect(() => {
		// Change the image every 5 seconds
		const interval = setInterval(() => {
			setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
		}, 5000); // 5 seconds

		// Clean up interval on component unmount
		return () => clearInterval(interval);
	}, [images.length]);

	return (
		<>
			<div className="landing-page">
				<div
					className="hero-section"
					style={{
						backgroundImage: `url(${images[currentImageIndex]})`,
					}}
				>
					<div className="hero-content">
						<h1 className="hero-title">Plan The Perfect Event</h1>
						<p className="hero-subtitle">
							VenueFlow is your comprehensive resource to find the ideal venue for any occasion.
						</p>
						<div className="search-bar">
							<Link to="/venues" className="search-button">Explore Venues</Link>
						</div>
					</div>
				</div>
				<div className="how-it-works">
					<h2>How VenueFlow Works</h2>
					<p>Find the perfect venue by searching for the amenities and location that suit your needs.</p>
					<div className="steps">
						<div className="step">
							<h3>Step 1</h3>
							<p>Search by location and filter by amenities.</p>
						</div>
						<div className="step">
							<h3>Step 2</h3>
							<p>Explore venue details and availability.</p>
						</div>
						<div className="step">
							<h3>Step 3</h3>
							<p>Contact venues and finalize your booking.</p>
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</>
	);
}

export default LandingPage;