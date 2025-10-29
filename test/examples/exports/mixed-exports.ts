/**
 * Example file showcasing both named and default exports
 * This file demonstrates mixed export patterns
 */

import DatabaseManager from "./default-export";
import type { UserData } from "./named-exports";

// Named exports
export const CONFIG = {
	maxConnections: 10,
	timeout: 5000,
	retryAttempts: 3,
};

export function createConnection(_config: typeof CONFIG): DatabaseManager {
	return new DatabaseManager(`db://localhost:5432`);
}

export class ConnectionPool {
	private connections: DatabaseManager[] = [];
	private maxSize: number;

	constructor(maxSize: number = 5) {
		this.maxSize = maxSize;
	}

	getConnection(): DatabaseManager | null {
		if (this.connections.length > 0) {
			return this.connections.pop() || null;
		}
		return null;
	}

	releaseConnection(connection: DatabaseManager): void {
		if (this.connections.length < this.maxSize) {
			this.connections.push(connection);
		}
	}
}

// Default export - a factory function
export default function createUserService(poolSize: number = 3) {
	const pool = new ConnectionPool(poolSize);

	return {
		async createUser(userData: UserData): Promise<boolean> {
			const connection = pool.getConnection();
			if (!connection) {
				throw new Error("No database connection available");
			}

			try {
				await connection.connect();
				connection.saveUser(userData);
				return true;
			} finally {
				connection.disconnect();
				pool.releaseConnection(connection);
			}
		},

		getPoolSize: () => poolSize,
	};
}
