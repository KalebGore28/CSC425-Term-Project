import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";

// Mock fetch API
global.fetch = jest.fn(() =>
	Promise.resolve({
		json: () => Promise.resolve({}), // Add mock data if needed
	})
);

describe("LandingPage", () => {
	test("renders the hero section with rotating images", async () => {
		await act(async () => {
			render(
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			);
		});

		expect(await screen.findByText("Plan The Perfect Event")).toBeInTheDocument();
		expect(
			await screen.findByText(
				"VenueFlow is your comprehensive resource to find the ideal venue for any occasion."
			)
		).toBeInTheDocument();

		const exploreButton = await screen.findByText("Explore Venues");
		expect(exploreButton).toBeInTheDocument();
		expect(exploreButton.closest("a")).toHaveAttribute("href", "/venues");
	});

	test("renders the How It Works section", async () => {
		await act(async () => {
			render(
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			);
		});

		expect(await screen.findByText("How VenueFlow Works")).toBeInTheDocument();
		expect(await screen.findByText("Step 1")).toBeInTheDocument();
		expect(await screen.findByText("Search by location and filter by amenities.")).toBeInTheDocument();
	});

	test("renders the footer", async () => {
		await act(async () => {
			render(
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			);
		});

		expect(await screen.findByText("© 2024 VenueFlow. All rights reserved.")).toBeInTheDocument();
	});
});

jest.spyOn(console, "warn").mockImplementation((message) => {
    if (message.includes("React Router Future Flag Warning")) {
        return; // Suppress specific warnings
    }
    console.warn(message); // Let other warnings pass through
});