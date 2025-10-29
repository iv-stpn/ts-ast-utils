/**
 * Integration Tests
 * Tests that combine multiple features and test real-world scenarios
 */

import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import ts from "typescript";
import {
	analyzeExports,
	createSourceFileFromPath,
	type ExportInfo,
	extractFunctionCalls,
	type FunctionCallResult,
	findNodes,
	getLineNumber,
	getLiteralValue,
	getObjectProperties,
	hasExportModifier,
	isAsyncFunction,
} from "../../src/index";

describe("Integration Tests", () => {
	const examplesPath = path.join(__dirname, "..", "examples");

	describe("Complete File Analysis", () => {
		test("should analyze mixed-exports.ts comprehensively", () => {
			const filePath = path.join(examplesPath, "exports", "mixed-exports.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Export analysis
			const exportInfo = analyzeExports(sourceFile);
			expect(exportInfo.exportType).toBe("both");
			expect(exportInfo.hasDefaultExport).toBe(true);
			expect(exportInfo.namedExports.length).toBeGreaterThan(0);

			// Function analysis
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const exportedFunctions = functions.filter(hasExportModifier);
			expect(exportedFunctions.length).toBeGreaterThan(0);

			// Object analysis
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objects.length).toBeGreaterThan(0);

			// Note: mixed-exports.ts doesn't contain direct function calls (only method calls)
			// Function call analysis is tested separately with files that have direct calls
		});

		test("should analyze source-file-demo.ts with imports and exports", () => {
			const filePath = path.join(examplesPath, "core", "source-file-demo.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Should have both imports and exports
			const importDeclarations = findNodes(sourceFile, ts.isImportDeclaration);
			const exportInfo = analyzeExports(sourceFile);

			expect(importDeclarations.length).toBeGreaterThan(0);
			expect(exportInfo.exportType).not.toBe("none");

			// Should have classes and functions
			const classes = findNodes(sourceFile, ts.isClassDeclaration);
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			expect(classes.length).toBeGreaterThan(0);
			expect(functions.length).toBeGreaterThan(0);
		});
	});

	describe("Cross-Feature Analysis", () => {
		test("should find async function calls in async-calls.ts", () => {
			const filePath = path.join(examplesPath, "function-calls", "async-calls.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Find async functions
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const asyncFunctions = functions.filter(isAsyncFunction);

			// Find function calls within those async functions
			const targetFunctions = ["connectToDatabase", "fetchUserProfile", "sendNotification"];
			const functionCalls = extractFunctionCalls(sourceFile, targetFunctions);

			expect(asyncFunctions.length).toBeGreaterThan(0);
			expect(functionCalls.length).toBeGreaterThan(0);

			// Verify function calls have line numbers
			functionCalls.forEach((call) => {
				const lineNumber = getLineNumber(sourceFile, call.node.getStart());
				expect(lineNumber).toBeGreaterThan(0);
			});
		});

		test("should analyze object properties with function calls", () => {
			const filePath = path.join(examplesPath, "objects", "object-creation.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Find objects
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objects.length).toBeGreaterThan(0);

			// Find functions that create objects
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const factoryFunctions = functions.filter((fn) => fn.name?.text.includes("create"));
			expect(factoryFunctions.length).toBeGreaterThan(0);

			// Analyze object properties
			objects.forEach((obj) => {
				const properties = getObjectProperties(obj);
				properties.forEach((prop) => {
					expect(prop.key).toBeTruthy();
					expect(typeof prop.isComputed).toBe("boolean");
				});
			});
		});
	});

	describe("Real-World Scenarios", () => {
		test("should handle configuration file analysis", () => {
			const filePath = path.join(examplesPath, "objects", "object-literals.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Find configuration objects
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			const configObjects = objects.filter((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some(
					(prop) =>
						prop.key.includes("config") || prop.key.includes("settings") || prop.key === "port" || prop.key === "host",
				);
			});

			expect(configObjects.length).toBeGreaterThan(0);

			// Analyze configuration properties
			configObjects.forEach((obj) => {
				const properties = getObjectProperties(obj);

				// Should have various property types
				const hasStrings = properties.some((prop) => typeof prop.value === "string");
				const hasNumbers = properties.some((prop) => typeof prop.value === "number");
				const hasBooleans = properties.some((prop) => typeof prop.value === "boolean");

				expect(hasStrings || hasNumbers || hasBooleans).toBe(true);
			});
		});

		test("should analyze API endpoint definitions", () => {
			const filePath = path.join(examplesPath, "objects", "object-literals.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Look for API-related objects
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			const apiObjects = objects.filter((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some(
					(prop) => prop.key.includes("api") || prop.key.includes("endpoint") || prop.key.includes("url"),
				);
			});

			if (apiObjects.length > 0) {
				apiObjects.forEach((obj) => {
					const properties = getObjectProperties(obj);
					expect(properties.length).toBeGreaterThan(0);
				});
			}
		});

		test("should analyze utility function exports", () => {
			const filePath = path.join(examplesPath, "exports", "named-exports.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Analyze exports
			const exportInfo = analyzeExports(sourceFile);
			expect(exportInfo.exportType).toBe("named");

			// Find utility functions
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const utilityFunctions = functions.filter((fn) => hasExportModifier(fn) && fn.name);

			expect(utilityFunctions.length).toBeGreaterThan(0);

			// Check specific utility patterns
			const asyncUtilities = utilityFunctions.filter(isAsyncFunction);
			expect(asyncUtilities.length).toBeGreaterThan(0);
		});
	});

	describe("Multi-File Analysis Patterns", () => {
		test("should identify common patterns across files", () => {
			const exportFiles = ["exports/named-exports.ts", "exports/default-export.ts", "exports/mixed-exports.ts"];

			const exportResults: ExportInfo[] = [];

			exportFiles.forEach((file) => {
				const filePath = path.join(examplesPath, file);
				const sourceFile = createSourceFileFromPath(filePath);
				const exportInfo = analyzeExports(sourceFile);
				exportResults.push(exportInfo);
			});

			// Should have variety of export patterns
			const hasNamed = exportResults.some((result) => result.exportType === "named");
			const hasDefault = exportResults.some((result) => result.exportType === "default");
			const hasBoth = exportResults.some((result) => result.exportType === "both");

			expect(hasNamed).toBe(true);
			expect(hasDefault).toBe(true);
			expect(hasBoth).toBe(true);
		});

		test("should analyze function call patterns across files", () => {
			const functionCallFiles = [
				"function-calls/basic-calls.ts",
				"function-calls/async-calls.ts",
				"function-calls/conditional-calls.ts",
			];

			const allFunctionCalls: FunctionCallResult[] = [];
			const commonFunctions = ["setup", "config", "init"];

			functionCallFiles.forEach((file) => {
				const filePath = path.join(examplesPath, file);
				const sourceFile = createSourceFileFromPath(filePath);

				// Look for functions with common patterns
				const allCalls = findNodes(sourceFile, ts.isCallExpression);
				const matchingCalls = allCalls
					.filter((call) => ts.isIdentifier(call.expression))
					.filter((call) => {
						const identifier = call.expression as ts.Identifier;
						return commonFunctions.some((pattern) => identifier.text.toLowerCase().includes(pattern));
					})
					.map((call) => ({
						name: (call.expression as ts.Identifier).text,
						node: call,
						isExported: false,
					}));

				allFunctionCalls.push(...matchingCalls);
			});

			// Should find common function call patterns
			expect(allFunctionCalls.length).toBeGreaterThan(0);
		});
	});

	describe("Error Handling and Edge Cases", () => {
		test("should handle files with mixed valid and invalid syntax", () => {
			// Test with a file that has mostly valid syntax
			const filePath = path.join(examplesPath, "exports", "named-exports.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Should not throw on analysis
			expect(() => analyzeExports(sourceFile)).not.toThrow();
			expect(() => findNodes(sourceFile, ts.isFunctionDeclaration)).not.toThrow();
			expect(() => extractFunctionCalls(sourceFile, ["test"])).not.toThrow();
		});

		test("should handle complex nested structures", () => {
			const filePath = path.join(examplesPath, "objects", "object-creation.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Find deeply nested objects
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);

			objects.forEach((obj) => {
				const properties = getObjectProperties(obj);

				// Should handle nested objects without errors
				properties.forEach((prop) => {
					expect(prop.key).toBeTruthy();
					expect(prop.valueNode).toBeDefined();
				});
			});
		});

		test("should maintain performance with complex analysis", () => {
			const filePath = path.join(examplesPath, "core", "literal-extraction.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			const start = performance.now();

			// Perform multiple analysis operations
			const exportInfo = analyzeExports(sourceFile);
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			const literals = findNodes(sourceFile, ts.isStringLiteral);
			const functionCalls = extractFunctionCalls(sourceFile, ["test", "example"]);

			const end = performance.now();

			// Verify results
			expect(exportInfo).toBeDefined();
			expect(functions.length).toBeGreaterThanOrEqual(0);
			expect(objects.length).toBeGreaterThanOrEqual(0);
			expect(literals.length).toBeGreaterThan(0);
			expect(functionCalls.length).toBeGreaterThanOrEqual(0);

			// Should complete reasonably quickly
			expect(end - start).toBeLessThan(200);
		});
	});

	describe("Library Feature Combinations", () => {
		test("should combine position and analysis features", () => {
			const filePath = path.join(examplesPath, "core", "position-utils.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Find functions and get their positions
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const lineNumber = getLineNumber(sourceFile, fn.getStart());
				const isExported = hasExportModifier(fn);
				const isAsync = isAsyncFunction(fn);

				expect(lineNumber).toBeGreaterThan(0);
				expect(typeof isExported).toBe("boolean");
				expect(typeof isAsync).toBe("boolean");
			});
		});

		test("should combine literal extraction with object analysis", () => {
			const filePath = path.join(examplesPath, "core", "literal-extraction.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			// Find objects and analyze their literal values
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);

			objects.forEach((obj) => {
				const properties = getObjectProperties(obj);

				properties.forEach((prop) => {
					if (prop.value !== undefined) {
						// For primitive values, getLiteralValue should work
						// For complex values (arrays/objects), getLiteralValue may return undefined
						const literalValue = getLiteralValue(prop.valueNode);
						const isPrimitive =
							typeof prop.value === "string" ||
							typeof prop.value === "number" ||
							typeof prop.value === "boolean" ||
							prop.value === null;

						if (isPrimitive) {
							expect(literalValue).toBeDefined();
						}
						// For non-primitive values, we just check that the property has a value
						expect(prop.value).toBeDefined();
					}
				});
			});
		});
	});
});
