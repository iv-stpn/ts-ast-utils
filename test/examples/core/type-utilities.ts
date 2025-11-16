/**
 * Example demonstrating type utilities
 * Shows type serialization, inference, and analysis
 */

// Example: Type with various complex structures
export type UserProfile = {
	id: string;
	name: string;
	age: number;
	isActive: boolean;
	tags: string[];
	metadata: Record<string, unknown>;
	createdAt: Date;
};

// Example: Type alias resolution
export type Status = "active" | "inactive" | "pending";

// Example: Generic types
export type AsyncResult<T> = Promise<{ data: T; error: null } | { data: null; error: string }>;

// Example: Object literals with various types
export const config = {
	apiKey: "sk-12345",
	timeout: 5000,
	retryCount: 3,
	enabled: true,
	endpoints: ["api.example.com", "backup.example.com"],
	settings: {
		debug: false,
		verbose: true,
	},
	createdAt: new Date(),
};

// Example: Conditional and complex expressions
export const complexValue = Math.random() > 0.5 ? "success" : "failure";
const hello: string | number = "hello";
export const unionValue = hello || 42;
export const calculatedNumber = 10 + 20 * 2;
export const booleanCheck = 5 > 3;

// Example: Array with mixed types
export const mixedArray = [1, "two", true];
export const numberArray = [1, 2, 3, 4, 5];
export const stringArray = ["a", "b", "c"];

// Example: Template literals
export const template = `Hello, ${"world"}!`;

// Example: Object with shorthand properties
const userId = "user-123";
const userName = "John Doe";
export const shorthandObj = { userId, userName };

// Example: Method calls
export const uppercaseString = "hello".toUpperCase();
export const parsedNumber = Number.parseInt("42", 10);
export const randomValue = Math.random();

// Example: Spread operator
const baseConfig = { a: 1, b: 2 };
export const extendedConfig = { ...baseConfig, c: 3 };

// Example: Type with properties requiring quotes
export const specialKeys = {
	"my-property": "value",
	"another.property": 123,
	normalProperty: true,
};
