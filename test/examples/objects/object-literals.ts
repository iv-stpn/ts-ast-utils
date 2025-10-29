/**
 * Example file showcasing object literal patterns
 * This file demonstrates various object structures for object analysis
 */

// Simple object literals
export const appConfig = {
	name: "MyApplication",
	version: "1.0.0",
	debug: true,
	port: 3000,
	database: {
		host: "localhost",
		port: 5432,
		name: "myapp_db",
	},
};

// Configuration objects with different value types
export const serverSettings = {
	// String properties
	environment: "production",
	logLevel: "info",

	// Numeric properties
	maxConnections: 100,
	timeout: 5000,
	retryAttempts: 3,

	// Boolean properties
	enableCaching: true,
	useSSL: false,
	allowCrossOrigin: true,

	// Array properties
	allowedOrigins: ["https://example.com", "https://app.example.com"],
	supportedLanguages: ["en", "es", "fr"],

	// Nested object properties
	cache: {
		type: "redis",
		ttl: 3600,
		maxSize: 1000,
	},

	// Function properties
	onConnect: () => console.log("Connected"),
	onError: (error: Error) => console.error("Error:", error.message),
};

// Dynamic object with computed properties
const dynamicKey = "computed";
export const dynamicObject = {
	staticKey: "static value",
	[dynamicKey]: "dynamic value",
	[`${dynamicKey}_suffix`]: "dynamic with suffix",
	[Date.now()]: "timestamp key",
};

// Object with complex nested structures
export const complexConfig = {
	api: {
		v1: {
			baseUrl: "https://api.example.com/v1",
			endpoints: {
				users: "/users",
				posts: "/posts",
				comments: "/comments",
			},
			rateLimit: {
				requests: 1000,
				window: 3600,
				enabled: true,
			},
		},
		v2: {
			baseUrl: "https://api.example.com/v2",
			endpoints: {
				users: "/users",
				posts: "/posts",
			},
			features: {
				pagination: true,
				filtering: true,
				sorting: false,
			},
		},
	},
	authentication: {
		providers: ["local", "oauth", "saml"],
		local: {
			enabled: true,
			requireEmailVerification: true,
		},
		oauth: {
			enabled: false,
			providers: {
				google: {
					clientId: "google-client-id",
					enabled: true,
				},
				github: {
					clientId: "github-client-id",
					enabled: false,
				},
			},
		},
	},
};

// Object with methods and different property types
export const userManager = {
	users: [] as Array<{ id: string; name: string; email: string }>,
	maxUsers: 1000,

	addUser(name: string, email: string) {
		const user = {
			id: Math.random().toString(36),
			name,
			email,
		};
		this.users.push(user);
		return user;
	},

	findUser(id: string) {
		return this.users.find((user) => user.id === id);
	},

	removeUser(id: string) {
		const index = this.users.findIndex((user) => user.id === id);
		if (index > -1) {
			return this.users.splice(index, 1)[0];
		}
		return null;
	},

	get userCount() {
		return this.users.length;
	},

	get hasSpace() {
		return this.users.length < this.maxUsers;
	},
};
