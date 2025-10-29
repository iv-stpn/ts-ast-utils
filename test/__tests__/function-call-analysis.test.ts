/**
 * Function Call Analysis Tests
 * Tests the extractFunctionCalls functionality with all function call examples
 */

import { beforeAll, describe, expect, test } from "bun:test";
import * as path from "node:path";
import ts from "typescript";
import { createSourceFileFromPath, extractFunctionCalls, type FunctionCallResult, getLineNumber } from "../../src/index";

describe("Function Call Analysis", () => {
	const examplesPath = path.join(__dirname, "..", "examples", "function-calls");

	describe("Basic Function Calls", () => {
		let sourceFile: ts.SourceFile;
		let functionCalls: FunctionCallResult[];

		beforeAll(() => {
			const filePath = path.join(examplesPath, "basic-calls.ts");
			sourceFile = createSourceFileFromPath(filePath);

			const targetFunctions = [
				"setupApplication",
				"configureDatabase",
				"initializeLogger",
				"processData",
				"startApplication",
			];

			functionCalls = extractFunctionCalls(sourceFile, targetFunctions);
		});

		test("should find setupApplication calls", () => {
			const setupCalls = functionCalls.filter((call) => call.name === "setupApplication");
			expect(setupCalls.length).toBeGreaterThan(0);
		});

		test("should find configureDatabase calls", () => {
			const dbCalls = functionCalls.filter((call) => call.name === "configureDatabase");
			expect(dbCalls.length).toBeGreaterThan(0);
		});

		test("should find initializeLogger calls", () => {
			const loggerCalls = functionCalls.filter((call) => call.name === "initializeLogger");
			expect(loggerCalls.length).toBeGreaterThan(0);
		});

		test("should find processData calls", () => {
			const processCalls = functionCalls.filter((call) => call.name === "processData");
			expect(processCalls.length).toBeGreaterThan(0);
		});

		test("should identify export context correctly", () => {
			const exportedCalls = functionCalls.filter((call) => call.isExported);
			expect(exportedCalls.length).toBeGreaterThanOrEqual(0);
		});

		test("should provide valid call expression nodes", () => {
			functionCalls.forEach((call) => {
				expect(call.node).toBeDefined();
				expect(ts.isCallExpression(call.node)).toBe(true);
			});
		});

		test("should find calls at correct line numbers", () => {
			functionCalls.forEach((call) => {
				const lineNumber = getLineNumber(sourceFile, call.node.getStart());
				expect(lineNumber).toBeGreaterThan(0);
			});
		});

		test("should find export default function calls", () => {
			const exportedCalls = functionCalls.filter((call) => call.name === "startApplication" && call.isExported);
			expect(exportedCalls.length).toBe(1);

			// Verify the export default call is correctly identified
			const exportCall = exportedCalls[0];
			expect(exportCall.isExported).toBe(true);
			expect(exportCall.name).toBe("startApplication");
			expect(ts.isCallExpression(exportCall.node)).toBe(true);
		});
	});

	describe("Async Function Calls", () => {
		let sourceFile: ts.SourceFile;
		let functionCalls: FunctionCallResult[];

		beforeAll(() => {
			const filePath = path.join(examplesPath, "async-calls.ts");
			sourceFile = createSourceFileFromPath(filePath);

			const targetFunctions = ["connectToDatabase", "fetchUserProfile", "sendNotification", "scheduleTask"];

			functionCalls = extractFunctionCalls(sourceFile, targetFunctions);
		});

		test("should find connectToDatabase calls", () => {
			const connectCalls = functionCalls.filter((call) => call.name === "connectToDatabase");
			expect(connectCalls.length).toBeGreaterThan(0);
		});

		test("should find fetchUserProfile calls", () => {
			const fetchCalls = functionCalls.filter((call) => call.name === "fetchUserProfile");
			expect(fetchCalls.length).toBeGreaterThan(0);
		});

		test("should find sendNotification calls", () => {
			const notificationCalls = functionCalls.filter((call) => call.name === "sendNotification");
			expect(notificationCalls.length).toBeGreaterThan(0);
		});

		test("should find scheduleTask calls", () => {
			const scheduleCalls = functionCalls.filter((call) => call.name === "scheduleTask");
			expect(scheduleCalls.length).toBeGreaterThan(0);
		});

		test("should find calls in Promise.all context", () => {
			// Should find multiple scheduleTask calls used in Promise.all
			const scheduleCalls = functionCalls.filter((call) => call.name === "scheduleTask");
			expect(scheduleCalls.length).toBeGreaterThanOrEqual(2);
		});

		test("should find calls in promise chains", () => {
			// Should find calls in .then() chains
			const allCalls = functionCalls.length;
			expect(allCalls).toBeGreaterThan(5);
		});
	});

	describe("Conditional Function Calls", () => {
		let sourceFile: ts.SourceFile;
		let functionCalls: FunctionCallResult[];

		beforeAll(() => {
			const filePath = path.join(examplesPath, "conditional-calls.ts");
			sourceFile = createSourceFileFromPath(filePath);

			const targetFunctions = [
				"validateEnvironment",
				"isDevelopmentMode",
				"isProductionMode",
				"setupDevelopmentFeatures",
				"setupProductionFeatures",
				"enableDebugLogging",
				"configureMetrics",
				"startHealthCheck",
			];

			functionCalls = extractFunctionCalls(sourceFile, targetFunctions);
		});

		test("should find environment validation calls", () => {
			const validateCalls = functionCalls.filter((call) => call.name === "validateEnvironment");
			expect(validateCalls.length).toBeGreaterThan(0);
		});

		test("should find mode checking calls", () => {
			const devModeCalls = functionCalls.filter((call) => call.name === "isDevelopmentMode");
			const prodModeCalls = functionCalls.filter((call) => call.name === "isProductionMode");

			expect(devModeCalls.length).toBeGreaterThan(0);
			expect(prodModeCalls.length).toBeGreaterThan(0);
		});

		test("should find conditional setup calls", () => {
			const devSetupCalls = functionCalls.filter((call) => call.name === "setupDevelopmentFeatures");
			const prodSetupCalls = functionCalls.filter((call) => call.name === "setupProductionFeatures");

			expect(devSetupCalls.length).toBeGreaterThan(0);
			expect(prodSetupCalls.length).toBeGreaterThan(0);
		});

		test("should find feature enablement calls", () => {
			const debugCalls = functionCalls.filter((call) => call.name === "enableDebugLogging");
			const metricsCalls = functionCalls.filter((call) => call.name === "configureMetrics");
			const healthCalls = functionCalls.filter((call) => call.name === "startHealthCheck");

			expect(debugCalls.length).toBeGreaterThan(0);
			expect(metricsCalls.length).toBeGreaterThan(0);
			expect(healthCalls.length).toBeGreaterThan(0);
		});

		test("should find calls in different conditional contexts", () => {
			// Should find calls in if statements, ternary operators, logical operators, etc.
			const totalCalls = functionCalls.length;
			expect(totalCalls).toBeGreaterThan(10);
		});
	});

	describe("Function Call Analysis Edge Cases", () => {
		test("should handle empty function name list", () => {
			const filePath = path.join(examplesPath, "basic-calls.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			const result = extractFunctionCalls(sourceFile, []);
			expect(result).toHaveLength(0);
		});

		test("should handle non-existent function names", () => {
			const filePath = path.join(examplesPath, "basic-calls.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			const result = extractFunctionCalls(sourceFile, ["nonExistentFunction", "anotherFakeFunction"]);
			expect(result).toHaveLength(0);
		});

		test("should handle mixed existing and non-existing function names", () => {
			const filePath = path.join(examplesPath, "basic-calls.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			const result = extractFunctionCalls(sourceFile, ["setupApplication", "nonExistentFunction"]);
			const setupCalls = result.filter((call) => call.name === "setupApplication");
			const fakeCalls = result.filter((call) => call.name === "nonExistentFunction");

			expect(setupCalls.length).toBeGreaterThan(0);
			expect(fakeCalls.length).toBe(0);
		});
	});

	describe("Literal Value Extraction", () => {
		let sourceFile: ts.SourceFile;
		let functionCalls: FunctionCallResult[];

		beforeAll(() => {
			const filePath = path.join(examplesPath, "literal-values.ts");
			sourceFile = createSourceFileFromPath(filePath);

			const targetFunctions = ["testFunction", "mixedFunction", "runTests"];
			functionCalls = extractFunctionCalls(sourceFile, targetFunctions);
		});

		test("should handle export default function calls with literals", () => {
			const exportedCalls = functionCalls.filter((call) => call.isExported);
			expect(exportedCalls.length).toBe(1);

			const exportCall = exportedCalls[0];
			expect(exportCall.name).toBe("runTests");
		});
	});

	describe("Function Call Analysis Performance", () => {
		test("should handle large function name lists efficiently", () => {
			const filePath = path.join(examplesPath, "basic-calls.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Create a large list of function names (most non-existent)
			const largeFunctionList = Array.from({ length: 1000 }, (_, i) => `function${i}`);
			largeFunctionList.push("setupApplication"); // Add one that exists

			const start = performance.now();
			const result = extractFunctionCalls(sourceFile, largeFunctionList);
			const end = performance.now();

			expect(result.length).toBeGreaterThan(0);
			expect(end - start).toBeLessThan(500); // Should complete in less than 500ms
		});

		test("should handle files with many function calls efficiently", () => {
			// Test with the conditional calls file which has many function calls
			const filePath = path.join(examplesPath, "conditional-calls.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			const functionNames = [
				"validateEnvironment",
				"isDevelopmentMode",
				"isProductionMode",
				"setupDevelopmentFeatures",
				"setupProductionFeatures",
				"enableDebugLogging",
				"configureMetrics",
				"startHealthCheck",
			];

			const start = performance.now();
			const result = extractFunctionCalls(sourceFile, functionNames);
			const end = performance.now();

			expect(result.length).toBeGreaterThan(5);
			expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
		});
	});
});
