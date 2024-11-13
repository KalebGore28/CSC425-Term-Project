import React, { useState, useEffect } from 'react';

function LandingPage() {
	// Inline styles
	const navbar = {
		backgroundColor: '#34495e',
		color: 'white',
		padding: '1rem',
		position: 'fixed',
		top: 0,
		width: '100%',
		zIndex: 1000,
		justifyContent: 'center',
		display: 'flex',
	};

	const navbarContainer = {
		maxWidth: '1200px',
		justifyContent: 'space-between',
		alignItems: 'center',
		display: 'flex',
		width: '100%',
	};

	const linkContainer = {
		maxWidth: '600px',
		margin: 'auto',
		display: 'flex',
		justifyContent: 'space-evenly',
	};

	const logoStyle = {
		color: 'white',
		fontSize: '2rem',
		fontWeight: 'bold',
		textDecoration: 'none',
		marginRight: '2rem',
		whiteSpace: 'nowrap', // Prevent text wrapping
	};

	const navLinkStyle = {
		color: 'white',
		textDecoration: 'none',
		padding: '0.5rem 1rem',
		marginRight: '1.5rem',
		whiteSpace: 'nowrap', // Prevent text wrapping
	};

	const dropdownMenuStyle = {
		position: 'absolute',
		top: '4.5rem',
		right: '1rem',
		padding: '0 1rem ',
		backgroundColor: '#34495e',
		borderRadius: '0.5rem',
		boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.1)',
		maxHeight: '0',
		overflow: 'hidden',
		transition: 'max-height 0.3s ease-out',
		display: 'flex',
		flexDirection: 'column',
	};

	const dropdownMenuOpenStyle = {
		...dropdownMenuStyle,
		maxHeight: '200px', // Adjust this value based on the content height
	};

	// State to track window width
	const [windowWidth, setWindowWidth] = useState(window.innerWidth);

	// State to track dropdown menu visibility
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	// Effect to update window width on resize
	useEffect(() => {
		const handleResize = () => setWindowWidth(window.innerWidth);
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
			<nav style={navbar}>
				<div style={navbarContainer}>
					<a href="/" style={logoStyle}>VenueFlow</a>
					{windowWidth > 768 && (
						<>
							<div style={linkContainer}>
								<a href="/party" style={navLinkStyle}>Party</a>
								<a href="/wedding" style={navLinkStyle}>Wedding</a>
								<a href="/meeting" style={navLinkStyle}>Meeting</a>
								<a href="/new-venue" style={navLinkStyle}>List a Venue</a>
							</div>
							<a href="#" style={navLinkStyle}>Sign In</a>
						</>
					)}
					{windowWidth <= 768 && (
						<>
							<a href="#" style={logoStyle} onClick={toggleMenu}>☰</a>
							<div style={isMenuOpen ? dropdownMenuOpenStyle : dropdownMenuStyle}>
								<a href="/party" style={navLinkStyle}>Party</a>
								<a href="/wedding" style={navLinkStyle}>Wedding</a>
								<a href="/meeting" style={navLinkStyle}>Meeting</a>
								<a href="/new-venue" style={navLinkStyle}>List a Venue</a>
								<a href="#" style={navLinkStyle}>Sign In</a>
							</div>
						</>
					)}
				</div>
			</nav>
		</>
	);
}

export default LandingPage;