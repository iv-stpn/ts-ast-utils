/**
 * Example file showcasing async function calls and promises
 * This file demonstrates async patterns for function call analysis
 */

// Async utility functions
async function connectToDatabase(): Promise<boolean> {
	console.log("Connecting to database...");
	return await new Promise((resolve) => setTimeout(() => resolve(true), 1000));
}

async function fetchUserProfile(userId: string): Promise<{ id: string; name: string }> {
	console.log(`Fetching profile for user: ${userId}`);
	return await new Promise((resolve) => setTimeout(() => resolve({ id: userId, name: "John Doe" }), 500));
}

async function sendNotification(message: string, userId: string): Promise<void> {
	console.log(`Sending notification to ${userId}: ${message}`);
	await new Promise((resolve) => setTimeout(resolve, 200));
}

function scheduleTask(taskName: string, delay: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			console.log(`Executing scheduled task: ${taskName}`);
			resolve();
		}, delay);
	});
}

// Promise-based function calls
export async function initializeUserSession(userId: string): Promise<void> {
	try {
		// Sequential async calls
		const dbConnected = await connectToDatabase();
		if (!dbConnected) {
			throw new Error("Database connection failed");
		}

		const userProfile = await fetchUserProfile(userId);
		console.log(`User profile loaded: ${userProfile.name}`);

		// Parallel async calls
		await Promise.all([
			sendNotification("Welcome back!", userId),
			scheduleTask("cleanup", 5000),
			scheduleTask("backup", 10000),
		]);

		// Promise chaining
		await scheduleTask("initialize", 1000)
			.then(() => scheduleTask("configure", 2000))
			.then(() => console.log("Initialization complete"));
	} catch (error) {
		console.error("Session initialization failed:", error);
		throw error;
	}
}

// Function calls with promises and callbacks
export function setupAsyncOperations(): void {
	// Promise-based calls
	connectToDatabase()
		.then((connected) => {
			if (connected) {
				return fetchUserProfile("user123");
			}
			throw new Error("Connection failed");
		})
		.then((profile) => {
			console.log("Profile fetched:", profile);
			return sendNotification("Setup complete", profile.id);
		})
		.catch((error) => {
			console.error("Setup failed:", error);
		});

	// Callback-style function calls
	setTimeout(() => {
		connectToDatabase().then((result) => {
			console.log("Delayed connection result:", result);
		});
	}, 2000);
}
