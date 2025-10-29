/**
 * Example file showcasing default exports
 * This file demonstrates patterns for default export analysis
 */

import type { UserData } from "./named-exports";

// Default class export
export default class DatabaseManager {
	private connectionString: string;

	constructor(connectionString: string) {
		this.connectionString = connectionString;
	}

	async connect(): Promise<boolean> {
		// Simulated connection logic
		return await new Promise((resolve) => {
			setTimeout(() => resolve(true), 500);
		});
	}

	saveUser(user: UserData): void {
		// Simulated save operation
		console.log(`Saving user: ${user.name}`);
	}

	disconnect(): void {
		console.log("Database disconnected");
	}
}
