module.exports = {
	testEnvironment: "jsdom", // Required for React testing
	transform: {
		"^.+\\.(js|jsx)$": "babel-jest", // Transpile JS and JSX files using Babel
	},
	moduleFileExtensions: ["js", "jsx"], // Recognize .js and .jsx extensions
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js", // Map CSS imports to the mock
	},
	setupFilesAfterEnv: ["@testing-library/jest-dom"],
};