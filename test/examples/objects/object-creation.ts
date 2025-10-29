/**
 * Example file showcasing object creation and factory patterns
 * This file demonstrates various object creation patterns for analysis
 */

// Object factory functions
export function createUserConfig(userId: string, preferences: Record<string, unknown> = {}) {
	return {
		userId,
		createdAt: new Date().toISOString(),
		preferences: {
			theme: "light",
			language: "en",
			notifications: true,
			...preferences,
		},
		metadata: {
			version: "1.0",
			source: "factory",
		},
	};
}

// Class-based object creation
export class ConfigurationBuilder {
	private config: Record<string, unknown> = {};

	setProperty(key: string, value: unknown): ConfigurationBuilder {
		this.config[key] = value;
		return this;
	}

	setNestedProperty(path: string, value: unknown): ConfigurationBuilder {
		const keys = path.split(".");
		let current = this.config;

		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (!(key in current) || typeof current[key] !== "object") {
				current[key] = {};
			}
			current = current[key] as Record<string, unknown>;
		}

		current[keys[keys.length - 1]] = value;
		return this;
	}

	addToArray(key: string, value: unknown): ConfigurationBuilder {
		if (!(key in this.config)) {
			this.config[key] = [];
		}

		if (Array.isArray(this.config[key])) {
			(this.config[key] as unknown[]).push(value);
		}

		return this;
	}

	build(): Record<string, unknown> {
		return { ...this.config };
	}
}

// Object composition patterns
export function createApiConfiguration(baseConfig: Record<string, unknown>) {
	const defaultHeaders = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};

	const timeoutConfig = {
		connect: 5000,
		read: 10000,
		write: 5000,
	};

	const retryConfig = {
		attempts: 3,
		delay: 1000,
		backoff: "exponential" as const,
	};

	return {
		...baseConfig,
		headers: {
			...defaultHeaders,
			...((baseConfig.headers as Record<string, string>) || {}),
		},
		timeout: {
			...timeoutConfig,
			...((baseConfig.timeout as Record<string, number>) || {}),
		},
		retry: {
			...retryConfig,
			...((baseConfig.retry as Record<string, unknown>) || {}),
		},
		features: {
			caching: true,
			compression: true,
			metrics: false,
			...((baseConfig.features as Record<string, boolean>) || {}),
		},
	};
}

// Object with computed properties
export function createDynamicConfiguration(environment: string, features: string[]) {
	const timestamp = Date.now();
	const configId = `config_${timestamp}`;

	return {
		id: configId,
		environment,
		timestamp,
		features: features.reduce(
			(acc, feature) => {
				acc[feature] = {
					enabled: true,
					configuredAt: new Date().toISOString(),
				};
				return acc;
			},
			{} as Record<string, { enabled: boolean; configuredAt: string }>,
		),

		// Computed properties based on environment
		...(environment === "development" && {
			debug: true,
			logLevel: "debug",
			hotReload: true,
		}),

		...(environment === "production" && {
			debug: false,
			logLevel: "error",
			optimization: true,
			minify: true,
		}),

		// Conditional nested objects
		monitoring:
			environment === "production"
				? {
						enabled: true,
						service: "datadog",
						metrics: ["cpu", "memory", "requests"],
					}
				: {
						enabled: false,
						service: "console",
					},
	};
}

// Object with getters and complex property definitions
export function createSmartConfiguration() {
	const state = {
		_isInitialized: false,
		_values: {} as Record<string, unknown>,
		_watchers: [] as Array<(key: string, value: unknown) => void>,
	};

	return {
		get isInitialized() {
			return state._isInitialized;
		},

		set isInitialized(value: boolean) {
			state._isInitialized = value;
		},

		getValue(key: string) {
			return state._values[key];
		},

		setValue(key: string, value: unknown) {
			const oldValue = state._values[key];
			state._values[key] = value;

			// Notify watchers
			for (const watcher of state._watchers) {
				watcher(key, value);
			}

			return { oldValue, newValue: value };
		},

		addWatcher(callback: (key: string, value: unknown) => void) {
			state._watchers.push(callback);
		},

		getSnapshot() {
			return {
				initialized: state._isInitialized,
				values: { ...state._values },
				watcherCount: state._watchers.length,
			};
		},
	};
}
