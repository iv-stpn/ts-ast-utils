/**
 * Export Analysis Tests
 * Tests the analyzeExports functionality with all export pattern examples
 */

import { beforeAll, describe, expect, test } from "bun:test";
import * as path from "node:path";
import ts from "typescript";
import { analyzeExports, createSourceFileFromPath, type ExportInfo } from "../../src/index";

describe("Export Analysis", () => {
	const examplesPath = path.join(__dirname, "..", "examples", "exports");

	describe("Named Exports", () => {
		let sourceFile: ts.SourceFile;
		let exportInfo: ExportInfo;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "named-exports.ts");
			sourceFile = createSourceFileFromPath(filePath);
			exportInfo = analyzeExports(sourceFile);
		});

		test("should identify export type as named", () => {
			expect(exportInfo.exportType).toBe("named");
		});

		test("should not have default export", () => {
			expect(exportInfo.hasDefaultExport).toBe(false);
		});

		test("should find all named exports", () => {
			const expectedExports = [
				"calculateSum",
				"UserManager",
				"API_VERSION",
				"MAX_RETRIES",
				"fetchUserData",
				"UserData",
				"ApiResponse",
				"sum", // renamed export
			];

			expect(exportInfo.namedExports).toEqual(expect.arrayContaining(expectedExports));
			expect(exportInfo.namedExports.length).toBeGreaterThanOrEqual(expectedExports.length);
		});

		test("should include function exports", () => {
			expect(exportInfo.namedExports).toContain("calculateSum");
			expect(exportInfo.namedExports).toContain("fetchUserData");
		});

		test("should include class exports", () => {
			expect(exportInfo.namedExports).toContain("UserManager");
		});

		test("should include variable exports", () => {
			expect(exportInfo.namedExports).toContain("API_VERSION");
			expect(exportInfo.namedExports).toContain("MAX_RETRIES");
		});

		test("should include type exports", () => {
			expect(exportInfo.namedExports).toContain("UserData");
			expect(exportInfo.namedExports).toContain("ApiResponse");
		});

		test("should include renamed exports", () => {
			expect(exportInfo.namedExports).toContain("sum");
		});
	});

	describe("Default Export", () => {
		let sourceFile: ts.SourceFile;
		let exportInfo: ExportInfo;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "default-export.ts");
			sourceFile = createSourceFileFromPath(filePath);
			exportInfo = analyzeExports(sourceFile);
		});

		test("should identify export type as default", () => {
			expect(exportInfo.exportType).toBe("default");
		});

		test("should have default export", () => {
			expect(exportInfo.hasDefaultExport).toBe(true);
		});

		test("should have no named exports", () => {
			expect(exportInfo.namedExports).toHaveLength(0);
		});
	});

	describe("Mixed Exports", () => {
		let sourceFile: ts.SourceFile;
		let exportInfo: ExportInfo;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "mixed-exports.ts");
			sourceFile = createSourceFileFromPath(filePath);
			exportInfo = analyzeExports(sourceFile);
		});

		test("should identify export type as both", () => {
			expect(exportInfo.exportType).toBe("both");
		});

		test("should have default export", () => {
			expect(exportInfo.hasDefaultExport).toBe(true);
		});

		test("should have named exports", () => {
			expect(exportInfo.namedExports.length).toBeGreaterThan(0);
		});

		test("should include expected named exports", () => {
			const expectedExports = ["CONFIG", "createConnection", "ConnectionPool"];

			expect(exportInfo.namedExports).toEqual(expect.arrayContaining(expectedExports));
		});

		test("should have both export types", () => {
			expect(exportInfo.hasDefaultExport).toBe(true);
			expect(exportInfo.namedExports.length).toBeGreaterThan(0);
		});
	});

	describe("No Exports", () => {
		let sourceFile: ts.SourceFile;
		let exportInfo: ExportInfo;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "no-exports.ts");
			sourceFile = createSourceFileFromPath(filePath);
			exportInfo = analyzeExports(sourceFile);
		});

		test("should identify export type as none", () => {
			expect(exportInfo.exportType).toBe("none");
		});

		test("should not have default export", () => {
			expect(exportInfo.hasDefaultExport).toBe(false);
		});

		test("should have no named exports", () => {
			expect(exportInfo.namedExports).toHaveLength(0);
		});
	});

	describe("Export Analysis Edge Cases", () => {
		test("should handle source file with syntax errors gracefully", () => {
			// Create a source file with syntax error
			const malformedContent = `
        export const incomplete = 
        export function
      `;

			const sourceFile = ts.createSourceFile("malformed.ts", malformedContent, ts.ScriptTarget.Latest, true);

			expect(() => analyzeExports(sourceFile)).not.toThrow();
		});

		test("should handle empty source file", () => {
			const emptyContent = "";
			const sourceFile = ts.createSourceFile("empty.ts", emptyContent, ts.ScriptTarget.Latest, true);

			const result = analyzeExports(sourceFile);
			expect(result.exportType).toBe("none");
			expect(result.hasDefaultExport).toBe(false);
			expect(result.namedExports).toHaveLength(0);
		});

		test("should handle source file with only imports", () => {
			const importsOnlyContent = `
        import * as fs from 'fs';
        import { readFile } from 'fs/promises';
      `;

			const sourceFile = ts.createSourceFile("imports-only.ts", importsOnlyContent, ts.ScriptTarget.Latest, true);

			const result = analyzeExports(sourceFile);
			expect(result.exportType).toBe("none");
		});
	});

	describe("Export Analysis Performance", () => {
		test("should analyze large file with many exports efficiently", () => {
			// Generate a large file with many exports
			const manyExports = Array.from({ length: 100 }, (_, i) => `export const var${i} = ${i};`).join("\n");

			const sourceFile = ts.createSourceFile("large.ts", manyExports, ts.ScriptTarget.Latest, true);

			const start = performance.now();
			const result = analyzeExports(sourceFile);
			const end = performance.now();

			expect(result.namedExports).toHaveLength(100);
			expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
		});
	});
});
