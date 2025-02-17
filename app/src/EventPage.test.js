import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EventPage from "./EventPage";

describe("EventPage", () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = jest.fn();

    // Suppress specific console.error messages
    jest.spyOn(console, "error").mockImplementation((message, ...args) => {
      if (message.includes("Failed to fetch events")) {
        return; // Suppress this specific error
      }
      console.error(message, ...args); // Let other errors pass through
    });
  });

  afterEach(() => {
    // Clean up mock
    global.fetch.mockRestore();
  });

  test("renders 'No events to display' initially", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <EventPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/No events to display/i)).toBeInTheDocument();
  });

  test("renders future events correctly", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            event_id: 1,
            event_name: "Future Event",
            start_date: futureDate,
            venue_name: "Grand Hall",
            venue_location: "Downtown",
          },
        ],
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <EventPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Future Event/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Grand Hall/i)).toBeInTheDocument();
      expect(screen.getByText(/Downtown/i)).toBeInTheDocument();
    });
  });

  test("filters and displays past events correctly", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            event_id: 2,
            event_name: "Past Event",
            start_date: pastDate,
            venue_name: "Rustic Barn",
            venue_location: "Countryside",
          },
        ],
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <EventPage />
        </MemoryRouter>
      );
    });

    fireEvent.click(screen.getByText(/Past Events/i));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Past Event/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Rustic Barn/i)).toBeInTheDocument();
      expect(screen.getByText(/Countryside/i)).toBeInTheDocument();
    });
  });

  test("filters and displays current/future events correctly", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
    const pastDate = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            event_id: 1,
            event_name: "Future Event",
            start_date: futureDate,
            venue_name: "Grand Hall",
            venue_location: "Downtown",
          },
          {
            event_id: 2,
            event_name: "Past Event",
            start_date: pastDate,
            venue_name: "Rustic Barn",
            venue_location: "Countryside",
          },
        ],
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <EventPage />
        </MemoryRouter>
      );
    });

    fireEvent.click(screen.getByText(/Current\/Future Events/i));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Future Event/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: /Past Event/i })
      ).not.toBeInTheDocument();
    });
  });

  test("handles fetch failure gracefully", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    await act(async () => {
      render(
        <MemoryRouter>
          <EventPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/No events to display/i)).toBeInTheDocument();
  });
});

jest.spyOn(console, "warn").mockImplementation((message) => {
  if (message.includes("React Router Future Flag Warning")) {
    return; // Suppress specific warnings
  }
  console.warn(message); // Let other warnings pass through
});