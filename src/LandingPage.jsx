import React from 'react';

function LandingPage() {
	// Inline styles
	const navbarStyle = {
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

	const navbarContainerStyle = {
		maxWidth: '1200px',
		justifyContent: 'space-between',
		alignItems: 'center',
		display: 'flex',
		width: '100%',
	};

	const containerStyle = {
		maxWidth: '600px',
		margin: 'auto',
		display: 'flex',
		justifyContent: 'space-evenly',
		padding: '0 2rem',
		flex: 1,
	};

	const logoStyle = {
		color: 'white',
		fontSize: '1.25rem',
		fontWeight: 'bold',
		textDecoration: 'none',
		marginRight: '2rem',
	};

	const navLinkStyle = {
		color: 'white',
		textDecoration: 'none',
		padding: '0.5rem 1rem',
		marginRight: '1.5rem', // Add space between each link
		borderBottom: '2px solid transparent',
		transition: 'border-bottom-color 0.3s ease',
	};

	const navLinkHoverStyle = {
		borderBottom: '2px solid #FFD700', // Replace with your preferred color
	};

	const heroStyle = {
		backgroundImage: 'url("https://your-image-url.com")', // replace with your image URL
		backgroundSize: 'cover',
		backgroundPosition: 'center',
		color: 'white',
		padding: '6rem 1rem',
		textAlign: 'center',
	};

	const headingStyle = {
		fontSize: '3rem',
		fontWeight: 'bold',
		marginBottom: '0.5rem',
	};

	const subheadingStyle = {
		fontSize: '1.25rem',
		marginBottom: '2rem',
	};

	const searchContainerStyle = {
		backgroundColor: 'white',
		padding: '1rem',
		borderRadius: '8px',
		display: 'inline-flex',
		alignItems: 'center',
		boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
	};

	const searchInputStyle = {
		border: 'none',
		padding: '0.5rem',
		marginRight: '1rem',
		fontSize: '1rem',
		flex: 1,
		outline: 'none',
	};

	const searchButtonStyle = {
		backgroundColor: '#1abc9c',
		color: 'white',
		border: 'none',
		padding: '0.75rem 1.5rem',
		borderRadius: '4px',
		cursor: 'pointer',
		fontSize: '1rem',
	};

	const eventTypeContainerStyle = {
		display: 'flex',
		justifyContent: 'center',
		gap: '1rem',
		marginTop: '2rem',
	};

	const eventTypeButtonStyle = {
		backgroundColor: '#2c3e50',
		color: 'white',
		padding: '0.75rem 1.5rem',
		borderRadius: '4px',
		cursor: 'pointer',
		border: 'none',
		fontSize: '1rem',
	};

	return (
		<>
			{/* NAVBAR */}
			<nav style={navbarStyle}>
				<div style={navbarContainerStyle}>
					<a href="/" style={logoStyle}>VenueFlow</a>
					<div style={containerStyle}>
						<a href="/party" style={{ navLinkStyle }}>Party</a>
						<a href="/wedding" style={{ navLinkStyle, navLinkHoverStyle }}>Wedding</a>
						<a href="/meeting" style={{ navLinkStyle, navLinkHoverStyle }}>Meeting</a>
						<a href="/new-venue" style={{ navLinkStyle, navLinkHoverStyle }}>List a Venue</a>
					</div>
					<a href="#" style={navLinkStyle}>Sign In</a>
				</div>
			</nav>

			{/* HERO SECTION */}
			<section style={heroStyle}>
				<h1 style={headingStyle}>Plan The Perfect Event</h1>
				<p style={subheadingStyle}>Find your Wedding, Party, or Meeting venue now.</p>

				{/* Search Bar */}
				<div style={searchContainerStyle}>
					<input type="text" placeholder="Search by Location" style={searchInputStyle} />
					<button style={searchButtonStyle}>Search Venues</button>
				</div>

				{/* Event Types */}
				<div style={eventTypeContainerStyle}>
					<button style={eventTypeButtonStyle}>Wedding</button>
					<button style={eventTypeButtonStyle}>Party</button>
					<button style={eventTypeButtonStyle}>Meeting</button>
				</div>
			</section>

			{/* MAIN CONTENT */}
			<div style={{ padding: '2rem' }}>
				<h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1rem' }}>How VenueFlow Works</h2>
				<p style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
					VenueFlow helps you find your perfect venue by searching for what matters most to you.
				</p>
				{/* Steps Section */}
				<div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
					<div style={{ textAlign: 'center', maxWidth: '300px', padding: '1rem' }}>
						<h3>Step 1</h3>
						<p>Search Location</p>
					</div>
					<div style={{ textAlign: 'center', maxWidth: '300px', padding: '1rem' }}>
						<h3>Step 2</h3>
						<p>Select Your Event Type</p>
					</div>
					<div style={{ textAlign: 'center', maxWidth: '300px', padding: '1rem' }}>
						<h3>Step 3</h3>
						<p>Book Your Venue</p>
					</div>
				</div>
			</div>
		</>
	);
}

export default LandingPage;