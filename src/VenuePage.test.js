import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VenuePage from "./VenuePage";

describe("VenuePage", () => {
	let originalError;
	let originalWarn;

	beforeAll(() => {
		originalError = console.error;
		originalWarn = console.warn;
	});

	afterAll(() => {
		console.error = originalError;
		console.warn = originalWarn;
	});

	beforeEach(() => {
		global.fetch = jest.fn();

		console.error = jest.fn((message, ...args) => {
			if (typeof message === "string" && message.includes("Error fetching venues")) {
				return;
			}
			originalError(message, ...args);
		});

		console.warn = jest.fn((message, ...args) => {
			if (typeof message === "string" && message.includes("React Router Future Flag Warning")) {
				return;
			}
			originalWarn(message, ...args);
		});
	});

	afterEach(() => {
		global.fetch.mockRestore();
	});

	test("renders loading state initially", () => {
		render(
			<MemoryRouter>
				<VenuePage />
			</MemoryRouter>
		);
		expect(screen.getByText(/Loading venues.../i)).toBeInTheDocument();
	});

	test("renders list of venues when data is fetched", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: [
					{
						venue_id: 1,
						name: "Grand Hall",
						location: "Downtown",
						description: "An elegant venue for all occasions",
						capacity: 100,
						price: 500,
						thumbnail_image: "/images/venue1.jpg",
					},
					{
						venue_id: 2,
						name: "Rustic Barn",
						location: "Countryside",
						description: "A charming rural venue",
						capacity: 50,
						price: 200,
						thumbnail_image: "/images/venue2.jpg",
					},
				],
			}),
		});

		await act(async () => {
			render(
				<MemoryRouter>
					<VenuePage />
				</MemoryRouter>
			);
		});

		await waitFor(() => {
			expect(screen.getByText(/Grand Hall/i)).toBeInTheDocument();
			expect(screen.getByText(/Rustic Barn/i)).toBeInTheDocument();
		});

		expect(screen.getByText(/Downtown/i)).toBeInTheDocument();
		expect(screen.getByText(/Countryside/i)).toBeInTheDocument();
		expect(screen.getByText(/An elegant venue for all occasions/i)).toBeInTheDocument();
		expect(screen.getByText(/A charming rural venue/i)).toBeInTheDocument();
	});

	test("renders 'No venues available' when venue list is empty", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: [],
			}),
		});

		await act(async () => {
			render(
				<MemoryRouter>
					<VenuePage />
				</MemoryRouter>
			);
		});

		await waitFor(() => {
			expect(screen.getByText(/No venues available/i)).toBeInTheDocument();
		});
	});

	test("handles fetch failure gracefully", async () => {
		global.fetch.mockRejectedValueOnce(new Error("Failed to fetch"));

		await act(async () => {
			render(
				<MemoryRouter>
					<VenuePage />
				</MemoryRouter>
			);
		});

		await waitFor(() => {
			expect(screen.queryByText(/Loading venues.../i)).not.toBeInTheDocument();
		});

		expect(screen.getByText(/No venues available/i)).toBeInTheDocument();
	});
});