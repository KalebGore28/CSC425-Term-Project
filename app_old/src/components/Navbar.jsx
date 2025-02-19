// src/components/Navbar.jsx

import React, { createContext, useState, useEffect } from 'react';
import './Navbar.css';

// Create a Context for Navbar
const NavbarContext = createContext();

// Navbar Component
function Navbar({ children }) {
	// State variables
	const [windowWidth, setWindowWidth] = useState(window.innerWidth);
	const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
	const [errorMessage, setErrorMessage] = useState('');
	const [currentUser, setCurrentUser] = useState(null);
	const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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

	// Fetch notifications
	useEffect(() => {
		const fetchNotifications = async () => {
			if (!currentUser) return; // Only fetch if the user is logged in

			try {
				const response = await fetch('http://localhost:5001/api/notifications', {
					method: 'GET',
					credentials: 'include',
				});
				if (response.ok) {
					const data = await response.json();
					setNotifications(data.data || []); // Safely handle empty or missing data
				} else {
					console.error('Failed to fetch notifications');
					setNotifications([]); // Reset notifications in case of failure
				}
			} catch (error) {
				console.error('Error fetching notifications:', error);
				setNotifications([]); // Handle errors gracefully
			}
		};

		fetchNotifications();
	}, [currentUser]);

	// Functions to toggle UI elements
	const toggleDropdownMenu = () => setIsDropdownMenuOpen(!isDropdownMenuOpen);
	const toggleAuthModal = () => setIsAuthModalOpen(!isAuthModalOpen);
	const toggleRegistrationForm = () => setIsRegistering(!isRegistering);
	const toggleProfileMenu = () => {
		setIsProfileMenuVisible(!isProfileMenuVisible)

		if (isNotificationsOpen) {
			setIsNotificationsOpen(false);
		}
	};
	const toggleNotifications = () => {
		setIsNotificationsOpen(!isNotificationsOpen);

		if (isProfileMenuVisible) {
			setIsProfileMenuVisible(false);
		}
	};

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

	// Mark notifications as read
	const markNotificationsAsRead = async () => {
		try {
			await fetch('http://localhost:5001/api/notifications/readall', {
				method: 'POST',
				credentials: 'include',
			});

			// Update the state in the frontend
			setNotifications((prev) =>
				prev.map((notif) => ({ ...notif, status: "Read" }))
			);

		} catch (error) {
			console.error('Error marking notifications as read:', error);
		}
	};

	// Delete notification
	const deleteNotification = async (id) => {
		try {
			await fetch(`http://localhost:5001/api/notifications/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			// Update the state in the frontend
			setNotifications((prev) =>
				prev.filter((notif) => notif.id !== id)
			);

		} catch (error) {
			console.error('Error deleting notification:', error);
		}
	};

	// Provide context value
	const contextValue = {
		windowWidth,
		isDropdownMenuOpen,
		toggleDropdownMenu,
		isAuthModalOpen,
		toggleAuthModal,
		isRegistering,
		toggleRegistrationForm,
		currentUser,
		setCurrentUser,
		isProfileMenuVisible,
		toggleProfileMenu,
		formData,
		setFormData,
		handleInputChange,
		errorMessage,
		setErrorMessage,
		closeAuthModal,
		handleLogout,
		notifications,
		setNotifications,
		toggleNotifications,
	};

	return (
		<NavbarContext.Provider value={contextValue}>
			<>
				{/* Navbar */}
				<nav className="navbar">
					<div className="navbar-container">
						<a href="/" className="logo">VenueFlow</a>
						{windowWidth > 768 ? (
							<>
								<div className="link-container">
									<a href="/venues" className="nav-link">Explore Venues</a>
									<a href="/events" className="nav-link">Events</a>
									<a href="/list-venue" className="nav-link">List a Venue</a>
								</div>
								{currentUser ? (
									<>
										<div className="notifications-icon" onClick={toggleNotifications}>
											🔔
											{/* Notification dot */}
											{notifications.some((notif) => notif.status !== "Read") && (
												<span className="notification-dot" />
											)}
											{/* Notifications dropdown */}
											<div className={`notifications-dropdown ${isNotificationsOpen ? 'open' : ''}`}>
												{notifications.length ? (
													<>
														<button onClick={markNotificationsAsRead}>Mark all as read</button>
														{notifications.map((notif) => (
															<div key={notif.notification_id} className={`notification-item ${notif.status === "Read" ? 'read' : 'unread'}`}>
																<p>{notif.message}</p>
																<a href="#" onClick={(event) => {
																	event.preventDefault();
																	deleteNotification(notif.notification_id);
																}}>
																	X
																</a>
															</div>
														))}
													</>
												) : (
													<p>No new notifications</p>
												)}
											</div>
										</div>
										<div className="user-profile">
											<div className="user-circle" onClick={toggleProfileMenu}>
												{currentUser.name.charAt(0).toUpperCase()}
											</div>
											<div className={`profile-menu ${isProfileMenuVisible ? 'open' : ''}`}>
												<a href="/profile" className="profile-link">My Profile</a>
												<a href="/my-venues" className="nav-link">My Venues</a>
												<a href="/my-events" className="nav-link">My Events</a>
												<a href="#" className="profile-link" onClick={handleLogout}>Log Out</a>
											</div>
										</div>
									</>
								) : (
									<a onClick={toggleAuthModal} className="nav-link">Sign In</a>
								)}
							</>
						) : (
							<>
								<a href="#" className="logo" onClick={toggleDropdownMenu}>☰</a>
								<div className={`dropdown-menu ${isDropdownMenuOpen ? 'open' : ''}`}>
									<a href="/venues" className="nav-link">Explore Venues</a>
									<a href="/events" className="nav-link">Events</a>
									<a href="/list-venue" className="nav-link">List a Venue</a>
									{currentUser ? (
										<>
											<a href="/profile" className="nav-link">My Profile</a>
											<a href="/my-venues" className="nav-link">My Venues</a>
											<a href="/my-events" className="nav-link">My Events</a>
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
							{/* Attach the handleAuthSubmit function to the form's onSubmit */}
							<form onSubmit={handleAuthSubmit}>
								{isRegistering && (
									<>
										<label>Name:</label>
										<input
											type="text"
											name="name"
											value={formData.name}
											onChange={handleInputChange}
											required
										/>
									</>
								)}
								<label>Email:</label>
								<input
									type="email"
									name="email"
									value={formData.email}
									onChange={handleInputChange}
									required
								/>
								<label>Password:</label>
								<input
									type="password"
									name="password"
									value={formData.password}
									onChange={handleInputChange}
									required
								/>
								{isRegistering && (
									<>
										<label>Confirm Password:</label>
										<input
											type="password"
											name="confirmPassword"
											value={formData.confirmPassword}
											onChange={handleInputChange}
											required
										/>
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

				{/* Children */}
				{children}
			</>
		</NavbarContext.Provider>
	);
}

// Export the Navbar Context
export { NavbarContext };

// Default Export Navbar
export default Navbar;