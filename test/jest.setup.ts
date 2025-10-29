// Bun test setup file for ts-ast-utils tests
import { expect } from "bun:test";

// Custom matchers for Bun
declare module "bun:test" {
	interface Matchers {
		toBeValidSourceFile(): void;
		toHaveExportType(expected: string): void;
		toContainFunctionCall(functionName: string): void;
	}
}

// Custom matchers implementation
expect.extend({
	toBeValidSourceFile(received) {
		const pass = received && typeof received === "object" && "kind" in received;
		if (pass) {
			return {
				message: () => `expected ${received} not to be a valid TypeScript source file`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to be a valid TypeScript source file`,
				pass: false,
			};
		}
	},

	toHaveExportType(received, expected) {
		const pass = received && received.exportType === expected;
		if (pass) {
			return {
				message: () => `expected export type not to be ${expected}`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected export type to be ${expected}, got ${received?.exportType}`,
				pass: false,
			};
		}
	},

	toContainFunctionCall(received, functionName) {
		const pass = Array.isArray(received) && received.some((call) => call.name === functionName);
		if (pass) {
			return {
				message: () => `expected function calls not to contain ${functionName}`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected function calls to contain ${functionName}`,
				pass: false,
			};
		}
	},
});
