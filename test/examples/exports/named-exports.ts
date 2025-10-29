/**
 * Example file showcasing different types of named exports
 * This file demonstrates various patterns that the export analysis can detect
 */

// Named function export
export function calculateSum(a: number, b: number): number {
	return a + b;
}

// Named class export
export class UserManager {
	private users: string[] = [];

	addUser(name: string): void {
		this.users.push(name);
	}

	getUsers(): string[] {
		return [...this.users];
	}
}

// Named variable exports
export const API_VERSION = "v1";
export const MAX_RETRIES = 3;

// Async function export
export async function fetchUserData(userId: string): Promise<UserData> {
	// Simulated async operation
	return await new Promise((resolve) => {
		setTimeout(() => resolve({ id: userId, name: "John Doe" }), 1000);
	});
}

// Type exports
export type UserData = {
	id: string;
	name: string;
	email?: string;
};

export interface ApiResponse<T> {
	data: T;
	success: boolean;
	message?: string;
}

// Named export with rename
export { calculateSum as sum };
