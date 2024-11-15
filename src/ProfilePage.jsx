// src/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './ProfilePage.css'; // Optional for styling

function ProfilePage() {
	const [user, setUser] = useState(null);
	const [formData, setFormData] = useState({ name: '', email: '' });
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);

	// Fetch user details on mount
	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await fetch('http://localhost:5001/api/users/me', {
					credentials: 'include',
				});
				if (response.ok) {
					const data = await response.json();
					setUser(data);
					setFormData({ name: data.name, email: data.email });
				} else {
					setError('Failed to fetch user information.');
				}
			} catch (err) {
				setError('Error fetching user details.');
			}
		};
		fetchUser();
	}, []);

	// Handle input changes
	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	// Handle profile updates
	const handleUpdate = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		try {
			const response = await fetch(`http://localhost:5001/api/users/${user.user_id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
				credentials: 'include',
			});

			if (response.ok) {
				setSuccess('Profile updated successfully.');
				const updatedUser = await response.json();
				setUser(updatedUser);
			} else {
				const errorData = await response.json();
				setError(errorData.error || 'Failed to update profile.');
			}
		} catch (err) {
			setError('Error updating profile.');
		}
	};

	// Handle account deletion
	const handleDelete = async () => {
		try {
			const response = await fetch(`http://localhost:5001/api/users/${user.user_id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (response.ok) {
				alert('Account deleted successfully.');
				window.location.href = '/'; // Redirect to home page
			} else {
				const errorData = await response.json();
				alert(errorData.error || 'Failed to delete account.');
			}
		} catch (err) {
			alert('Error deleting account.');
		}
	};

	return (
		<>
			<Navbar />
			<div className="profile-page">
				<h1>Profile</h1>

				{/* User Details */}
				{user && (
					<form onSubmit={handleUpdate}>
						<div className="form-group">
							<label>Name:</label>
							<input
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								required
							/>
						</div>

						<div className="form-group">
							<label>Email:</label>
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								required
							/>
						</div>

						{/* Success/Error Messages */}
						{success && <p className="success-message">{success}</p>}
						{error && <p className="error-message">{error}</p>}

						<button type="submit" className="btn">Save Changes</button>
					</form>
				)}

				{/* Account Settings */}
				<div className="account-settings">
					<h2>Account Settings</h2>
					<button
						className="btn delete-btn"
						onClick={() => setIsDeleting(true)}
					>
						Delete Account
					</button>
				</div>

				{/* Delete Confirmation Modal */}
				{isDeleting && (
					<div className="modal-overlay" onClick={() => setIsDeleting(false)}>
						<div className="modal-content" onClick={(e) => e.stopPropagation()}>
							<p>Are you sure you want to delete your account? This action cannot be undone.</p>
							<button
								className="btn confirm-btn"
								onClick={handleDelete}
							>
								Yes, Delete
							</button>
							<button
								className="btn cancel-btn"
								onClick={() => setIsDeleting(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</div>
		</>
	);
}

export default ProfilePage;