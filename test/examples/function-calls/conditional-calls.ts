/**
 * Example file showcasing conditional and complex function calls
 * This file demonstrates various conditional patterns for function call analysis
 */

// Utility functions for conditional calls
function validateEnvironment(): boolean {
	return process.env.NODE_ENV !== undefined;
}

function isDevelopmentMode(): boolean {
	return process.env.NODE_ENV === "development";
}

function isProductionMode(): boolean {
	return process.env.NODE_ENV === "production";
}

function setupDevelopmentFeatures(): void {
	console.log("Setting up development features");
}

function setupProductionFeatures(): void {
	console.log("Setting up production features");
}

function enableDebugLogging(): void {
	console.log("Debug logging enabled");
}

function configureMetrics(): void {
	console.log("Metrics configured");
}

function startHealthCheck(): void {
	console.log("Health check started");
}

// Conditional function calls
export function initializeApplication(): void {
	// Basic conditional calls
	if (validateEnvironment()) {
		console.log("Environment validated");

		if (isDevelopmentMode()) {
			setupDevelopmentFeatures();
			enableDebugLogging();
		} else if (isProductionMode()) {
			setupProductionFeatures();
			configureMetrics();
			startHealthCheck();
		}
	}

	// Ternary conditional calls
	isDevelopmentMode() ? enableDebugLogging() : configureMetrics();

	// Logical AND conditional calls
	isProductionMode() && startHealthCheck();
	validateEnvironment() && console.log("Environment is valid");

	// Logical OR conditional calls
	isDevelopmentMode() || configureMetrics();

	// Switch-based conditional calls
	const mode = process.env.NODE_ENV;
	switch (mode) {
		case "development":
			setupDevelopmentFeatures();
			enableDebugLogging();
			break;
		case "production":
			setupProductionFeatures();
			configureMetrics();
			break;
		case "test":
			console.log("Test mode detected");
			break;
		default:
			console.log("Unknown environment mode");
	}
}

// Nested conditional calls
export function handleUserPermissions(userRole: string, hasPermission: boolean): void {
	if (userRole === "admin") {
		if (hasPermission) {
			configureMetrics();
			if (isDevelopmentMode()) {
				enableDebugLogging();
			}
		} else {
			console.log("Admin lacks permission");
		}
	} else if (userRole === "user") {
		hasPermission && console.log("User has basic permissions");
	}
}

// Function calls in try-catch blocks
export function safeInitialization(): void {
	try {
		validateEnvironment();
		setupProductionFeatures();
	} catch (error) {
		console.error("Initialization failed:", error);
		// Fallback function calls
		enableDebugLogging();
	} finally {
		// Cleanup function calls
		console.log("Initialization attempt completed");
	}
}
