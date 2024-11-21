import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CompleteSignup.css";

function CompleteSignup() {
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [token, setToken] = useState(null);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();
	const location = useLocation();

	// Extract token from URL
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const tokenFromURL = queryParams.get("token");
		console.log("Token from URL:", tokenFromURL); // Log the token
		if (!tokenFromURL) {
			setError("Invalid or missing token.");
			console.log("Error: Invalid or missing token.");
			setIsLoading(false);
		} else {
			setToken(tokenFromURL);
			console.log("Token is valid, setting isLoading to false.");
			setIsLoading(false);
		}
	}, [location.search]);

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name || !password) {
			setError("Name and password are required.");
			return;
		}

		try {
			const response = await fetch("http://localhost:5001/api/users/complete-signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, name, password }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to complete signup.");
			}

			setSuccess(true);
			setError("");
			setTimeout(() => navigate("/"), 3000); // Redirect to home after 3 seconds
		} catch (err) {
			setError(err.message);
		}
	};

	if (isLoading) {
		return <p>Loading...</p>;
	}

	if (success) {
		return (
			<div className="success-message">
				<h1>Signup Completed Successfully!</h1>
				<p>You will be redirected to the home page shortly.</p>
			</div>
		);
	}

	return (
		<div className="complete-signup-container">
			<h1>Complete Your Signup</h1>
			{error && <p className="error-message">{error}</p>}
			<form onSubmit={handleSubmit}>
				<div className="form-group">
					<label htmlFor="name">Full Name</label>
					<input
						type="text"
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Enter your full name"
						required
					/>
				</div>
				<div className="form-group">
					<label htmlFor="password">Password</label>
					<input
						type="password"
						id="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Enter a secure password"
						required
					/>
				</div>
				<button type="submit">Complete Signup</button>
			</form>
		</div>
	);
}

export default CompleteSignup;