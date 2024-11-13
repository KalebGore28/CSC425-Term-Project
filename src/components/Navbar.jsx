//  src/components/Navbar.jsx

import React, { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar() {
	// State to track window width
	const [windowWidth, setWindowWidth] = useState(window.innerWidth);

	// State to track dropdown menu visibility
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	// Effect to update window width on resize
	useEffect(() => {
		const handleResize = () => {
			setWindowWidth(window.innerWidth)
			if (windowWidth > 768) {
				setIsMenuOpen(false);
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Toggle dropdown menu visibility
	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	return (
		<>
			{/* NAVBAR */}
			<nav className="navbar">
				<div className="navbar-container">
					<a href="/" className="logo">VenueFlow</a>
					{windowWidth > 768 ? (
						<>
							<div className="link-container">
								<a href="/party" className="nav-link">Party</a>
								<a href="/wedding" className="nav-link">Wedding</a>
								<a href="/meeting" className="nav-link">Meeting</a>
								<a href="/new-venue" className="nav-link">List a Venue</a>
							</div>
							<a href="#" className="nav-link">Sign In</a>
						</>
					) : (
						<>
							<a href="#" className="logo" onClick={toggleMenu}>☰</a>
							<div className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
								<a href="/party" className="nav-link">Party</a>
								<a href="/wedding" className="nav-link">Wedding</a>
								<a href="/meeting" className="nav-link">Meeting</a>
								<a href="/new-venue" className="nav-link">List a Venue</a>
								<a href="#" className="nav-link">Sign In</a>
							</div>
						</>
					)}
				</div>
			</nav>

			{/* HERO SECTION (optional, if needed later) */}
		</>
	);
}

export default Navbar;