//  src/components/Navbar.jsx

import React, { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar() {
	const [windowWidth, setWindowWidth] = useState(window.innerWidth);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
	const [error, setError] = useState('');
	const [user, setUser] = useState(null); // State to store logged-in user info

	useEffect(() => {
		const handleResize = () => setWindowWidth(window.innerWidth);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Fetch user info to check if logged in
	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await fetch('http://localhost:5001/api/users/me', {
					method: 'GET',
					credentials: 'include', // Include credentials to receive the cookie
				});
				if (response.ok) {
					const data = await response.json();
					setUser(data); // Set user info in state
				}
			} catch (error) {
				console.error("Error fetching user info:", error);
			}
		};

		fetchUser();
	}, []);

	const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
	const openModal = () => setIsModalOpen(true);
	const closeModal = () => {
		setIsModalOpen(false);
		setIsRegistering(false);
		setFormData({ name: '', email: '', password: '', confirmPassword: '' });
		setError('');
	};

	const toggleRegister = () => {
		setIsRegistering(!isRegistering);
		setError('');
	};

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		try {
			if (isRegistering) {
				// Register user
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
					setError(registerData.error);
					return;
				}
			}

			// Log in the user
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
				setError(loginData.error);
			} else {
				setUser(loginData.user); // Set user after successful login
				closeModal();
			}
		} catch (err) {
			setError('Something went wrong. Please try again later.');
		}
	};

	return (
		<>
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
							{user ? (
								// Render user's initial if logged in
								<div className="user-circle">
									{user.name.charAt(0).toUpperCase()}
								</div>
							) : (
								<a onClick={openModal} className="nav-link">Sign In</a>
							)}
						</>
					) : (
						<>
							<a href="#" className="logo" onClick={toggleMenu}>☰</a>
							<div className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
								<a href="/party" className="nav-link">Party</a>
								<a href="/wedding" className="nav-link">Wedding</a>
								<a href="/meeting" className="nav-link">Meeting</a>
								<a href="/new-venue" className="nav-link">List a Venue</a>
								{user ? (
									<a className="nav-link">
										{user.name}
									</a>
								) : (
									<a onClick={openModal} className="nav-link">Sign In</a>
								)}
							</div>
						</>
					)}
				</div>
			</nav>

			{isModalOpen && (
				<div className="modal-overlay" onClick={closeModal}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<button className="close-button" onClick={closeModal}>✖</button>
						<h2>{isRegistering ? "Register" : "Sign In"}</h2>
						<form onSubmit={handleSubmit}>
							{isRegistering && (
								<>
									<label>Name:</label>
									<input
										type="text"
										name="name"
										value={formData.name}
										onChange={handleChange}
										required
									/>
								</>
							)}
							<label>Email:</label>
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								required
							/>
							<label>Password:</label>
							<input
								type="password"
								name="password"
								value={formData.password}
								onChange={handleChange}
								required
							/>
							{isRegistering && (
								<>
									<label>Confirm Password:</label>
									<input
										type="password"
										name="confirmPassword"
										value={formData.confirmPassword}
										onChange={handleChange}
										required
									/>
								</>
							)}
							{error && <p className="error-message">{error}</p>}
							<button type="submit">{isRegistering ? "Register" : "Sign In"}</button>
						</form>
						<p>
							{isRegistering ? (
								"Already have an account? "
							) : (
								"Don't have an account? "
							)}
							<span className="toggle-link" onClick={toggleRegister}>
								{isRegistering ? "Sign in here!" : "Register here!"}
							</span>
						</p>
					</div>
				</div>
			)}
		</>
	);
}

export default Navbar;