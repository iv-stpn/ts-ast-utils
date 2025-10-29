/**
 * Example file with no exports
 * This file demonstrates internal utility functions without exports
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Internal helper functions (not exported)
function validateEmail(email: string): boolean {
	return emailRegex.test(email);
}

function generateId(): string {
	return Math.random().toString(36).substr(2, 9);
}

class InternalCache {
	private cache = new Map<string, unknown>();

	set(key: string, value: unknown): void {
		this.cache.set(key, value);
	}

	get(key: string): unknown {
		return this.cache.get(key);
	}

	clear(): void {
		this.cache.clear();
	}
}

// Internal constants
const _INTERNAL_CONFIG = {
	cacheSize: 100,
	debugMode: false,
};

// Internal instance
const globalCache = new InternalCache();

// These functions use the internal utilities but are not exported
function _processUserData(email: string, name: string) {
	if (!validateEmail(email)) {
		throw new Error("Invalid email format");
	}

	const userId = generateId();
	const userData = { id: userId, email, name };

	globalCache.set(userId, userData);

	return userData;
}

function _getUserFromCache(userId: string) {
	return globalCache.get(userId);
}
