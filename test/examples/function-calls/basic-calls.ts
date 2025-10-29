/**
 * Example file showcasing various function call patterns
 * This file demonstrates different types of function calls for analysis
 */

// Simple function calls
function setupApplication() {
	console.log("Setting up application...");
}

function configureDatabase(connectionString: string) {
	console.log(`Configuring database with: ${connectionString}`);
}

function initializeLogger(level: "debug" | "info" | "warn" | "error") {
	console.log(`Logger initialized with level: ${level}`);
}

// Function calls with different argument patterns
function processData(data: unknown[], options?: { async?: boolean; timeout?: number }) {
	console.log(`Processing ${data.length} items`);
	if (options?.async) {
		console.log("Using async processing");
	}
}

// Chained function calls
class ApiClient {
	private baseUrl: string = "";

	setBaseUrl(url: string): ApiClient {
		this.baseUrl = url;
		return this;
	}

	addHeader(key: string, value: string): ApiClient {
		console.log(`Adding header: ${key}=${value}`);
		return this;
	}

	build(): ApiClient {
		console.log(`API client built with base URL: ${this.baseUrl}`);
		return this;
	}
}

// Function calls in different contexts
export function startApplication(): void {
	// Basic function calls
	setupApplication();
	configureDatabase("postgresql://localhost:5432/mydb");
	initializeLogger("info");

	// Function calls with objects
	processData([1, 2, 3], { async: true, timeout: 5000 });

	// Chained method calls
	new ApiClient()
		.setBaseUrl("https://api.example.com")
		.addHeader("Authorization", "Bearer token")
		.addHeader("Content-Type", "application/json")
		.build();

	// Conditional function calls
	if (process.env.NODE_ENV === "development") {
		initializeLogger("debug");
	}

	// Function calls in async context
	setTimeout(() => {
		setupApplication();
	}, 1000);
}

// Export a function call directly
export default startApplication();
