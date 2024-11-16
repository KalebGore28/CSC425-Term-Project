import React, { useState, useEffect } from "react";
import "./EventPage.css";

const EventPage = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filter, setFilter] = useState("future"); // Default to future events

  useEffect(() => {
    // Fetch events from the API
    const fetchEvents = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/events"); // Update this URL if necessary
        if (!response.ok) {
          throw new Error(`Error fetching events: ${response.statusText}`);
        }
        const data = await response.json();
        setEvents(data.data); // Assuming the API returns { data: [events] }
        filterEvents(data.data, "future");
      } catch (error) {
        console.error("Failed to fetch events:", error);
      }
    };

    fetchEvents();
  }, []);

  const filterEvents = (allEvents, filterType) => {
    const now = new Date();
    if (filterType === "future") {
      setFilteredEvents(allEvents.filter(event => new Date(event.start_date) >= now));
    } else {
      setFilteredEvents(allEvents.filter(event => new Date(event.start_date) < now));
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    filterEvents(events, newFilter);
  };

  return (
    <div className="event-page">
      <header className="event-page-header">
        <h1>Events</h1>
        <p>Discover upcoming events and find details about past ones.</p>
        <div className="filter-buttons">
          <button
            className={filter === "future" ? "active" : ""}
            onClick={() => handleFilterChange("future")}
          >
            Current/Future Events
          </button>
          <button
            className={filter === "past" ? "active" : ""}
            onClick={() => handleFilterChange("past")}
          >
            Past Events
          </button>
        </div>
      </header>
      <section className="event-list">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => (
            <div key={event.event_id} className="event-item">
              <h2>{event.event_name}</h2>
              <p>{event.description}</p>
              <p>Date: {event.start_date}</p>
              <p>Location: {event.venue_name}, {event.venue_location}</p>
            </div>
          ))
        ) : (
          <p>No events to display.</p>
        )}
      </section>
    </div>
  );
};

export default EventPage;