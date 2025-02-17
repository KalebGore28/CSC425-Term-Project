import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventDetail from "./EventDetail";
import { NavbarContext } from "./components/Navbar";

describe("EventDetail", () => {
	const mockToggleAuthModal = jest.fn();
	const mockNavigate = jest.fn();

	beforeEach(() => {
		global.fetch = jest.fn();
		jest.spyOn(console, "error").mockImplementation(() => { }); // Suppress console errors
	});

	afterEach(() => {
		global.fetch.mockRestore();
		jest.restoreAllMocks();
	});

	const renderWithContext = (currentUser) => {
		render(
			<NavbarContext.Provider value={{ toggleAuthModal: mockToggleAuthModal, currentUser }}>
				<MemoryRouter initialEntries={["/events/1"]}>
					<Routes>
						<Route path="/events/:event_id" element={<EventDetail />} />
					</Routes>
				</MemoryRouter>
			</NavbarContext.Provider>
		);
	};

	test("renders loading state initially", () => {
		renderWithContext(null);
		expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
	});

	test("renders event details on successful fetch", async () => {
		// Mock successful fetch response
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				name: "Networking Mixer",
				description: "A night of connecting with local professionals.",
				start_date: "2024-12-25",
				end_date: "2024-12-27",
				venue_name: "Grand Hall",
				venue_location: "Downtown",
				organizer_name: "Frank Green",
			}),
		});

		renderWithContext(null);

		// Wait for the event details to load
		await waitFor(() => {
			expect(screen.getByText(/Networking Mixer/i)).toBeInTheDocument();
			expect(screen.getByText(/A night of connecting with local professionals./i)).toBeInTheDocument();
			expect(screen.getByText(/2024-12-25 to 2024-12-27/i)).toBeInTheDocument();
			expect(screen.getByText(/Grand Hall, Downtown/i)).toBeInTheDocument();
			expect(screen.getByText(/Frank Green/i)).toBeInTheDocument();
		});
	});

	test("shows 'Event not found' if no event data is returned", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => null,
		});

		renderWithContext(null);

		await waitFor(() => {
			expect(screen.getByText(/Event not found/i)).toBeInTheDocument();
		});
	});

	test("calls toggleAuthModal when 'Join This Event' is clicked and user is not logged in", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				name: "Networking Mixer",
				description: "A night of connecting with local professionals.",
				start_date: "2024-12-25",
				end_date: "2024-12-27",
				venue_name: "Grand Hall",
				venue_location: "Downtown",
				organizer_name: "Frank Green",
			}),
		});

		renderWithContext(null);

		await waitFor(() => {
			expect(screen.getByText(/Networking Mixer/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText(/Join This Event/i));
		expect(mockToggleAuthModal).toHaveBeenCalledWith(true);
	});

	test("shows invitation success message when 'Join This Event' is clicked and user is logged in", async () => {
		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					name: "Networking Mixer",
					description: "A night of connecting with local professionals.",
					start_date: "2024-12-25",
					end_date: "2024-12-27",
					venue_name: "Grand Hall",
					venue_location: "Downtown",
					organizer_name: "Frank Green",
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Successfully invited yourself to the event!" }),
			});

		renderWithContext({ user_id: 1, name: "Test User" });

		await waitFor(() => {
			expect(screen.getByText(/Networking Mixer/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText(/Join This Event/i));

		await waitFor(() => {
			expect(screen.getByText(/Successfully invited yourself to the event!/i)).toBeInTheDocument();
		});
	});

	test("shows error message when invitation fails", async () => {
		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					name: "Networking Mixer",
					description: "A night of connecting with local professionals.",
					start_date: "2024-12-25",
					end_date: "2024-12-27",
					venue_name: "Grand Hall",
					venue_location: "Downtown",
					organizer_name: "Frank Green",
				}),
			})
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: "You cannot join this event." }),
			});

		renderWithContext({ user_id: 1, name: "Test User" });

		await waitFor(() => {
			expect(screen.getByText(/Networking Mixer/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText(/Join This Event/i));

		await waitFor(() => {
			expect(screen.getByText(/You cannot join this event./i)).toBeInTheDocument();
		});
	});
});

jest.spyOn(console, "warn").mockImplementation((message) => {
	if (message.includes("React Router Future Flag Warning")) {
		return; // Suppress specific warnings
	}
	console.warn(message); // Let other warnings pass through
});