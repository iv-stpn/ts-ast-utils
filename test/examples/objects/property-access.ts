/**
 * Example file showcasing object property access patterns
 * This file demonstrates various ways to access and manipulate object properties
 */

import { appConfig, complexConfig, serverSettings } from "./object-literals";

// Object destructuring patterns
export function extractConfigValues() {
	// Basic destructuring
	const { name, version, debug } = appConfig;
	console.log(`App: ${name} v${version}, Debug: ${debug}`);

	// Nested destructuring
	const {
		database: { host, port, name: dbName },
		port: appPort,
	} = appConfig;
	console.log(`Database: ${dbName} at ${host}:${port}, App port: ${appPort}`);

	// Destructuring with defaults
	const { timeout = 1000, maxConnections = 50 } = serverSettings;
	const unknownProperty = "default value";
	console.log(`Timeout: ${timeout}, Max connections: ${maxConnections}, Unknown: ${unknownProperty}`);

	// Array destructuring from object properties
	const { allowedOrigins, supportedLanguages } = serverSettings;
	const [primaryOrigin, secondaryOrigin] = allowedOrigins;
	const [defaultLang, ...otherLangs] = supportedLanguages;

	return {
		primaryOrigin,
		secondaryOrigin,
		defaultLang,
		otherLangs,
	};
}

// Dynamic property access
export function accessDynamicProperties(obj: Record<string, unknown>, keys: string[]) {
	const results: Record<string, unknown> = {};

	// Bracket notation access
	for (const key of keys) {
		results[key] = obj[key];
	}

	// Using Object methods
	const allKeys = Object.keys(obj);
	const allValues = Object.values(obj);
	const allEntries = Object.entries(obj);

	return {
		results,
		meta: {
			totalKeys: allKeys.length,
			hasValues: allValues.length > 0,
			entries: allEntries.slice(0, 3), // First 3 entries
		},
	};
}

// Property checking and validation
export function validateObjectProperties(config: typeof serverSettings) {
	const checks = {
		hasEnvironment: "environment" in config,
		hasPort: "maxConnections" in config,
		hasCache: Boolean(config.cache),
		cacheType: config.cache?.type || "none",
		isProductionReady: config.environment === "production" && config.useSSL,
	};

	// Property existence checks
	const requiredProps = ["environment", "maxConnections", "timeout"];
	const missingProps = requiredProps.filter((prop) => !(prop in config));

	return {
		...checks,
		isValid: missingProps.length === 0,
		missingProperties: missingProps,
	};
}

// Object property manipulation
export function updateConfigurationObject() {
	// Clone and modify object
	const modifiedConfig = {
		...serverSettings,
		environment: "development",
		maxConnections: 200,
		cache: {
			...serverSettings.cache,
			maxSize: 2000,
			newProperty: "added",
		},
	};

	// Add computed properties
	const enhancedConfig = {
		...modifiedConfig,
		computed: {
			isHighLoad: modifiedConfig.maxConnections > 150,
			cacheRatio: modifiedConfig.cache.maxSize / modifiedConfig.maxConnections,
			configHash: JSON.stringify(modifiedConfig).length,
		},
	};

	return enhancedConfig;
}

// Complex nested object access
export function navigateComplexObject() {
	// Safe property access
	const v1BaseUrl = complexConfig.api?.v1?.baseUrl;
	const usersEndpoint = complexConfig.api?.v1?.endpoints?.users;
	const rateLimitEnabled = complexConfig.api?.v1?.rateLimit?.enabled;

	// Multiple level access
	const googleClientId = complexConfig.authentication?.oauth?.providers?.google?.clientId;
	const localAuthEnabled = complexConfig.authentication?.local?.enabled;

	// Property existence in nested objects
	const hasV2Sorting = "sorting" in (complexConfig.api?.v2?.features || {});
	const hasSamlAuth = complexConfig.authentication?.providers?.includes("saml");

	return {
		endpoints: {
			v1BaseUrl,
			usersEndpoint,
		},
		settings: {
			rateLimitEnabled,
			localAuthEnabled,
			googleClientId,
		},
		features: {
			hasV2Sorting,
			hasSamlAuth,
		},
	};
}
