import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./CompleteSignup.module.css";

function CompleteSignup() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenFromURL = queryParams.get("token");
    if (!tokenFromURL) {
      setError("Invalid or missing token.");
      setIsLoading(false);
    } else {
      setToken(tokenFromURL);
      setIsLoading(false);
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password) {
      setError("Name and password are required.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5001/api/users/complete-signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, name, password }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to complete signup.");
      }

      setSuccess(true);
      setError("");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (success) {
    return (
      <div className={styles.successMessage}>
        <h1 className={styles.heading}>Signup Completed Successfully!</h1>
        <p>You will be redirected to the home page shortly.</p>
      </div>
    );
  }

  return (
    <div className={styles.completeSignupContainer}>
      <h1 className={styles.heading}>Complete Your Signup</h1>
      {error && <p className={styles.errorMessage}>{error}</p>}
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Full Name
          </label>
          <input
            type="text"
            id="name"
            className={styles.inputField}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            type="password"
            id="password"
            className={styles.inputField}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a secure password"
            required
          />
        </div>
        <button
          type="submit"
          className={`${styles.submitButton} ${styles.submitButtonHover}`}
        >
          Complete Signup
        </button>
      </form>
    </div>
  );
}

export default CompleteSignup;