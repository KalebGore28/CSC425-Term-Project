const { validateDateRange, checkDateOverlap, validateFields, validateDateFormat } = require('./helpers.js');

const testValidateDateRange = () => {
	console.log("Running validateDateRange tests...");

	// Test cases
	const tests = [
		{
			description: "Valid date range",
			input: { start_date: "2024-12-01", end_date: "2024-12-10" },
			expected: { start: "2024-12-01", end: "2024-12-10" },
		},
		{
			description: "Start date in the past",
			input: { start_date: "2020-12-01", end_date: "2024-12-10" },
			error: "Start date cannot be in the past.",
		},
		{
			description: "Start date after end date",
			input: { start_date: "2024-12-15", end_date: "2024-12-10" },
			error: "Start date cannot be after the end date.",
		},
		{
			description: "Invalid date format",
			input: { start_date: "12/01/2024", end_date: "12/10/2024" },
			error: "Invalid date format. Dates must be in YYYY-MM-DD format.",
		},
		{
			description: "Start and end date are the same",
			input: { start_date: "2024-12-10", end_date: "2024-12-10" },
			expected: { start: "2024-12-10", end: "2024-12-10" },
		},
	];

	// Execute each test
	tests.forEach(({ description, input, expected, error }) => {
		try {
			const result = validateDateRange(input.start_date, input.end_date);
			if (expected) {
				const passed =
					JSON.stringify(result) === JSON.stringify(expected);
				console.log(
					`${description}: ${passed ? "PASS" : "FAIL"} - ${JSON.stringify(
						result
					)}`
				);
			} else {
				console.log(`${description}: FAIL - Expected an error but got ${JSON.stringify(result)}`);
			}
		} catch (err) {
			const passed = err.message === error;
			console.log(
				`${description}: ${passed ? "PASS" : "FAIL"} - ${err.message}`
			);
		}
	});
};

const testCheckDateOverlap = () => {
	console.log("Running checkDateOverlap tests...");

	// Test cases
	const tests = [
		{
			description: "No overlap",
			input: {
				start_date: "2024-12-01",
				end_date: "2024-12-05",
				dateRanges: [
					{ start_date: "2024-11-20", end_date: "2024-11-30" },
					{ start_date: "2024-12-06", end_date: "2024-12-10" },
				],
			},
			expected: true, // No overlap
		},
		{
			description: "Exact match with existing range",
			input: {
				start_date: "2024-12-01",
				end_date: "2024-12-05",
				dateRanges: [{ start_date: "2024-12-01", end_date: "2024-12-05" }],
			},
			error: "Date range overlaps with an existing range: 2024-12-01 to 2024-12-05",
		},
		{
			description: "Start date overlaps with existing range",
			input: {
				start_date: "2024-12-02",
				end_date: "2024-12-06",
				dateRanges: [{ start_date: "2024-12-01", end_date: "2024-12-05" }],
			},
			error: "Date range overlaps with an existing range: 2024-12-01 to 2024-12-05",
		},
		{
			description: "End date overlaps with existing range",
			input: {
				start_date: "2024-11-28",
				end_date: "2024-12-02",
				dateRanges: [{ start_date: "2024-12-01", end_date: "2024-12-05" }],
			},
			error: "Date range overlaps with an existing range: 2024-12-01 to 2024-12-05",
		},
		{
			description: "New range completely contains an existing range",
			input: {
				start_date: "2024-11-30",
				end_date: "2024-12-06",
				dateRanges: [{ start_date: "2024-12-01", end_date: "2024-12-05" }],
			},
			error: "Date range overlaps with an existing range: 2024-12-01 to 2024-12-05",
		},
		{
			description: "Invalid date format",
			input: {
				start_date: "12/01/2024",
				end_date: "12/05/2024",
				dateRanges: [{ start_date: "2024-12-01", end_date: "2024-12-05" }],
			},
			error: "Invalid date format. Dates must be in YYYY-MM-DD format.",
		},
	];

	// Execute each test
	tests.forEach(({ description, input, expected, error }) => {
		try {
			const { start_date, end_date, dateRanges } = input;
			const result = checkDateOverlap(start_date, end_date, dateRanges);

			if (expected) {
				const passed = result === expected;
				console.log(`${description}: ${passed ? "PASS" : "FAIL"} - ${result}`);
			} else {
				console.log(`${description}: FAIL - Expected an error but got ${result}`);
			}
		} catch (err) {
			const passed = err.message === error;
			console.log(`${description}: ${passed ? "PASS" : "FAIL"} - ${err.message}`);
		}
	});
};

const testValidateFields = () => {
	console.log("Running validateFields tests...");

	const tests = [
		{
			description: "All fields valid",
			input: {
				fields: { name: "John", age: 30, role: "admin" },
				rules: {
					name: { required: true, type: "string", minLength: 3 },
					age: { required: true, type: "number", min: 18 },
					role: { required: true, type: "string", enum: ["admin", "user", "guest"] },
				},
			},
			expected: "PASS",
		},
		{
			description: "Missing required field",
			input: {
				fields: { name: "John", age: 30 },
				rules: {
					name: { required: true, type: "string" },
					age: { required: true, type: "number" },
					role: { required: true, type: "string" },
				},
			},
			error: "role is required.",
		},
		{
			description: "Field type mismatch",
			input: {
				fields: { name: "John", age: "thirty", role: "admin" },
				rules: {
					name: { required: true, type: "string" },
					age: { required: true, type: "number" },
					role: { required: true, type: "string" },
				},
			},
			error: "age must be of type number.",
		},
		{
			description: "String too short",
			input: {
				fields: { name: "Jo", age: 30, role: "admin" },
				rules: {
					name: { required: true, type: "string", minLength: 3 },
					age: { required: true, type: "number" },
					role: { required: true, type: "string" },
				},
			},
			error: "name must be at least 3 characters long.",
		},
		{
			description: "Number below minimum",
			input: {
				fields: { name: "John", age: 15, role: "admin" },
				rules: {
					name: { required: true, type: "string" },
					age: { required: true, type: "number", min: 18 },
					role: { required: true, type: "string" },
				},
			},
			error: "age must be at least 18.",
		},
		{
			description: "Value not in enum",
			input: {
				fields: { name: "John", age: 30, role: "superadmin" },
				rules: {
					name: { required: true, type: "string" },
					age: { required: true, type: "number" },
					role: { required: true, type: "string", enum: ["admin", "user", "guest"] },
				},
			},
			error: "role must be one of the following: admin, user, guest.",
		},
		{
			description: "Field not required and missing",
			input: {
				fields: { name: "John", age: 30 },
				rules: {
					name: { required: true, type: "string" },
					age: { required: true, type: "number" },
					role: { required: false, type: "string" },
				},
			},
			expected: "PASS",
		},
	];

	// Execute each test
	tests.forEach(({ description, input, expected, error }) => {
		try {
			const { fields, rules } = input;
			validateFields(fields, rules);
			if (expected) {
				console.log(`${description}: PASS`);
			} else {
				console.log(`${description}: FAIL - Expected error but none was thrown`);
			}
		} catch (err) {
			const passed = err.message === error;
			console.log(`${description}: ${passed ? "PASS" : "FAIL"} - ${err.message}`);
		}
	});
};

const testValidateDateFormat = () => {
	console.log("Running validateDateFormat tests...");

	const tests = [
		{
			description: "Valid date in YYYY-MM-DD format",
			input: "2024-12-25",
			expected: "PASS",
		},
		{
			description: "Invalid date format (MM/DD/YYYY)",
			input: "12/25/2024",
			error: "Invalid date format. Use YYYY-MM-DD.",
		},
		{
			description: "Invalid date format (YYYY/MM/DD)",
			input: "2024/12/25",
			error: "Invalid date format. Use YYYY-MM-DD.",
		},
		{
			description: "Nonexistent date (Feb 30)",
			input: "2024-02-30",
			error: "Invalid date. Ensure the date exists and is correct.",
		},
		{
			description: "Invalid date format (random string)",
			input: "hello-world",
			error: "Invalid date format. Use YYYY-MM-DD.",
		},
		{
			description: "Valid leap year date",
			input: "2024-02-29",
			expected: "PASS",
		},
		{
			description: "Invalid leap year date",
			input: "2023-02-29",
			error: "Invalid date. Ensure the date exists and is correct.",
		},
		{
			description: "Date with invalid month (13th month)",
			input: "2024-13-01",
			error: "Invalid date. Ensure the date exists and is correct.",
		},
		{
			description: "Date with invalid day (0th day)",
			input: "2024-01-00",
			error: "Invalid date. Ensure the date exists and is correct.",
		},
	];

	// Execute each test
	tests.forEach(({ description, input, expected, error }) => {
		try {
			validateDateFormat(input);
			if (expected === "PASS") {
				console.log(`${description}: PASS`);
			} else {
				console.log(`${description}: FAIL - Expected an error but none was thrown`);
			}
		} catch (err) {
			const passed = err.message === error;
			console.log(`${description}: ${passed ? "PASS" : "FAIL"} - ${err.message}`);
		}
	});
};

// Run the tests
testValidateDateRange();
testCheckDateOverlap();
testValidateFields();
testValidateDateFormat();