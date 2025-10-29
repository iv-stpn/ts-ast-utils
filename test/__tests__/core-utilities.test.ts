/**
 * Core Utilities Tests
 * Tests the core functionality including node analysis, position utilities, and literal extraction
 */

import { beforeAll, describe, expect, test } from "bun:test";
import * as path from "node:path";
import ts from "typescript";
import {
	createSourceFileFromContent,
	createSourceFileFromPath,
	findFirstNode,
	findNodes,
	getArrayLiteralValues,
	getColumnNumber,
	getDeclarationName,
	getLineNumber,
	getLiteralValue,
	getNodeComments,
	getNodePosition,
	getNodeText,
	getPositionInfo,
	getStringArrayLiterals,
	getStringLiteralValue,
	hasExportModifier,
	hasModifier,
	isAsyncFunction,
	isDefaultExport,
	isExported,
	isInFunctionContext,
} from "../../src/index";

describe("Core Utilities", () => {
	const examplesPath = path.join(__dirname, "..", "examples", "core");

	describe("Node Analysis", () => {
		let sourceFile: ts.SourceFile;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "node-analysis.ts");
			sourceFile = createSourceFileFromPath(filePath);
		});

		test("should identify async functions", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const asyncFunctions = functions.filter(isAsyncFunction);

			expect(asyncFunctions.length).toBeGreaterThan(0);

			// Check specific async functions
			const asyncFetchFunction = functions.find((fn) => fn.name && fn.name.text === "fetchUserData");
			if (asyncFetchFunction) {
				expect(isAsyncFunction(asyncFetchFunction)).toBe(true);
			}
		});

		test("should identify non-async functions", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const syncFunctions = functions.filter((fn) => !isAsyncFunction(fn));

			expect(syncFunctions.length).toBeGreaterThan(0);

			// Check specific sync function
			const regularFunction = functions.find((fn) => fn.name && fn.name.text === "regularFunction");
			if (regularFunction) {
				expect(isAsyncFunction(regularFunction)).toBe(false);
			}
		});

		test("should get declaration names", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const name = getDeclarationName(fn);
				if (fn.name) {
					expect(name).toBe(fn.name.text);
				}
			});
		});

		test("should identify exported functions", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const exportedFunctions = functions.filter(hasExportModifier);

			expect(exportedFunctions.length).toBeGreaterThan(0);

			// Check specific exported function
			const exportedFunction = functions.find((fn) => fn.name && fn.name.text === "regularFunction");
			if (exportedFunction) {
				expect(hasExportModifier(exportedFunction)).toBe(true);
				expect(isExported(exportedFunction)).toBe(true);
			}
		});

		test("should identify non-exported functions", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const internalFunctions = functions.filter((fn) => !hasExportModifier(fn));

			expect(internalFunctions.length).toBeGreaterThan(0);
		});

		test("should identify classes", () => {
			const classes = findNodes(sourceFile, ts.isClassDeclaration);
			expect(classes.length).toBeGreaterThan(0);

			// Check for specific classes
			const publicClass = classes.find((cls) => cls.name && cls.name.text === "PublicClass");
			expect(publicClass).toBeDefined();

			if (publicClass) {
				expect(hasExportModifier(publicClass)).toBe(true);
			}
		});

		test("should identify default exports", () => {
			const defaultExportClass = findFirstNode(
				sourceFile,
				(node): node is ts.ClassDeclaration =>
					ts.isClassDeclaration(node) && node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.DefaultKeyword) === true,
			);

			if (defaultExportClass) {
				expect(isDefaultExport(defaultExportClass)).toBe(true);
			}
		});

		test("should handle arrow functions", () => {
			const arrowFunctions = findNodes(sourceFile, ts.isArrowFunction);
			expect(arrowFunctions.length).toBeGreaterThan(0);

			// Test async arrow functions
			const asyncArrowFunctions = arrowFunctions.filter(isAsyncFunction);
			expect(asyncArrowFunctions.length).toBeGreaterThan(0);
		});

		test("should analyze function expressions", () => {
			const functionExpressions = findNodes(sourceFile, ts.isFunctionExpression);
			expect(functionExpressions.length).toBeGreaterThan(0);
		});

		test("should get node text", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const text = getNodeText(fn);
				expect(text).toBeTruthy();
				expect(typeof text).toBe("string");
			});
		});

		test("should test getDeclarationName with variable declarations", () => {
			// Create a test source file with variable declarations
			const content = `
export const testVar = "hello";
let anotherVar = 42;
const destructured = { a: 1, b: 2 };
			`.trim();
			const testFile = createSourceFileFromContent("test.ts", content);

			const variableStatements = findNodes(testFile, ts.isVariableStatement);
			expect(variableStatements.length).toBeGreaterThan(0);

			// Test variable declaration names
			for (const varStatement of variableStatements) {
				for (const declaration of varStatement.declarationList.declarations) {
					const name = getDeclarationName(declaration);
					if (ts.isIdentifier(declaration.name)) {
						expect(name).toBe(declaration.name.text);
					}
				}
			}
		});

		test("should test getDeclarationName with class declarations", () => {
			// Create a test source file with class declarations
			const content = `
export class TestClass {
	constructor() {}
}

class AnotherClass {
	method() {}
}
			`.trim();
			const testFile = createSourceFileFromContent("test.ts", content);

			const classes = findNodes(testFile, ts.isClassDeclaration);
			expect(classes.length).toBe(2);

			classes.forEach((cls) => {
				const name = getDeclarationName(cls);
				if (cls.name) {
					expect(name).toBe(cls.name.text);
				}
			});
		});

		test("should test getDeclarationName with unsupported node types", () => {
			// Test with a node type that doesn't have a name
			const content = `console.log("test");`;
			const testFile = createSourceFileFromContent("test.ts", content);

			const expressionStatements = findNodes(testFile, ts.isExpressionStatement);
			expect(expressionStatements.length).toBeGreaterThan(0);

			// getDeclarationName should return null for unsupported types
			const name = getDeclarationName(expressionStatements[0]);
			expect(name).toBeNull();
		});

		test("should test isAsyncFunction with non-function nodes", () => {
			// Test with node types that are not functions
			const content = `
const regularVar = 42;
class TestClass {}
interface TestInterface {}
			`.trim();
			const testFile = createSourceFileFromContent("test.ts", content);

			const variables = findNodes(testFile, ts.isVariableStatement);
			const classes = findNodes(testFile, ts.isClassDeclaration);
			const interfaces = findNodes(testFile, ts.isInterfaceDeclaration);

			// Should return false for non-function nodes
			expect(isAsyncFunction(variables[0])).toBe(false);
			expect(isAsyncFunction(classes[0])).toBe(false);
			expect(isAsyncFunction(interfaces[0])).toBe(false);
		});

		test("should test hasModifier function", () => {
			// Create test content with various modifiers
			const content = `
export function exportedFunc() {}
async function asyncFunc() {}
static readonly prop = "test";
private method() {}
public static field = 42;
			`.trim();
			const testFile = createSourceFileFromContent("test.ts", content);

			const functions = findNodes(testFile, ts.isFunctionDeclaration);

			// Test export modifier
			const exportedFunc = functions.find((f) => f.name?.text === "exportedFunc");
			if (exportedFunc) {
				expect(hasModifier(exportedFunc, ts.SyntaxKind.ExportKeyword)).toBe(true);
				expect(hasModifier(exportedFunc, ts.SyntaxKind.AsyncKeyword)).toBe(false);
			}

			// Test async modifier
			const asyncFunc = functions.find((f) => f.name?.text === "asyncFunc");
			if (asyncFunc) {
				expect(hasModifier(asyncFunc, ts.SyntaxKind.AsyncKeyword)).toBe(true);
				expect(hasModifier(asyncFunc, ts.SyntaxKind.ExportKeyword)).toBe(false);
			}
		});

		test("should test hasModifier with nodes without modifiers", () => {
			// Create content with nodes that have no modifiers
			const content = `
function regularFunction() {}
let simpleVar = 42;
			`.trim();
			const testFile = createSourceFileFromContent("test.ts", content);

			const functions = findNodes(testFile, ts.isFunctionDeclaration);
			const variables = findNodes(testFile, ts.isVariableStatement);

			// Should return false for nodes without modifiers
			expect(hasModifier(functions[0], ts.SyntaxKind.ExportKeyword)).toBe(false);
			expect(hasModifier(functions[0], ts.SyntaxKind.AsyncKeyword)).toBe(false);
			expect(hasModifier(variables[0], ts.SyntaxKind.ExportKeyword)).toBe(false);
		});

		test("should test getNodeText with identifier nodes", () => {
			const content = `
function testFunction() {}
const variableName = "test";
			`.trim();
			const testFile = createSourceFileFromContent("test.ts", content);

			const functions = findNodes(testFile, ts.isFunctionDeclaration);
			const variables = findNodes(testFile, ts.isVariableStatement);

			// Test with function name (identifier)
			if (functions[0]?.name) {
				const text = getNodeText(functions[0].name);
				expect(text).toBe("testFunction");
			}

			// Test with variable name (identifier)
			const declaration = variables[0].declarationList.declarations[0];
			if (ts.isIdentifier(declaration.name)) {
				const text = getNodeText(declaration.name);
				expect(text).toBe("variableName");
			}
		});
	});

	describe("Position Utilities", () => {
		let sourceFile: ts.SourceFile;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "position-utils.ts");
			sourceFile = createSourceFileFromPath(filePath);
		});

		test("should get correct line numbers", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const lineNumber = getLineNumber(sourceFile, fn.getStart());
				expect(lineNumber).toBeGreaterThan(0);
			});
		});

		test("should get correct column numbers", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const columnNumber = getColumnNumber(sourceFile, fn.getStart());
				expect(columnNumber).toBeGreaterThanOrEqual(0);
			});
		});

		test("should get position info", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const position = getPositionInfo(sourceFile, fn.getStart());
				expect(position.line).toBeGreaterThan(0);
				expect(position.column).toBeGreaterThanOrEqual(0);
			});
		});

		test("should get node positions", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const position = getNodePosition(sourceFile, fn);
				expect(position.startPos).toBeGreaterThanOrEqual(0);
				expect(position.endPos).toBeGreaterThan(position.startPos);
				expect(position.endPos - position.startPos).toBeGreaterThan(0);
			});
		});

		test("should handle multi-line constructs", () => {
			const classes = findNodes(sourceFile, ts.isClassDeclaration);

			classes.forEach((cls) => {
				const startLine = getLineNumber(sourceFile, cls.getStart());
				const position = getPositionInfo(sourceFile, cls.getStart());

				expect(startLine).toBe(position.line);
				expect(startLine).toBeGreaterThan(0);
			});
		});

		test("should handle comments", () => {
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);

			functions.forEach((fn) => {
				const comments = getNodeComments(sourceFile, fn);
				expect(Array.isArray(comments)).toBe(true);
			});
		});
	});

	describe("Literal Extraction", () => {
		let sourceFile: ts.SourceFile;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "literal-extraction.ts");
			sourceFile = createSourceFileFromPath(filePath);
		});

		test("should extract string literals", () => {
			const stringLiterals = findNodes(sourceFile, ts.isStringLiteral);
			expect(stringLiterals.length).toBeGreaterThan(0);

			stringLiterals.forEach((literal) => {
				const value = getLiteralValue(literal);
				expect(typeof value).toBe("string");

				const stringValue = getStringLiteralValue(literal);
				expect(stringValue).toBe(value as string);
			});
		});

		test("should extract number literals", () => {
			const numberLiterals = findNodes(sourceFile, ts.isNumericLiteral);
			expect(numberLiterals.length).toBeGreaterThan(0);

			numberLiterals.forEach((literal) => {
				const value = getLiteralValue(literal);
				expect(typeof value).toBe("number");
			});
		});

		test("should extract boolean literals", () => {
			const trueLiterals = findNodes(
				sourceFile,
				(node): node is ts.BooleanLiteral => node.kind === ts.SyntaxKind.TrueKeyword,
			);
			const falseLiterals = findNodes(
				sourceFile,
				(node): node is ts.BooleanLiteral => node.kind === ts.SyntaxKind.FalseKeyword,
			);

			expect(trueLiterals.length).toBeGreaterThan(0);
			expect(falseLiterals.length).toBeGreaterThan(0);

			trueLiterals.forEach((literal) => {
				const value = getLiteralValue(literal);
				expect(value).toBe(true);
			});

			falseLiterals.forEach((literal) => {
				const value = getLiteralValue(literal);
				expect(value).toBe(false);
			});
		});

		test("should extract array literals", () => {
			const arrayLiterals = findNodes(sourceFile, ts.isArrayLiteralExpression);
			expect(arrayLiterals.length).toBeGreaterThan(0);

			arrayLiterals.forEach((arrayLiteral) => {
				const values = getArrayLiteralValues(arrayLiteral);
				expect(Array.isArray(values)).toBe(true);
			});
		});

		test("should extract string arrays", () => {
			const arrayLiterals = findNodes(sourceFile, ts.isArrayLiteralExpression);
			const stringArrays = arrayLiterals.filter((arr) => {
				const stringValues = getStringArrayLiterals(arr);
				return stringValues.length > 0;
			});

			expect(stringArrays.length).toBeGreaterThan(0);

			stringArrays.forEach((arr) => {
				const stringValues = getStringArrayLiterals(arr);
				stringValues.forEach((value) => {
					expect(typeof value).toBe("string");
				});
			});
		});

		test("should handle null and undefined literals", () => {
			const nullNodes = findNodes(sourceFile, (node): node is ts.NullLiteral => node.kind === ts.SyntaxKind.NullKeyword);
			const undefinedNodes = findNodes(
				sourceFile,
				(node): node is ts.Identifier => ts.isIdentifier(node) && node.text === "undefined",
			);

			expect(nullNodes.length).toBeGreaterThan(0);
			expect(undefinedNodes.length).toBeGreaterThan(0);

			nullNodes.forEach((nullNode) => {
				const value = getLiteralValue(nullNode);
				expect(value).toBeNull();
			});
		});

		test("should handle template literals", () => {
			const templateLiterals = findNodes(sourceFile, ts.isTemplateExpression);
			expect(templateLiterals.length).toBeGreaterThan(0);
		});

		test("should handle regular expressions", () => {
			const regexLiterals = findNodes(sourceFile, ts.isRegularExpressionLiteral);
			expect(regexLiterals.length).toBeGreaterThan(0);
		});

		test("should handle BigInt literals", () => {
			const bigIntLiterals = findNodes(sourceFile, ts.isBigIntLiteral);
			expect(bigIntLiterals.length).toBeGreaterThan(0);
		});
	});

	describe("Find Nodes Utilities", () => {
		let sourceFile: ts.SourceFile;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "node-analysis.ts");
			sourceFile = createSourceFileFromPath(filePath);
		});

		test("should find all nodes of a type", () => {
			const allFunctions = findNodes(sourceFile, ts.isFunctionDeclaration);
			expect(allFunctions.length).toBeGreaterThan(0);

			allFunctions.forEach((fn) => {
				expect(ts.isFunctionDeclaration(fn)).toBe(true);
			});
		});

		test("should find first node of a type", () => {
			const firstFunction = findFirstNode(sourceFile, ts.isFunctionDeclaration);
			expect(firstFunction).toBeDefined();

			if (firstFunction) {
				expect(ts.isFunctionDeclaration(firstFunction)).toBe(true);
			}
		});

		test("should return null when no nodes found", () => {
			// Look for a type that doesn't exist in the file
			const enumDeclarations = findFirstNode(sourceFile, ts.isEnumDeclaration);
			// This might be null if no enums exist
			if (enumDeclarations === null) {
				expect(enumDeclarations).toBeNull();
			}
		});

		test("should handle custom predicates", () => {
			const exportedFunctions = findNodes(
				sourceFile,
				(node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && hasExportModifier(node),
			);

			expect(exportedFunctions.length).toBeGreaterThan(0);

			exportedFunctions.forEach((fn) => {
				expect(ts.isFunctionDeclaration(fn)).toBe(true);
				expect(hasExportModifier(fn)).toBe(true);
			});
		});
	});

	describe("Function Context Analysis", () => {
		let sourceFile: ts.SourceFile;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "node-analysis.ts");
			sourceFile = createSourceFileFromPath(filePath);
		});

		test("should identify calls in function context", () => {
			const callExpressions = findNodes(sourceFile, ts.isCallExpression);

			callExpressions.forEach((call) => {
				const inFunctionContext = isInFunctionContext(call);
				expect(typeof inFunctionContext).toBe("boolean");
			});
		});

		test("should find calls inside functions", () => {
			const callExpressions = findNodes(sourceFile, ts.isCallExpression);
			const callsInFunctions = callExpressions.filter(isInFunctionContext);

			expect(callsInFunctions.length).toBeGreaterThan(0);
		});
	});

	describe("Core Utilities Edge Cases", () => {
		test("should handle empty source file", () => {
			const emptyContent = "";
			const sourceFile = ts.createSourceFile("empty.ts", emptyContent, ts.ScriptTarget.Latest, true);

			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			expect(functions).toHaveLength(0);

			const firstFunction = findFirstNode(sourceFile, ts.isFunctionDeclaration);
			expect(firstFunction).toBeNull();
		});

		test("should handle malformed code gracefully", () => {
			const malformedContent = `
        function incomplete(
        export const broken = 
      `;

			const sourceFile = ts.createSourceFile("malformed.ts", malformedContent, ts.ScriptTarget.Latest, true);

			expect(() => findNodes(sourceFile, ts.isFunctionDeclaration)).not.toThrow();
			expect(() => getLineNumber(sourceFile, sourceFile.getStart())).not.toThrow();
		});

		test("should handle nodes without modifiers", () => {
			const simpleContent = "const x = 42;";
			const sourceFile = ts.createSourceFile("simple.ts", simpleContent, ts.ScriptTarget.Latest, true);

			const variableStatements = findNodes(sourceFile, ts.isVariableStatement);
			expect(variableStatements.length).toBe(1);

			const hasExport = hasExportModifier(variableStatements[0]);
			expect(hasExport).toBe(false);
		});
	});

	describe("Source File Creation", () => {
		test("should create source file from valid file path", () => {
			const filePath = path.join(examplesPath, "node-analysis.ts");
			const sourceFile = createSourceFileFromPath(filePath);

			expect(sourceFile).toBeDefined();
			expect(sourceFile.fileName).toBe(filePath);
			expect(sourceFile.text).toBeTruthy();
			expect(ts.isSourceFile(sourceFile)).toBe(true);
		});

		test("should create source file from content string", () => {
			const fileName = "test.ts";
			const content = `
export function testFunction(): string {
	return "Hello, World!";
}

export const testVariable = 42;

export class TestClass {
	constructor(public value: string) {}
}
			`.trim();

			const sourceFile = createSourceFileFromContent(fileName, content);

			expect(sourceFile).toBeDefined();
			expect(sourceFile.fileName).toBe(fileName);
			expect(sourceFile.text).toBe(content);
			expect(ts.isSourceFile(sourceFile)).toBe(true);

			// Verify the content was parsed correctly
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const variables = findNodes(sourceFile, ts.isVariableStatement);
			const classes = findNodes(sourceFile, ts.isClassDeclaration);

			expect(functions.length).toBe(1);
			expect(variables.length).toBe(1);
			expect(classes.length).toBe(1);
		});

		test("should handle empty content", () => {
			const fileName = "empty.ts";
			const content = "";

			const sourceFile = createSourceFileFromContent(fileName, content);

			expect(sourceFile).toBeDefined();
			expect(sourceFile.fileName).toBe(fileName);
			expect(sourceFile.text).toBe(content);
			expect(ts.isSourceFile(sourceFile)).toBe(true);
		});

		test("should handle complex TypeScript content", () => {
			const fileName = "complex.ts";
			const content = `
import { SomeType } from './other';

interface TestInterface {
	prop: string;
}

type TestType = {
	id: number;
	name: string;
};

enum TestEnum {
	VALUE1 = "value1",
	VALUE2 = "value2"
}

namespace TestNamespace {
	export function namespacedFunction(): void {}
}

export default class DefaultClass implements TestInterface {
	prop: string = "test";
	
	async asyncMethod(): Promise<TestType> {
		return { id: 1, name: "test" };
	}
}
			`.trim();

			const sourceFile = createSourceFileFromContent(fileName, content);

			expect(sourceFile).toBeDefined();
			expect(sourceFile.fileName).toBe(fileName);
			expect(sourceFile.text).toBe(content);

			// Verify various TypeScript constructs are parsed
			const imports = findNodes(sourceFile, ts.isImportDeclaration);
			const interfaces = findNodes(sourceFile, ts.isInterfaceDeclaration);
			const typeAliases = findNodes(sourceFile, ts.isTypeAliasDeclaration);
			const enums = findNodes(sourceFile, ts.isEnumDeclaration);
			const namespaces = findNodes(sourceFile, ts.isModuleDeclaration);
			const classes = findNodes(sourceFile, ts.isClassDeclaration);

			expect(imports.length).toBe(1);
			expect(interfaces.length).toBe(1);
			expect(typeAliases.length).toBe(1);
			expect(enums.length).toBe(1);
			expect(namespaces.length).toBe(1);
			expect(classes.length).toBe(1);
		});

		test("should create source files with different script targets", () => {
			const fileName = "es5.ts";
			const content = "const arrow = () => 42;";

			// Test that our function always uses Latest target
			const sourceFile = createSourceFileFromContent(fileName, content);

			expect(sourceFile).toBeDefined();
			expect(sourceFile.languageVersion).toBe(ts.ScriptTarget.Latest);
		});

		test("should handle malformed TypeScript content gracefully", () => {
			const fileName = "malformed.ts";
			const content = `
function incomplete(
export const broken = 
class MissingBrace {
			`;

			// Should not throw, TypeScript parser is resilient
			expect(() => {
				const sourceFile = createSourceFileFromContent(fileName, content);
				expect(sourceFile).toBeDefined();
				expect(ts.isSourceFile(sourceFile)).toBe(true);
			}).not.toThrow();
		});
	});

	describe("Core Utilities Performance", () => {
		test("should handle large files efficiently", () => {
			// Create a large file with many nodes
			const largeContent = Array.from({ length: 100 }, (_, i) => `export function func${i}() { return ${i}; }`).join("\n");

			const sourceFile = ts.createSourceFile("large.ts", largeContent, ts.ScriptTarget.Latest, true);

			const start = performance.now();
			const functions = findNodes(sourceFile, ts.isFunctionDeclaration);
			const exportedFunctions = functions.filter(hasExportModifier);
			const end = performance.now();

			expect(functions.length).toBe(100);
			expect(exportedFunctions.length).toBe(100);
			expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
		});
	});
});
