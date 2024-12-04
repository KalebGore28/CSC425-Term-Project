import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NavbarContext } from "./components/Navbar";
import ListVenue from "./ListVenue";

describe("ListVenue", () => {
	const mockToggleAuthModal = jest.fn();

	const renderWithNavbarContext = (contextValue) => {
		render(
			<NavbarContext.Provider value={contextValue}>
				<ListVenue />
			</NavbarContext.Provider>
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn(); // Mock the fetch API
	});

	afterEach(() => {
		global.fetch.mockRestore();
	});

	test("renders the form correctly", () => {
		renderWithNavbarContext({ currentUser: { id: 1 }, toggleAuthModal: mockToggleAuthModal });

		// Check form elements
		expect(screen.getByLabelText(/Venue Name:/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Description:/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Location:/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Capacity:/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Daily Rent Price/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Upload Pictures:/i)).toBeInTheDocument();
	});

	test("updates form values on input", () => {
		renderWithNavbarContext({ currentUser: { id: 1 }, toggleAuthModal: mockToggleAuthModal });

		const nameInput = screen.getByLabelText(/Venue Name:/i);
		fireEvent.change(nameInput, { target: { value: "Test Venue" } });
		expect(nameInput.value).toBe("Test Venue");

		const descriptionInput = screen.getByLabelText(/Description:/i);
		fireEvent.change(descriptionInput, { target: { value: "Test Description" } });
		expect(descriptionInput.value).toBe("Test Description");

		const locationInput = screen.getByLabelText(/Location:/i);
		fireEvent.change(locationInput, { target: { value: "Test Location" } });
		expect(locationInput.value).toBe("Test Location");

		const capacityInput = screen.getByLabelText(/Capacity:/i);
		fireEvent.change(capacityInput, { target: { value: "100" } });
		expect(capacityInput.value).toBe("100");

		const priceInput = screen.getByLabelText(/Daily Rent Price/i);
		fireEvent.change(priceInput, { target: { value: "500" } });
		expect(priceInput.value).toBe("500");
	});

	test("uploads images", () => {
		renderWithNavbarContext({ currentUser: { id: 1 }, toggleAuthModal: mockToggleAuthModal });

		const fileInput = screen.getByLabelText(/Upload Pictures:/i);
		const files = [new File(["image1"], "image1.jpg", { type: "image/jpeg" })];
		fireEvent.change(fileInput, { target: { files } });

		expect(fileInput.files).toHaveLength(1);
		expect(fileInput.files[0].name).toBe("image1.jpg");
	});

	test("shows error when user is not logged in", async () => {
		// Render the component with currentUser as null and a mocked toggleAuthModal
		renderWithNavbarContext({ currentUser: null, toggleAuthModal: mockToggleAuthModal });
	
		// Fill in the form inputs to simulate user interaction
		fireEvent.change(screen.getByLabelText(/Venue Name:/i), { target: { value: "Test Venue" } });
		fireEvent.change(screen.getByLabelText(/Description:/i), { target: { value: "Test Description" } });
		fireEvent.change(screen.getByLabelText(/Location:/i), { target: { value: "Test Location" } });
		fireEvent.change(screen.getByLabelText(/Capacity:/i), { target: { value: "100" } });
		fireEvent.change(screen.getByLabelText(/Daily Rent Price/i), { target: { value: "500" } });
	
		// Click the List Venue button
		const submitButton = screen.getByRole("button", { name: /List Venue/i });
		fireEvent.click(submitButton);
	
		// Wait for toggleAuthModal to be called
		await waitFor(() => {
			expect(mockToggleAuthModal).toHaveBeenCalledTimes(1);
		});
	
		// Optional Debugging: Log the mock calls
		console.log("Mock toggleAuthModal calls:", mockToggleAuthModal.mock.calls);
	});

	test("submits form and displays success message", async () => {
		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ venue_id: 1 }),
			})
			.mockResolvedValueOnce({ ok: true }); // Mock image upload response

		renderWithNavbarContext({ currentUser: { id: 1 }, toggleAuthModal: mockToggleAuthModal });

		// Fill out the form
		fireEvent.change(screen.getByLabelText(/Venue Name:/i), { target: { value: "Test Venue" } });
		fireEvent.change(screen.getByLabelText(/Description:/i), { target: { value: "Test Description" } });
		fireEvent.change(screen.getByLabelText(/Location:/i), { target: { value: "Test Location" } });
		fireEvent.change(screen.getByLabelText(/Capacity:/i), { target: { value: "100" } });
		fireEvent.change(screen.getByLabelText(/Daily Rent Price/i), { target: { value: "500" } });

		// Submit the form
		fireEvent.click(screen.getByRole("button", { name: /List Venue/i }));

		await waitFor(() => {
			expect(screen.getByText(/Venue listed successfully!/i)).toBeInTheDocument();
		});
	});

	test("displays error message on API failure", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: "Failed to list the venue." }),
		});

		renderWithNavbarContext({ currentUser: { id: 1 }, toggleAuthModal: mockToggleAuthModal });

		// Fill out the form
		fireEvent.change(screen.getByLabelText(/Venue Name:/i), { target: { value: "Test Venue" } });
		fireEvent.change(screen.getByLabelText(/Description:/i), { target: { value: "Test Description" } });
		fireEvent.change(screen.getByLabelText(/Location:/i), { target: { value: "Test Location" } });
		fireEvent.change(screen.getByLabelText(/Capacity:/i), { target: { value: "100" } });
		fireEvent.change(screen.getByLabelText(/Daily Rent Price/i), { target: { value: "500" } });

		// Submit the form
		fireEvent.click(screen.getByRole("button", { name: /List Venue/i }));

		await waitFor(() => {
			expect(screen.getByText(/Failed to list the venue./i)).toBeInTheDocument();
		});
	});
});