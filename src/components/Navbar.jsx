// src/components/Navbar.jsx

import React, { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar() {
	// State variables
	const [windowWidth, setWindowWidth] = useState(window.innerWidth);
	const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
	const [errorMessage, setErrorMessage] = useState('');
	const [currentUser, setCurrentUser] = useState(null);
	const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);

	// Effect to handle window resizing
	useEffect(() => {
		const handleResize = () => setWindowWidth(window.innerWidth);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Fetch user info on mount to check if logged in
	useEffect(() => {
		const fetchUserInfo = async () => {
			try {
				const response = await fetch('http://localhost:5001/api/users/me', {
					method: 'GET',
					credentials: 'include', // Include cookies in the request
				});
				if (response.ok) {
					const data = await response.json();
					setCurrentUser(data); // Set logged-in user
				}
			} catch (error) {
				console.error('Error fetching user info:', error);
			}
		};
		fetchUserInfo();
	}, []);

	// Toggle menu visibility
	const toggleDropdownMenu = () => setIsDropdownMenuOpen(!isDropdownMenuOpen);
	const toggleAuthModal = () => setIsAuthModalOpen(!isAuthModalOpen);
	const toggleRegistrationForm = () => setIsRegistering(!isRegistering);
	const toggleProfileMenu = () => setIsProfileMenuVisible(!isProfileMenuVisible);

	// Handle modal close
	const closeAuthModal = () => {
		setIsAuthModalOpen(false);
		setIsRegistering(false);
		setFormData({ name: '', email: '', password: '', confirmPassword: '' });
		setErrorMessage('');
	};

	// Handle form input changes
	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setFormData((prevData) => ({ ...prevData, [name]: value }));
	};

	// Handle user registration and login
	const handleAuthSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage('');

		try {
			if (isRegistering) {
				// Registration logic
				const registerResponse = await fetch('http://localhost:5001/api/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formData.name,
						email: formData.email,
						password: formData.password,
					}),
				});
				const registerData = await registerResponse.json();
				if (!registerResponse.ok) {
					setErrorMessage(registerData.error);
					return;
				}
			}

			// Login logic
			const loginResponse = await fetch('http://localhost:5001/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: formData.email,
					password: formData.password,
				}),
				credentials: 'include',
			});
			const loginData = await loginResponse.json();
			if (!loginResponse.ok) {
				setErrorMessage(loginData.error);
			} else {
				setCurrentUser(loginData.user);
				closeAuthModal();
				window.location.reload(); // Refresh the page
			}
		} catch (error) {
			setErrorMessage('Something went wrong. Please try again later.');
		}
	};

	// Handle logout
	const handleLogout = async () => {
		try {
			const response = await fetch('http://localhost:5001/api/logout', {
				method: 'POST',
				credentials: 'include',
			});
			if (response.ok) {
				setCurrentUser(null);
				alert('Logged out successfully');
				window.location.href = '/'; // Redirect to home page
			} else {
				const errorData = await response.json();
				alert(`Logout failed: ${errorData.error}`);
			}
		} catch (error) {
			alert('Error during logout. Please try again.');
		}
	};

	return (
		<>
			{/* Navbar */}
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
							{currentUser ? (
								<div className="user-profile">
									<div className="user-circle" onClick={toggleProfileMenu}>
										{currentUser.name.charAt(0).toUpperCase()}
									</div>
									<div className={`profile-menu ${isProfileMenuVisible ? 'open' : ''}`}>
										<a href="/profile" className="profile-link">My Profile</a>
										<a href="#" className="profile-link" onClick={handleLogout}>Log Out</a>
									</div>
								</div>
							) : (
								<a onClick={toggleAuthModal} className="nav-link">Sign In</a>
							)}
						</>
					) : (
						<>
							<a href="#" className="logo" onClick={toggleDropdownMenu}>☰</a>
							<div className={`dropdown-menu ${isDropdownMenuOpen ? 'open' : ''}`}>
								<a href="/party" className="nav-link">Party</a>
								<a href="/wedding" className="nav-link">Wedding</a>
								<a href="/meeting" className="nav-link">Meeting</a>
								<a href="/new-venue" className="nav-link">List a Venue</a>
								{currentUser ? (
									<>
										<a href="/profile" className="nav-link">My Profile</a>
										<a href="#" className="nav-link" onClick={handleLogout}>Log Out</a>
									</>
								) : (
									<a onClick={toggleAuthModal} className="nav-link">Sign In</a>
								)}
							</div>
						</>
					)}
				</div>
			</nav>

			{/* Authentication Modal */}
			{isAuthModalOpen && (
				<div className="modal-overlay" onClick={closeAuthModal}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<button className="close-button" onClick={closeAuthModal}>✖</button>
						<h2>{isRegistering ? 'Register' : 'Sign In'}</h2>
						<form onSubmit={handleAuthSubmit}>
							{isRegistering && (
								<>
									<label>Name:</label>
									<input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
								</>
							)}
							<label>Email:</label>
							<input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
							<label>Password:</label>
							<input type="password" name="password" value={formData.password} onChange={handleInputChange} required />
							{isRegistering && (
								<>
									<label>Confirm Password:</label>
									<input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required />
								</>
							)}
							{errorMessage && <p className="error-message">{errorMessage}</p>}
							<button type="submit">{isRegistering ? 'Register' : 'Sign In'}</button>
						</form>
						<p>
							{isRegistering ? 'Already have an account? ' : "Don't have an account? "}
							<span className="toggle-link" onClick={toggleRegistrationForm}>
								{isRegistering ? 'Sign in here!' : 'Register here!'}
							</span>
						</p>
					</div>
				</div>
			)}
		</>
	);
}

export default Navbar;