const { parseISO, format, isBefore, isAfter, isEqual, isValid } = require("date-fns");
const { rules } = require("eslint-plugin-react-refresh");
const { verify } = require("jsonwebtoken");

// --- VALIDATOR FUNCTIONS ---
/**
 * Validates a date range and returns the formatted start and end dates.
 * 
 * @param {string} start_date - Start date of the range in YYYY-MM-DD format.
 * @param {string} end_date - End date of the range in YYYY-MM-DD format.
 * @throws Will throw an error if the date range is invalid.
 */
const validateDateRange = (start_date, end_date) => {
	const start = parseISO(start_date); // Ensure the date is parsed as a valid ISO date
	const end = parseISO(end_date);

	if (isNaN(start) || isNaN(end)) {
		throw new Error("Invalid date format. Dates must be in YYYY-MM-DD format.");
	}

	if (isBefore(start, new Date())) {
		throw new Error("Start date cannot be in the past.");
	}

	if (isAfter(start, end)) {
		throw new Error("Start date cannot be after the end date.");
	}
};

/**
 * Checks if a new date range overlaps with any existing date ranges.
 * 
 * @param {string} start_date - Start date of the new range in YYYY-MM-DD format.
 * @param {string} end_date - End date of the new range in YYYY-MM-DD format.
 * @param {Array} dateRanges - Array of existing date ranges, each with `start_date` and `end_date` in YYYY-MM-DD format.
 * @throws Will throw an error if the new date range overlaps with any existing range.
 */
const validateDateOverlap = (start_date, end_date, dateRanges) => {
	const newStart = parseISO(start_date);
	const newEnd = parseISO(end_date);

	if (isNaN(newStart) || isNaN(newEnd)) {
		throw new Error("Invalid date format. Dates must be in YYYY-MM-DD format.");
	}

	for (const range of dateRanges) {
		const existingStart = parseISO(range.start_date);
		const existingEnd = parseISO(range.end_date);

		if (
			// New range starts within an existing range
			(isAfter(newStart, existingStart) && isBefore(newStart, existingEnd)) ||
			isEqual(newStart, existingStart) ||
			isEqual(newStart, existingEnd) ||

			// New range ends within an existing range
			(isAfter(newEnd, existingStart) && isBefore(newEnd, existingEnd)) ||
			isEqual(newEnd, existingStart) ||
			isEqual(newEnd, existingEnd) ||

			// New range completely overlaps an existing range
			(isBefore(newStart, existingStart) && isAfter(newEnd, existingEnd))
		) {
			throw new Error(`Date range overlaps with an existing range: ${range.start_date} to ${range.end_date}`);
		}
	}
};

/**
 * Generic field validator.
 *
 * @param {Object} fields - An object containing the fields to validate.
 * @param {Object} rules - An object defining validation rules for each field.
 * @returns {boolean} - True if all fields are valid.
 * @throws Will throw an error if any field is missing, has the wrong type, or violates constraints.
 */
const validateFields = (fields, rules) => {
	for (const [fieldName, rule] of Object.entries(rules)) {
		const value = fields[fieldName];

		// Check if field is required and missing
		if (rule.required && (value === undefined || value === null || value === "")) {
			throw new Error(`${fieldName} is required.`);
		}

		// Skip further checks if the field is not required and not provided
		if (value === undefined || value === null) continue;

		// Check the field type
		if (rule.type && typeof value !== rule.type) {
			throw new Error(`${fieldName} must be of type ${rule.type}.`);
		}

		// Additional constraints
		if (rule.type === "number" && rule.min !== undefined && value < rule.min) {
			throw new Error(`${fieldName} must be at least ${rule.min}.`);
		}

		if (rule.type === "number" && rule.max !== undefined && value > rule.max) {
			throw new Error(`${fieldName} must not exceed ${rule.max}.`);
		}

		if (rule.type === "string" && rule.minLength !== undefined && value.length < rule.minLength) {
			throw new Error(`${fieldName} must be at least ${rule.minLength} characters long.`);
		}

		if (rule.type === "string" && rule.maxLength !== undefined && value.length > rule.maxLength) {
			throw new Error(`${fieldName} must not exceed ${rule.maxLength} characters.`);
		}

		if (rule.enum && !rule.enum.includes(value)) {
			throw new Error(`${fieldName} must be one of the following: ${rule.enum.join(", ")}.`);
		}
	}

	return true; // All fields are valid
};

/**
 * Validates a date format.
 * 
 * @param {string} date - Date in YYYY-MM-DD format.
 * @returns {boolean} - True if the date is valid.
 * @throws Will throw an error if the date format is invalid or the date is not valid.
 */
const validateDateFormat = (date) => {
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

	// Check the format using regex
	if (!dateRegex.test(date)) {
		throw new Error("Invalid date format. Use YYYY-MM-DD.");
	}

	// Check if the date is valid
	const parsedDate = parseISO(date);
	if (!isValid(parsedDate) || parsedDate.toISOString().slice(0, 10) !== date) {
		throw new Error("Invalid date. Ensure the date exists and is correct.");
	}

	return true; // Date is valid
};

module.exports = {
	validateDateRange,
	validateDateOverlap,
	validateFields,
	validateDateFormat,
};