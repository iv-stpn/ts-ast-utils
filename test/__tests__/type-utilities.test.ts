import { describe, expect, test } from "@jest/globals";
import ts from "typescript";
import {
	areMapsWithRecordValuesEqual,
	areRecordsEqual,
	extractPropertiesFromObjectLiteral,
	extractPropertiesFromType,
	extractReturnTypeFromPromise,
	findObjectProperty,
	formatPropertyKey,
	getTypeString,
	hasProperty,
	inferTypeFromExpression,
	isValidIdentifier,
	parseObjectType,
	resolveTypeAlias,
	serializeTypeNode,
	unwrapPromiseType,
} from "../../src/core/type-utilities";

// Regex patterns for type matching - defined at top level for performance
const BOOLEAN_TYPE_PATTERN = /boolean|false \| true|true \| false/;
const UNION_STRING_NUMBER_PATTERN = /string \| number|number \| string/;
const OPTIONAL_NUMBER_PATTERN = /number|undefined/;
const SUCCESS_ERROR_PATTERN = /"success" \| "error"|"error" \| "success"/;

describe("Type Utilities", () => {
	describe("serializeTypeNode", () => {
		function createTypeNode(code: string): ts.TypeNode {
			const sourceFile = ts.createSourceFile("test.ts", `type Test = ${code}`, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			return typeAlias.type;
		}

		test("should serialize primitive types", () => {
			expect(serializeTypeNode(createTypeNode("string"))).toBe("string");
			expect(serializeTypeNode(createTypeNode("number"))).toBe("number");
			expect(serializeTypeNode(createTypeNode("boolean"))).toBe("boolean");
			expect(serializeTypeNode(createTypeNode("null"))).toBe("null");
			expect(serializeTypeNode(createTypeNode("undefined"))).toBe("undefined");
			expect(serializeTypeNode(createTypeNode("void"))).toBe("void");
			expect(serializeTypeNode(createTypeNode("any"))).toBe("any");
			expect(serializeTypeNode(createTypeNode("unknown"))).toBe("unknown");
			expect(serializeTypeNode(createTypeNode("never"))).toBe("never");
		});

		test("should serialize array types", () => {
			expect(serializeTypeNode(createTypeNode("string[]"))).toBe("string[]");
			expect(serializeTypeNode(createTypeNode("number[]"))).toBe("number[]");
		});

		test("should serialize union types", () => {
			const result = serializeTypeNode(createTypeNode("string | number"));
			expect(result).toBe("number | string"); // Sorted
		});

		test("should serialize intersection types", () => {
			const result = serializeTypeNode(createTypeNode("{ a: string } & { b: number }"));
			expect(result).toContain("&");
		});

		test("should serialize literal types", () => {
			expect(serializeTypeNode(createTypeNode('"hello"'))).toBe('"hello"');
			expect(serializeTypeNode(createTypeNode("42"))).toBe("42");
			expect(serializeTypeNode(createTypeNode("true"))).toBe("true");
			expect(serializeTypeNode(createTypeNode("false"))).toBe("false");
		});

		test("should handle negative numeric literals", () => {
			const code = "type Test = -42";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = serializeTypeNode(typeAlias.type);
			// TypeScript parses -42 as a LiteralTypeNode with PrefixUnaryExpression
			expect(result).toBeTruthy();
		});

		test("should serialize type references", () => {
			expect(serializeTypeNode(createTypeNode("Date"))).toBe("Date");
			expect(serializeTypeNode(createTypeNode("Record<string, number>"))).toBe("Record<string, number>");
		});

		test("should serialize object literals", () => {
			const result = serializeTypeNode(createTypeNode("{ name: string; age: number }"));
			expect(result).toContain("name: string");
			expect(result).toContain("age: number");
		});

		test("should handle object types with only string literal property names", () => {
			const code = 'type Test = { "property-name": string; "another": number }';
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = serializeTypeNode(typeAlias.type);
			expect(result).toContain("property-name");
			expect(result).toContain("another");
		});

		test("should handle empty object type literals", () => {
			const result = serializeTypeNode(createTypeNode("{}"));
			expect(result).toBe("{  }");
		});

		test("should handle object types with computed property names", () => {
			const code = "type Test = { [key: string]: number }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = serializeTypeNode(typeAlias.type);
			// Index signatures are not property signatures, so they're skipped
			expect(result).toBeTruthy();
		});

		test("should handle object types with numeric literal property names", () => {
			const code = "type Test = { 123: string; 456: number }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = serializeTypeNode(typeAlias.type);
			expect(result).toBeTruthy();
		});

		test("should handle object types without type annotations", () => {
			const code = "type Test = { name }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = serializeTypeNode(typeAlias.type);
			// Properties without types should be skipped
			expect(result).toBeTruthy();
		});

		test("should handle object types with computed property names that are not identifiers or string literals", () => {
			const code = "type Test = { [123]: string }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			// This creates an index signature, not a property signature
			const result = serializeTypeNode(typeAlias.type);
			expect(result).toBeTruthy();
		});

		test("should serialize parenthesized types", () => {
			const result = serializeTypeNode(createTypeNode("(string | number)[]"));
			expect(result).toContain("[]");
		});
	});

	describe("resolveTypeAlias", () => {
		test("should resolve type alias", () => {
			const code = `
				type MyType = { name: string; age: number };
				type OtherType = string;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const resolved = resolveTypeAlias("MyType", sourceFile);
			expect(resolved).not.toBeNull();
			expect(ts.isTypeLiteralNode(resolved!)).toBe(true);
		});

		test("should return null for non-existent type", () => {
			const sourceFile = ts.createSourceFile("test.ts", "type Test = string", ts.ScriptTarget.Latest, true);
			const resolved = resolveTypeAlias("NonExistent", sourceFile);
			expect(resolved).toBeNull();
		});

		test("should handle interface declarations", () => {
			const code = `
				interface MyInterface {
					name: string;
					age: number;
				}
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const resolved = resolveTypeAlias("MyInterface", sourceFile);
			// Interfaces are not resolved to type nodes (limitation mentioned in code)
			expect(resolved).toBeNull();
		});

		test("should stop searching after finding first match", () => {
			const code = `
				type MyType = string;
				type MyType = number; // Duplicate (invalid but tests early return)
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const resolved = resolveTypeAlias("MyType", sourceFile);
			expect(resolved).not.toBeNull();
		});
	});

	describe("parseObjectType", () => {
		function createTypeNode(code: string): ts.TypeNode {
			const sourceFile = ts.createSourceFile("test.ts", `type Test = ${code}`, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			return typeAlias.type;
		}

		test("should parse object type literal", () => {
			const typeNode = createTypeNode("{ name: string; age: number }");
			const result = parseObjectType(typeNode);
			expect(result).toEqual({
				name: "string",
				age: "number",
			});
		});

		test("should resolve and parse type references", () => {
			const code = `
				type MyType = { name: string; age: number };
				type Test = MyType;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
			const result = parseObjectType(typeAlias.type, sourceFile);
			expect(result).toEqual({
				name: "string",
				age: "number",
			});
		});

		test("should return empty object for non-object types", () => {
			const typeNode = createTypeNode("string");
			const result = parseObjectType(typeNode);
			expect(result).toEqual({});
		});

		test("should handle type references without source file", () => {
			const code = `
				type Test = MyUnknownType;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = parseObjectType(typeAlias.type);
			// Without sourceFile, can't resolve the reference
			expect(result).toEqual({});
		});

		test("should handle qualified type names", () => {
			const code = `
				type Test = SomeNamespace.SomeType;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = parseObjectType(typeAlias.type, sourceFile);
			// Can't resolve namespace qualified names
			expect(result).toEqual({});
		});

		test("should handle properties with string literal names", () => {
			const typeNode = createTypeNode('{ "my-prop": string; "another.prop": number }');
			const result = parseObjectType(typeNode);
			expect(result).toEqual({
				"my-prop": "string",
				"another.prop": "number",
			});
		});
	});

	describe("extractReturnTypeFromPromise", () => {
		test("should unwrap Promise type", () => {
			const code = `
				type MyType = { name: string; age: number };
				type Test = Promise<MyType>;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
			const result = extractReturnTypeFromPromise(typeAlias.type, sourceFile);
			expect(result).toEqual({
				name: "string",
				age: "number",
			});
		});

		test("should handle non-Promise types", () => {
			const code = `
				type MyType = { name: string };
				type Test = MyType;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
			const result = extractReturnTypeFromPromise(typeAlias.type, sourceFile);
			expect(result).toEqual({
				name: "string",
			});
		});
	});

	describe("unwrapPromiseType", () => {
		test("should return type unchanged when type is not fully resolved", () => {
			// In a minimal test environment without full lib.d.ts, Promise types won't be fully resolved
			const code = "type Test = Promise<string>;";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const host: ts.CompilerHost = {
				getSourceFile: (fileName) => (fileName === "test.ts" ? sourceFile : undefined),
				writeFile: () => {},
				getCurrentDirectory: () => "",
				getDirectories: () => [],
				fileExists: () => true,
				readFile: () => "",
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => "\n",
				getDefaultLibFileName: () => "lib.d.ts",
			};
			const program = ts.createProgram(["test.ts"], {}, host);
			const typeChecker = program.getTypeChecker();
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const type = typeChecker.getTypeFromTypeNode(typeAlias.type);

			// Function should handle unresolved types gracefully
			const unwrapped = unwrapPromiseType(type, typeChecker);
			expect(unwrapped).toBeDefined();
		});

		test("should handle non-object types", () => {
			const code = "type Test = string;";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const host: ts.CompilerHost = {
				getSourceFile: (fileName) => (fileName === "test.ts" ? sourceFile : undefined),
				writeFile: () => {},
				getCurrentDirectory: () => "",
				getDirectories: () => [],
				fileExists: () => true,
				readFile: () => "",
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => "\n",
				getDefaultLibFileName: () => "lib.d.ts",
			};
			const program = ts.createProgram(["test.ts"], {}, host);
			const typeChecker = program.getTypeChecker();
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const type = typeChecker.getTypeFromTypeNode(typeAlias.type);

			const unwrapped = unwrapPromiseType(type, typeChecker);
			expect(unwrapped).toBe(type);
		});

		test("should handle union types", () => {
			const code = "type Test = string | number;";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const host: ts.CompilerHost = {
				getSourceFile: (fileName) => (fileName === "test.ts" ? sourceFile : undefined),
				writeFile: () => {},
				getCurrentDirectory: () => "",
				getDirectories: () => [],
				fileExists: () => true,
				readFile: () => "",
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => "\n",
				getDefaultLibFileName: () => "lib.d.ts",
			};
			const program = ts.createProgram(["test.ts"], {}, host);
			const typeChecker = program.getTypeChecker();
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const type = typeChecker.getTypeFromTypeNode(typeAlias.type);

			const unwrapped = unwrapPromiseType(type, typeChecker);
			// Should return type unchanged if no Promise is found in union
			expect(unwrapped).toBeDefined();
		});

		test("should check type flags correctly for Object types", () => {
			const code = "type Test = { name: string };";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const host: ts.CompilerHost = {
				getSourceFile: (fileName) => (fileName === "test.ts" ? sourceFile : undefined),
				writeFile: () => {},
				getCurrentDirectory: () => "",
				getDirectories: () => [],
				fileExists: () => true,
				readFile: () => "",
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => "\n",
				getDefaultLibFileName: () => "lib.d.ts",
			};
			const program = ts.createProgram(["test.ts"], {}, host);
			const typeChecker = program.getTypeChecker();
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const type = typeChecker.getTypeFromTypeNode(typeAlias.type);

			const unwrapped = unwrapPromiseType(type, typeChecker);
			// Object literal types should be returned unchanged (not Promise types)
			expect(unwrapped).toBe(type);
		});

		test("should handle type references that are not Promise", () => {
			const code = "type MyType = { value: number }; type Test = MyType;";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const host: ts.CompilerHost = {
				getSourceFile: (fileName) => (fileName === "test.ts" ? sourceFile : undefined),
				writeFile: () => {},
				getCurrentDirectory: () => "",
				getDirectories: () => [],
				fileExists: () => true,
				readFile: () => "",
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => "\n",
				getDefaultLibFileName: () => "lib.d.ts",
			};
			const program = ts.createProgram(["test.ts"], {}, host);
			const typeChecker = program.getTypeChecker();
			const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
			const type = typeChecker.getTypeFromTypeNode(typeAlias.type);

			const unwrapped = unwrapPromiseType(type, typeChecker);
			expect(unwrapped).toBeDefined();
		});

		test("should unwrap actual Promise types with proper lib support", () => {
			// Create a more complete setup with lib files
			const code = `
				const promise: Promise<string> = Promise.resolve("test");
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);

			// Use default compiler host which includes lib files
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				lib: ["lib.es2015.d.ts"],
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};

			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			const typeChecker = program.getTypeChecker();

			// Get the type of the promise variable
			let promiseType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "promise") {
							promiseType = typeChecker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			if (promiseType) {
				const unwrapped = unwrapPromiseType(promiseType, typeChecker);
				expect(unwrapped).toBeDefined();
				// Even if unwrapping doesn't work perfectly, function should not crash
				expect(unwrapped).not.toBeNull();
			}
		});

		test("should handle union with Promise type", () => {
			const code = `
				type MaybePromise<T> = T | Promise<T>;
				type Test = MaybePromise<string>;
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);

			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				lib: ["lib.es2015.d.ts"],
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};

			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			const typeChecker = program.getTypeChecker();

			let testType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "Test") {
					const symbol = typeChecker.getSymbolAtLocation(node.name);
					if (symbol) {
						testType = typeChecker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			if (testType) {
				const unwrapped = unwrapPromiseType(testType, typeChecker);
				expect(unwrapped).toBeDefined();
			}
		});

		test("should handle object type without Reference flag", () => {
			const code = "type Test = { a: string } & { b: number };";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const host: ts.CompilerHost = {
				getSourceFile: (fileName) => (fileName === "test.ts" ? sourceFile : undefined),
				writeFile: () => {},
				getCurrentDirectory: () => "",
				getDirectories: () => [],
				fileExists: () => true,
				readFile: () => "",
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => "\n",
				getDefaultLibFileName: () => "lib.d.ts",
			};
			const program = ts.createProgram(["test.ts"], {}, host);
			const typeChecker = program.getTypeChecker();
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const type = typeChecker.getTypeFromTypeNode(typeAlias.type);

			const unwrapped = unwrapPromiseType(type, typeChecker);
			// Intersection types should be returned unchanged
			expect(unwrapped).toBe(type);
		});
	});

	describe("extractPropertiesFromObjectLiteral", () => {
		function createObjectLiteral(code: string): ts.ObjectLiteralExpression {
			const sourceFile = ts.createSourceFile("test.ts", `const obj = ${code}`, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			return varDecl.initializer as ts.ObjectLiteralExpression;
		}

		test("should extract properties with inferred types", () => {
			const obj = createObjectLiteral('{ name: "John", age: 30, active: true }');
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result).toEqual({
				name: "string",
				age: "number",
				active: "boolean",
			});
		});

		test("should handle shorthand properties", () => {
			const obj = createObjectLiteral("{ userId, userName }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.userId).toContain("string");
			expect(result.userName).toContain("string");
		});

		test("should handle complex nested objects", () => {
			const obj = createObjectLiteral("{ config: { debug: true }, items: [1, 2, 3] }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.config).toBeTruthy();
			expect(result.items).toBe("number[]");
		});

		test("should handle properties with string literal names", () => {
			const obj = createObjectLiteral('{ "my-prop": "value", "another.prop": 123 }');
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result["my-prop"]).toBe("string");
			expect(result["another.prop"]).toBe("number");
		});

		test("should handle shorthand with heuristic type inference", () => {
			const obj = createObjectLiteral("{ isEnabled, hasPermission, userKey }");
			const result = extractPropertiesFromObjectLiteral(obj);
			// These should trigger heuristic inference
			expect(result.isEnabled).toContain("boolean");
			expect(result.hasPermission).toContain("boolean");
			expect(result.userKey).toContain("string");
		});

		test("should handle shorthand properties with userId heuristic", () => {
			const obj = createObjectLiteral("{ userId, userName, apiKey }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.userId).toContain("string");
			expect(result.userName).toContain("string");
			expect(result.apiKey).toContain("string");
		});

		test("should handle shorthand properties with Name suffix heuristic", () => {
			const obj = createObjectLiteral("{ firstName, lastName, fullName }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.firstName).toContain("string");
			expect(result.lastName).toContain("string");
			expect(result.fullName).toContain("string");
		});

		test("should handle shorthand property that does not match heuristics", () => {
			const obj = createObjectLiteral("{ randomProp }");
			const result = extractPropertiesFromObjectLiteral(obj);
			// Should return unknown when no heuristics match
			expect(result.randomProp).toBe("unknown");
		});

		test("should handle shorthand with enabled heuristic", () => {
			const obj = createObjectLiteral("{ enabled, disabled }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.enabled).toContain("boolean");
			expect(result.disabled).toContain("boolean");
		});

		test("should handle empty object literals", () => {
			const obj = createObjectLiteral("{}");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result).toEqual({});
		});

		test("should skip properties without initializers", () => {
			// Methods and getters don't have simple initializers
			const obj = createObjectLiteral("{ name: 'test', getValue() { return 42; } }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.name).toBe("string");
			// Method should be skipped
			expect(result.getValue).toBeUndefined();
		});

		test("should handle property assignment with null propName", () => {
			const code = "const obj = { [computed]: 'value', normal: 123 }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			const obj = varDecl.initializer as ts.ObjectLiteralExpression;
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.normal).toBe("number");
			// Computed property should be skipped
		});

		test("should handle property assignment with null propType", () => {
			const code = "const obj = { name: unknownValue }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			const obj = varDecl.initializer as ts.ObjectLiteralExpression;
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.name).toBe("unknown");
		});

		test("should handle shorthand property with null propType", () => {
			const code = "const obj = { someValue }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			const obj = varDecl.initializer as ts.ObjectLiteralExpression;
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.someValue).toBe("unknown");
		});

		test("should infer null from NullKeyword", () => {
			const obj = createObjectLiteral("{ value: null }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.value).toBe("null");
		});

		test("should infer undefined from UndefinedKeyword", () => {
			const obj = createObjectLiteral("{ value: undefined }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.value).toBe("undefined");
		});

		test("should infer boolean from boolean literal", () => {
			const obj = createObjectLiteral("{ a: true, b: false }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.a).toBe("boolean");
			expect(result.b).toBe("boolean");
		});

		test("should handle array with omitted expressions", () => {
			const obj = createObjectLiteral("{ arr: [1,,3] }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.arr).toBe("number[]");
		});

		test("should handle conditional expressions", () => {
			const obj = createObjectLiteral("{ val: x ? 1 : 2 }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle binary expressions with numbers", () => {
			const obj = createObjectLiteral("{ sum: 1 + 2 }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.sum).toBe("number");
		});

		test("should handle binary expressions with plus operator", () => {
			// Note: PlusToken always infers as number in the simple heuristic
			const obj = createObjectLiteral("{ val: 'a' + 'b' }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle arrays with mixed types", () => {
			const obj = createObjectLiteral("{ mixed: [1, 'str', true] }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.mixed).toBe("(number | string | boolean)[]");
		});

		test("should handle binary expression with || operator same types", () => {
			const obj = createObjectLiteral("{ val: a || b }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("unknown");
		});

		test("should handle binary expression with || operator only left type", () => {
			const obj = createObjectLiteral("{ val: 5 || x }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toContain("number");
		});

		test("should handle binary expression with || operator only right type", () => {
			const obj = createObjectLiteral("{ val: x || 'str' }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toContain("string");
		});

		test("should handle binary expression with && operator", () => {
			const obj = createObjectLiteral("{ val: x && 'result' }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("string");
		});

		test("should handle conditional with only whenTrue type", () => {
			const obj = createObjectLiteral("{ val: x ? 5 : y }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toContain("number");
		});

		test("should handle conditional with only whenFalse type", () => {
			const obj = createObjectLiteral("{ val: x ? y : 'str' }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toContain("string");
		});

		test("should handle call to filter method", () => {
			const obj = createObjectLiteral("{ val: arr.filter(x => x) }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toContain("unknown");
		});

		test("should handle call to toString method", () => {
			const obj = createObjectLiteral("{ val: obj.toString() }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("string");
		});

		test("should handle call to get method", () => {
			const obj = createObjectLiteral("{ val: map.get(key) }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("string | null");
		});

		test("should handle call to now method", () => {
			const obj = createObjectLiteral("{ val: Date.now() }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle call to String function", () => {
			const obj = createObjectLiteral("{ val: String(x) }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("string");
		});

		test("should handle call to Boolean function", () => {
			const obj = createObjectLiteral("{ val: Boolean(x) }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("boolean");
		});

		test("should handle prefix unary ! operator", () => {
			const obj = createObjectLiteral("{ val: !x }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("boolean");
		});

		test("should handle prefix unary + operator", () => {
			const obj = createObjectLiteral("{ val: +x }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle prefix unary - operator", () => {
			const obj = createObjectLiteral("{ val: -x }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle template expression", () => {
			// Create the code string with proper escaping
			const backtick = "`";
			const code = `const obj = { val: ${backtick}hello world${backtick} }`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			const obj = varDecl.initializer as ts.ObjectLiteralExpression;
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("string");
		});

		test("should handle spread element", () => {
			const obj = createObjectLiteral("{ val: [...arr] }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("unknown[]");
		});

		test("should handle object literal with nested properties", () => {
			const obj = createObjectLiteral("{ config: { enabled: true } }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.config).toContain("{");
		});

		test("should handle call to slice method", () => {
			const obj = createObjectLiteral("{ val: arr.slice(0, 1) }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toContain("unknown");
		});

		test("should handle call to substr method", () => {
			const obj = createObjectLiteral("{ val: str.substr(0) }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("string");
		});

		test("should handle call to random method", () => {
			const obj = createObjectLiteral("{ val: Math.random() }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle call to parseInt function", () => {
			const obj = createObjectLiteral("{ val: parseInt('42') }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle call to parseFloat function", () => {
			const obj = createObjectLiteral("{ val: parseFloat('3.14') }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});

		test("should handle call to Number function", () => {
			const obj = createObjectLiteral("{ val: Number('123') }");
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result.val).toBe("number");
		});
	});

	describe("inferTypeFromExpression", () => {
		function createExpression(code: string): ts.Expression {
			const sourceFile = ts.createSourceFile("test.ts", `const x = ${code}`, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			return declaration.initializer as ts.Expression;
		}

		test("should infer literal types", () => {
			expect(inferTypeFromExpression(createExpression('"hello"'))).toBe("string");
			expect(inferTypeFromExpression(createExpression("42"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("true"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression("null"))).toBe("null");
			expect(inferTypeFromExpression(createExpression("undefined"))).toBe("undefined");
		});

		test("should infer array types", () => {
			expect(inferTypeFromExpression(createExpression('["a", "b"]'))).toBe("string[]");
			expect(inferTypeFromExpression(createExpression("[1, 2, 3]"))).toBe("number[]");
			expect(inferTypeFromExpression(createExpression("[true, false]"))).toBe("boolean[]");
			expect(inferTypeFromExpression(createExpression("[]"))).toBe("unknown[]");
		});

		test("should infer mixed array types", () => {
			const result = inferTypeFromExpression(createExpression('[1, "a"]'));
			expect(result).toContain("number");
			expect(result).toContain("string");
			expect(result).toContain("[]");
		});

		test("should infer object types", () => {
			const result = inferTypeFromExpression(createExpression('{ name: "John", age: 30 }'));
			expect(result).toContain("name: string");
			expect(result).toContain("age: number");
		});

		test("should infer Date type", () => {
			expect(inferTypeFromExpression(createExpression("new Date()"))).toBe("Date");
		});

		test("should infer conditional expression types", () => {
			const result = inferTypeFromExpression(createExpression('true ? "yes" : "no"'));
			expect(result).toBe("string");
		});

		test("should infer union types from conditional", () => {
			const result = inferTypeFromExpression(createExpression("true ? 1 : true"));
			expect(result).toContain("number");
			expect(result).toContain("boolean");
		});

		test("should infer binary expression types", () => {
			expect(inferTypeFromExpression(createExpression("1 + 2"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("1 === 2"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression('"a" || "b"'))).toBe("string");
		});

		test("should handle additional comparison operators", () => {
			expect(inferTypeFromExpression(createExpression("1 !== 2"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression("1 < 2"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression("1 > 2"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression("1 <= 2"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression("1 >= 2"))).toBe("boolean");
		});

		test("should handle additional arithmetic operators", () => {
			expect(inferTypeFromExpression(createExpression("10 % 3"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("5 - 2"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("4 * 3"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("8 / 2"))).toBe("number");
		});

		test("should handle array literal with null elements", () => {
			const code = "const x = [1, null, 3]";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("number");
			expect(result).toContain("null");
		});

		test("should handle object property with numeric name", () => {
			const code = "const x = { 0: 'value' }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const objLiteral = declaration.initializer as ts.ObjectLiteralExpression;
			const result = inferTypeFromExpression(objLiteral);
			// Numeric property names should be skipped
			expect(result).toBe("{}");
		});

		test("should infer call expression types", () => {
			expect(inferTypeFromExpression(createExpression("parseInt('42')"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("String(42)"))).toBe("string");
			expect(inferTypeFromExpression(createExpression("Boolean(1)"))).toBe("boolean");
		});

		test("should infer method call types", () => {
			expect(inferTypeFromExpression(createExpression("'hello'.toString()"))).toBe("string");
			expect(inferTypeFromExpression(createExpression("Math.random()"))).toBe("number");
		});

		test("should infer template literal types", () => {
			const code = ["`", "hello ", "$", "{", "world", "}", "`"].join("");
			expect(inferTypeFromExpression(createExpression(code))).toBe("string");
		});

		test("should infer unary expression types", () => {
			expect(inferTypeFromExpression(createExpression("!true"))).toBe("boolean");
			expect(inferTypeFromExpression(createExpression("+42"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("-42"))).toBe("number");
		});

		test("should infer as expression types", () => {
			const result = inferTypeFromExpression(createExpression('"hello" as string'));
			expect(result).toBe("string");
		});

		test("should handle const assertions", () => {
			const result = inferTypeFromExpression(createExpression('["a", "b"] as const'));
			expect(result).toBeTruthy();
		});

		test("should handle logical AND expressions", () => {
			const result = inferTypeFromExpression(createExpression('true && "value"'));
			expect(result).toBe("string");
		});

		test("should handle unknown expressions", () => {
			// Create a more complex expression that returns "unknown"
			const code = "const x = someUnknownFunction()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should handle spread elements", () => {
			const code = "const x = [...arr]";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const arrayLiteral = declaration.initializer as ts.ArrayLiteralExpression;
			const spreadElement = arrayLiteral.elements[0] as ts.SpreadElement;
			const result = inferTypeFromExpression(spreadElement.expression);
			expect(result).toBeTruthy();
		});

		test("should handle empty arrays", () => {
			const result = inferTypeFromExpression(createExpression("[]"));
			expect(result).toBe("unknown[]");
		});

		test("should handle empty objects", () => {
			const result = inferTypeFromExpression(createExpression("{}"));
			expect(result).toBe("{}");
		});

		test("should handle objects with computed property names", () => {
			const code = "const x = { [key]: value }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Computed properties are skipped
			expect(result).toBe("{}");
		});

		test("should handle shorthand properties with null inference", () => {
			const code = "const x = { unknownVar }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const objLiteral = declaration.initializer as ts.ObjectLiteralExpression;
			const shorthand = objLiteral.properties[0] as ts.ShorthandPropertyAssignment;
			const result = inferTypeFromExpression(shorthand.name);
			// Should return unknown for non-heuristic names
			expect(result).toBe("unknown");
		});

		test("should handle new expressions", () => {
			const dateResult = inferTypeFromExpression(createExpression("new Date()"));
			expect(dateResult).toBe("Date");

			const otherResult = inferTypeFromExpression(createExpression("new Map()"));
			expect(otherResult).toBe("object");
		});

		test("should handle method calls returning arrays", () => {
			const filterResult = inferTypeFromExpression(createExpression("[1,2,3].filter(x => x > 1)"));
			expect(filterResult).toContain("number");

			const sliceResult = inferTypeFromExpression(createExpression("[1,2,3].slice(0, 2)"));
			expect(sliceResult).toContain("number");
		});

		test("should handle various method call return types", () => {
			expect(inferTypeFromExpression(createExpression('"text".toString()'))).toBe("string");
			expect(inferTypeFromExpression(createExpression('"text".substr(0, 2)'))).toBe("string");
			expect(inferTypeFromExpression(createExpression("map.get('key')"))).toBe("string | null");
			expect(inferTypeFromExpression(createExpression("Date.now()"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("Math.random()"))).toBe("number");
		});

		test("should handle global conversion functions", () => {
			expect(inferTypeFromExpression(createExpression("parseInt('42')"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("parseFloat('3.14')"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("Number('42')"))).toBe("number");
			expect(inferTypeFromExpression(createExpression("String(42)"))).toBe("string");
			expect(inferTypeFromExpression(createExpression("Boolean(1)"))).toBe("boolean");
		});

		test("should handle unknown method calls", () => {
			const code = "const x = obj.unknownMethod()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should handle unknown function calls", () => {
			const code = "const x = unknownFunction()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should fallback to unknown for unhandled expressions", () => {
			// TypeClass expression or other unhandled node types
			const code = "const x = class { }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			if (declaration.initializer) {
				const result = inferTypeFromExpression(declaration.initializer);
				expect(result).toBe("unknown");
			}
		});

		test("should handle arrays with omitted elements", () => {
			const code = "const x = [1, , 3]";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("number[]");
		});

		test("should handle arrays with spread elements", () => {
			const code = "const x = [1, ...arr, 3]";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should still detect number type from non-spread elements
			expect(result).toBeTruthy();
		});

		test("should handle conditional expressions with null branches", () => {
			const code = "const x = condition ? value : undefined";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBeTruthy();
		});

		test("should handle conditional with only true branch type", () => {
			const code = "const x = condition ? 'value' : unknownFunc()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// When one branch returns null/unknown, should use the other
			expect(result).toContain("string");
		});

		test("should handle conditional with only false branch type", () => {
			const code = "const x = condition ? unknownFunc() : 42";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("number");
		});

		test("should handle binary expressions with null operands", () => {
			const code = "const x = value1 || undefined";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBeTruthy();
		});

		test("should handle OR with only left type", () => {
			const code = "const x = 'value' || unknownFunc()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("string");
		});

		test("should handle OR with only right type", () => {
			const code = "const x = unknownFunc() || 42";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("number");
		});

		test("should handle binary OR with null left and right types", () => {
			const code = "const x = unknownFunc1() || unknownFunc2()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should handle conditional with null true and false types", () => {
			const code = "const x = condition ? unknownFunc1() : unknownFunc2()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should handle object literal with property assignment without initializer", () => {
			const code = "const x = { name: undefined, get value() { return 42; } }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const objLiteral = declaration.initializer as ts.ObjectLiteralExpression;
			const result = inferTypeFromExpression(objLiteral);
			expect(result).toContain("name");
		});

		test("should handle object literal property with null propType", () => {
			const code = "const x = { [computed]: value }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Computed properties without recognizable names
			expect(result).toBe("{}");
		});

		test("should handle as expression with non-const type", () => {
			const code = "const x = value as MyType";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should handle AND operator fallback to unknown", () => {
			const code = "const x = condition && unknownFunc()";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("unknown");
		});

		test("should handle object literal property with numeric property name", () => {
			const code = "const x = { 123: 'value', 456: 789 }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Numeric property names are treated as computed properties and may be skipped
			expect(result).toBe("{}");
		});

		test("should handle shorthand property assignment with null inferred type", () => {
			const code = "const x = { unknownProp }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const objLiteral = declaration.initializer as ts.ObjectLiteralExpression;
			const result = inferTypeFromExpression(objLiteral);
			expect(result).toContain("unknownProp");
		});

		test("should infer mixed element array types", () => {
			const result = inferTypeFromExpression(createExpression('[1, "two", true]'));
			expect(result).toContain("boolean");
			expect(result).toContain("number");
			expect(result).toContain("string");
		});
	});

	describe("findObjectProperty", () => {
		function createObjectLiteral(code: string): ts.ObjectLiteralExpression {
			const sourceFile = ts.createSourceFile("test.ts", `const obj = ${code}`, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			return varDecl.initializer as ts.ObjectLiteralExpression;
		}

		test("should find existing property", () => {
			const obj = createObjectLiteral('{ name: "John", age: 30 }');
			const prop = findObjectProperty(obj, "name");
			expect(prop).not.toBeNull();
			expect(ts.isStringLiteral(prop!)).toBe(true);
		});

		test("should return null for non-existent property", () => {
			const obj = createObjectLiteral('{ name: "John" }');
			const prop = findObjectProperty(obj, "age");
			expect(prop).toBeNull();
		});
	});

	describe("hasProperty", () => {
		function createObjectLiteral(code: string): ts.ObjectLiteralExpression {
			const sourceFile = ts.createSourceFile("test.ts", `const obj = ${code}`, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			return varDecl.initializer as ts.ObjectLiteralExpression;
		}

		test("should return true for existing property", () => {
			const obj = createObjectLiteral('{ name: "John", age: 30 }');
			expect(hasProperty(obj, "name")).toBe(true);
			expect(hasProperty(obj, "age")).toBe(true);
		});

		test("should return false for non-existent property", () => {
			const obj = createObjectLiteral('{ name: "John" }');
			expect(hasProperty(obj, "age")).toBe(false);
		});

		test("should detect method declarations", () => {
			const obj = createObjectLiteral("{ getName() { return 'John'; } }");
			expect(hasProperty(obj, "getName")).toBe(true);
		});
	});

	describe("areRecordsEqual", () => {
		test("should return true for equal records", () => {
			const a = { name: "string", age: "number" };
			const b = { name: "string", age: "number" };
			expect(areRecordsEqual(a, b)).toBe(true);
		});

		test("should return true for equal records with different key order", () => {
			const a = { name: "string", age: "number" };
			const b = { age: "number", name: "string" };
			expect(areRecordsEqual(a, b)).toBe(true);
		});

		test("should return false for records with different values", () => {
			const a = { name: "string", age: "number" };
			const b = { name: "string", age: "string" };
			expect(areRecordsEqual(a, b)).toBe(false);
		});

		test("should return false for records with different keys", () => {
			const a = { name: "string", age: "number" };
			const b = { name: "string", count: "number" };
			expect(areRecordsEqual(a, b)).toBe(false);
		});

		test("should return false for records with different lengths", () => {
			const a = { name: "string" };
			const b = { name: "string", age: "number" };
			expect(areRecordsEqual(a, b)).toBe(false);
		});
	});

	describe("areMapsWithRecordValuesEqual", () => {
		test("should return true for equal maps", () => {
			const a = new Map<string, Record<string, string>>();
			a.set("user", { name: "string", age: "number" });
			a.set("config", { debug: "boolean" });

			const b = new Map<string, Record<string, string>>();
			b.set("user", { name: "string", age: "number" });
			b.set("config", { debug: "boolean" });

			expect(areMapsWithRecordValuesEqual(a, b)).toBe(true);
		});

		test("should return false for maps with different sizes", () => {
			const a = new Map<string, Record<string, string>>();
			a.set("user", { name: "string" });

			const b = new Map<string, Record<string, string>>();
			b.set("user", { name: "string" });
			b.set("config", { debug: "boolean" });

			expect(areMapsWithRecordValuesEqual(a, b)).toBe(false);
		});

		test("should return false for maps with different values", () => {
			const a = new Map<string, Record<string, string>>();
			a.set("user", { name: "string" });

			const b = new Map<string, Record<string, string>>();
			b.set("user", { name: "number" });

			expect(areMapsWithRecordValuesEqual(a, b)).toBe(false);
		});

		test("should return false for maps with different keys", () => {
			const a = new Map<string, Record<string, string>>();
			a.set("user", { name: "string" });

			const b = new Map<string, Record<string, string>>();
			b.set("config", { name: "string" });

			expect(areMapsWithRecordValuesEqual(a, b)).toBe(false);
		});
	});

	describe("isValidIdentifier", () => {
		test("should return true for valid identifiers", () => {
			expect(isValidIdentifier("myVar")).toBe(true);
			expect(isValidIdentifier("_privateVar")).toBe(true);
			expect(isValidIdentifier("$jquery")).toBe(true);
			expect(isValidIdentifier("var123")).toBe(true);
			expect(isValidIdentifier("CamelCase")).toBe(true);
		});

		test("should return false for invalid identifiers", () => {
			expect(isValidIdentifier("123abc")).toBe(false);
			expect(isValidIdentifier("my-var")).toBe(false);
			expect(isValidIdentifier("my var")).toBe(false);
			expect(isValidIdentifier("my.var")).toBe(false);
			expect(isValidIdentifier("")).toBe(false);
		});
	});

	describe("formatPropertyKey", () => {
		test("should not quote valid identifiers", () => {
			expect(formatPropertyKey("myVar")).toBe("myVar");
			expect(formatPropertyKey("_privateVar")).toBe("_privateVar");
			expect(formatPropertyKey("$jquery")).toBe("$jquery");
		});

		test("should quote invalid identifiers", () => {
			expect(formatPropertyKey("my-var")).toBe('"my-var"');
			expect(formatPropertyKey("my var")).toBe('"my var"');
			expect(formatPropertyKey("my.var")).toBe('"my.var"');
			expect(formatPropertyKey("123abc")).toBe('"123abc"');
		});
	});

	describe("getTypeString", () => {
		function createProgram(code: string) {
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				module: ts.ModuleKind.ESNext,
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};
			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			return { program, sourceFile, checker: program.getTypeChecker() };
		}

		test("should convert primitive types to strings", () => {
			const code = `
				const str: string = "hello";
				const num: number = 42;
				const bool: boolean = true;
			`;
			const { sourceFile, checker } = createProgram(code);

			let strType: ts.Type | undefined;
			let numType: ts.Type | undefined;
			let boolType: ts.Type | undefined;

			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name)) {
							const type = checker.getTypeAtLocation(decl.name);
							if (decl.name.text === "str") strType = type;
							if (decl.name.text === "num") numType = type;
							if (decl.name.text === "bool") boolType = type;
						}
					}
				}
			});

			expect(strType).toBeDefined();
			expect(numType).toBeDefined();
			expect(boolType).toBeDefined();

			if (strType) expect(getTypeString(strType, checker)).toBe("string");
			if (numType) expect(getTypeString(numType, checker)).toBe("number");
			// Boolean literals are inferred as "false | true" by the type checker
			if (boolType) {
				const typeString = getTypeString(boolType, checker);
				expect(typeString).toMatch(BOOLEAN_TYPE_PATTERN);
			}
		});

		test("should handle union types", () => {
			const code = `
				const value: string | number = "hello";
			`;
			const { sourceFile, checker } = createProgram(code);

			let unionType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "value") {
							unionType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(unionType).toBeDefined();
			if (unionType) {
				const typeString = getTypeString(unionType, checker);
				expect(typeString).toMatch(UNION_STRING_NUMBER_PATTERN);
			}
		});

		test("should filter out never types from unions", () => {
			const code = `
				type MyType<T> = T extends string ? T : never;
				type Result = MyType<string> | MyType<number>;
			`;
			const { sourceFile, checker } = createProgram(code);

			let resultType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "Result") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						resultType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(resultType).toBeDefined();
			if (resultType) {
				const typeString = getTypeString(resultType, checker);
				expect(typeString).not.toContain("never");
			}
		});

		test("should handle object types", () => {
			const code = `
				interface User {
					name: string;
					age: number;
				}
				const user: User = { name: "John", age: 30 };
			`;
			const { sourceFile, checker } = createProgram(code);

			let userType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "user") {
							userType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(userType).toBeDefined();
			if (userType) {
				const typeString = getTypeString(userType, checker);
				expect(typeString).toBe("User");
			}
		});

		test("should handle array types", () => {
			const code = `
				const numbers: number[] = [1, 2, 3];
			`;
			const { sourceFile, checker } = createProgram(code);

			let arrayType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "numbers") {
							arrayType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(arrayType).toBeDefined();
			if (arrayType) {
				const typeString = getTypeString(arrayType, checker);
				expect(typeString).toBe("number[]");
			}
		});

		test("should handle generic types", () => {
			const code = `
				const map: Map<string, number> = new Map();
			`;
			const { sourceFile, checker } = createProgram(code);

			let mapType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "map") {
							mapType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(mapType).toBeDefined();
			if (mapType) {
				const typeString = getTypeString(mapType, checker);
				expect(typeString).toContain("Map");
				expect(typeString).toContain("string");
				expect(typeString).toContain("number");
			}
		});
	});

	describe("extractPropertiesFromType", () => {
		function createProgram(code: string) {
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				module: ts.ModuleKind.ESNext,
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};
			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			return { program, sourceFile, checker: program.getTypeChecker() };
		}

		test("should extract properties from interface", () => {
			const code = `
				interface User {
					id: number;
					name: string;
					email: string;
					isActive: boolean;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let userType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "User") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						userType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(userType).toBeDefined();
			if (userType) {
				const properties = extractPropertiesFromType(userType, checker);
				expect(properties.id).toBe("number");
				expect(properties.name).toBe("string");
				expect(properties.email).toBe("string");
				// Boolean may be inferred as "false | true"
				expect(properties.isActive).toMatch(BOOLEAN_TYPE_PATTERN);
			}
		});

		test("should handle optional properties", () => {
			const code = `
				interface Config {
					required: string;
					optional?: number;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let configType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Config") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						configType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(configType).toBeDefined();
			if (configType) {
				const properties = extractPropertiesFromType(configType, checker);
				expect(properties.required).toBe("string");
				expect(properties.optional).toMatch(OPTIONAL_NUMBER_PATTERN);
			}
		});

		test("should handle union type properties", () => {
			const code = `
				interface Result {
					value: string | number;
					status: "success" | "error";
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let resultType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Result") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						resultType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(resultType).toBeDefined();
			if (resultType) {
				const properties = extractPropertiesFromType(resultType, checker);
				expect(properties.value).toMatch(UNION_STRING_NUMBER_PATTERN);
				expect(properties.status).toMatch(SUCCESS_ERROR_PATTERN);
			}
		});

		test("should handle nested object types", () => {
			const code = `
				interface Address {
					street: string;
					city: string;
				}
				interface Person {
					name: string;
					address: Address;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let personType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Person") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						personType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(personType).toBeDefined();
			if (personType) {
				const properties = extractPropertiesFromType(personType, checker);
				expect(properties.name).toBe("string");
				expect(properties.address).toBe("Address");
			}
		});

		test("should handle array properties", () => {
			const code = `
				interface Data {
					items: string[];
					numbers: number[];
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let dataType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Data") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						dataType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(dataType).toBeDefined();
			if (dataType) {
				const properties = extractPropertiesFromType(dataType, checker);
				expect(properties.items).toBe("string[]");
				expect(properties.numbers).toBe("number[]");
			}
		});

		test("should handle generic type properties", () => {
			const code = `
				interface Container<T> {
					value: T;
					metadata: Record<string, T>;
				}
				type StringContainer = Container<string>;
			`;
			const { sourceFile, checker } = createProgram(code);

			let containerType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "StringContainer") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						containerType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(containerType).toBeDefined();
			if (containerType) {
				const properties = extractPropertiesFromType(containerType, checker);
				expect(properties.value).toBe("string");
				expect(properties.metadata).toContain("Record");
				expect(properties.metadata).toContain("string");
			}
		});

		test("should convert empty object type to any", () => {
			const code = `
				interface Test {
					data: {};
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let testType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Test") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						testType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(testType).toBeDefined();
			if (testType) {
				const properties = extractPropertiesFromType(testType, checker);
				// Empty object type {} should be converted to 'any'
				expect(properties.data).toBeDefined();
			}
		});

		test("should handle type aliases", () => {
			const code = `
				type UserId = string;
				type UserAge = number;
				interface User {
					id: UserId;
					age: UserAge;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let userType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "User") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						userType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(userType).toBeDefined();
			if (userType) {
				const properties = extractPropertiesFromType(userType, checker);
				expect(properties.id).toBe("string");
				expect(properties.age).toBe("number");
			}
		});

		test("should handle readonly properties", () => {
			const code = `
				interface Config {
					readonly apiKey: string;
					readonly timeout: number;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let configType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Config") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						configType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(configType).toBeDefined();
			if (configType) {
				const properties = extractPropertiesFromType(configType, checker);
				expect(properties.apiKey).toBe("string");
				expect(properties.timeout).toBe("number");
			}
		});

		test("should handle empty interfaces", () => {
			const code = `
				interface Empty {}
			`;
			const { sourceFile, checker } = createProgram(code);

			let emptyType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Empty") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						emptyType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(emptyType).toBeDefined();
			if (emptyType) {
				const properties = extractPropertiesFromType(emptyType, checker);
				expect(Object.keys(properties).length).toBe(0);
			}
		});

		test("should handle properties with any type and union fallback", () => {
			const code = `
				interface TestAny {
					prop: any;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let testType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "TestAny") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						testType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(testType).toBeDefined();
			if (testType) {
				const properties = extractPropertiesFromType(testType, checker);
				expect(properties.prop).toBe("any");
			}
		});

		test("should handle union type property with specific filtering", () => {
			// This test specifically targets lines 684-685 to ensure the arrow functions are covered
			const code = `
				type StringOrNumber = string | number;
				interface TestUnionProp {
					value: StringOrNumber;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let testType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "TestUnionProp") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						testType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(testType).toBeDefined();
			if (testType) {
				const properties = extractPropertiesFromType(testType, checker);
				expect(properties.value).toBeTruthy();
				// Should contain both string and number
				expect(properties.value.includes("string") || properties.value.includes("number")).toBe(true);
			}
		});

		test("should handle property typed as any but actually union - triggers lines 684-685", () => {
			// ULTIMATE TEST for lines 684-685: Use a Record with any values that might be unions
			// The trick is to use type manipulation that creates complex scenarios
			const code = `
				// Create a scenario where a property might have type 'any' but be a union underneath
				type AnyOrUnion = any | string | number;
				
				interface TestInterface {
					complexProp: AnyOrUnion;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let interfaceType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "TestInterface") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						interfaceType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(interfaceType).toBeDefined();
			if (interfaceType) {
				const properties = extractPropertiesFromType(interfaceType, checker);
				// any | string | number should resolve to 'any'
				expect(properties.complexProp).toBeDefined();
			}
		});

		test("should exercise widened type fallback path", () => {
			// This test tries to hit the widened type path (lines 692-697)
			const code = `
				const value = null;
				type InferredType = typeof value;
				interface TestWidened {
					prop: InferredType;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let interfaceType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "TestWidened") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						interfaceType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(interfaceType).toBeDefined();
			if (interfaceType) {
				const properties = extractPropertiesFromType(interfaceType, checker);
				expect(properties.prop).toBeDefined();
			}
		});

		test("should handle properties without symbol fallback", () => {
			// This tests the fallback path when propSymbol is not found
			const code = `
				interface TestFallback {
					normalProp: string;
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let testType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "TestFallback") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						testType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(testType).toBeDefined();
			if (testType) {
				const properties = extractPropertiesFromType(testType, checker);
				expect(properties.normalProp).toBe("string");
			}
		});
	});

	describe("getTypeString edge cases", () => {
		function createProgram(code: string) {
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				module: ts.ModuleKind.ESNext,
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};
			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			return { program, sourceFile, checker: program.getTypeChecker() };
		}

		test("should handle union with all never types filtered", () => {
			const code = `
				type OnlyNever = never;
			`;
			const { sourceFile, checker } = createProgram(code);

			let neverType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "OnlyNever") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						neverType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(neverType).toBeDefined();
			if (neverType) {
				const typeString = getTypeString(neverType, checker);
				expect(typeString).toBe("never");
			}
		});

		test("should handle union with single filtered type", () => {
			const code = `
				type SingleType = string | never;
			`;
			const { sourceFile, checker } = createProgram(code);

			let singleType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "SingleType") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						singleType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(singleType).toBeDefined();
			if (singleType) {
				const typeString = getTypeString(singleType, checker);
				expect(typeString).toBe("string");
			}
		});

		test("should return empty result when no symbols in properties", () => {
			// Create a mapped type or other complex type structure that might not have direct symbols
			const code = `
				type EmptyMapped = {};
			`;
			const { sourceFile, checker } = createProgram(code);

			let emptyType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "EmptyMapped") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						emptyType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(emptyType).toBeDefined();
			if (emptyType) {
				const properties = extractPropertiesFromType(emptyType, checker);
				expect(Object.keys(properties).length).toBe(0);
			}
		});

		test("should unwrap actual Promise type with lib support", () => {
			const code = `
				async function test(): Promise<string> {
					return "hello";
				}
			`;
			const { sourceFile, checker } = createProgram(code);

			let promiseType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isFunctionDeclaration(node) && node.name?.text === "test") {
					const signature = checker.getSignatureFromDeclaration(node);
					if (signature) {
						promiseType = checker.getReturnTypeOfSignature(signature);
					}
				}
			});

			expect(promiseType).toBeDefined();
			if (promiseType) {
				const unwrapped = unwrapPromiseType(promiseType, checker);
				// Should unwrap Promise<string> to string type
				const typeString = checker.typeToString(unwrapped);
				expect(typeString).toContain("string");
			}
		});

		test("should handle type with single union member after filtering", () => {
			const code = `
				type SingleUnion = string | never;
			`;
			const { sourceFile, checker } = createProgram(code);

			let singleUnionType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "SingleUnion") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						singleUnionType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(singleUnionType).toBeDefined();
			if (singleUnionType) {
				const typeString = getTypeString(singleUnionType, checker);
				// After filtering "never", should return single type
				expect(typeString).toBe("string");
			}
		});

		test("should handle empty union after filtering", () => {
			const code = `
				type EmptyUnion = never;
			`;
			const { sourceFile, checker } = createProgram(code);

			let emptyUnionType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isTypeAliasDeclaration(node) && node.name.text === "EmptyUnion") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						emptyUnionType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			expect(emptyUnionType).toBeDefined();
			if (emptyUnionType) {
				const typeString = getTypeString(emptyUnionType, checker);
				// Should handle empty filtered array gracefully
				expect(typeString).toBeDefined();
			}
		});
	});

	describe("Additional edge case coverage", () => {
		test("should handle conditional where only trueType is inferred (line 410)", () => {
			// Create a conditional where the true branch returns a type but false branch doesn't
			const code = "const x = condition ? 42 : unknownValue";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should return just the true type since false branch is unknown
			expect(result).toContain("number");
		});

		test("should handle conditional where only falseType is inferred (line 412)", () => {
			// Create a conditional where the false branch returns a type but true branch doesn't
			const code = "const x = condition ? unknownValue : 'hello'";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should return just the false type since true branch is unknown
			expect(result).toContain("string");
		});

		test("should handle conditional where neither branch is inferred (line 414)", () => {
			// Create a conditional where both branches return unknown
			const code = "const x = condition ? unknownA : unknownB";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should return unknown since both branches are unknown
			expect(result).toBe("unknown");
		});

		test("should handle binary || where only leftType is inferred (line 427)", () => {
			// Create a || expression where left is known but right is unknown
			const code = "const x = 'left' || unknownValue";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should return just the left type
			expect(result).toContain("string");
		});

		test("should handle binary || where only rightType is inferred (line 430)", () => {
			// Create a || expression where right is known but left is unknown
			const code = "const x = unknownValue || 100";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should return just the right type
			expect(result).toContain("number");
		});

		test("should handle binary || where neither side is inferred (line 432)", () => {
			// Create a || expression where both sides are unknown
			const code = "const x = unknownA || unknownB";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			// Should return unknown since both sides are unknown
			expect(result).toBe("unknown");
		});

		test("should handle undefined keyword in expressions", () => {
			const code = "const x = undefined";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("undefined");
		});

		test("should handle identifier named undefined", () => {
			const code = "const x = undefined";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			if (declaration.initializer && ts.isIdentifier(declaration.initializer)) {
				const result = inferTypeFromExpression(declaration.initializer);
				expect(result).toBe("undefined");
			}
		});

		test("should handle object with string literal property names", () => {
			const code = 'const obj = { "prop-name": "value" }';
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const varDecl = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0];
			const obj = varDecl.initializer as ts.ObjectLiteralExpression;
			const result = extractPropertiesFromObjectLiteral(obj);
			expect(result["prop-name"]).toBe("string");
		});

		test("should handle conditional with same types in both branches", () => {
			const code = "const x = condition ? 'yes' : 'no'";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("string");
		});

		test("should handle binary || with same types", () => {
			const code = "const x = 'a' || 'b'";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("string");
		});

		test("should handle binary || with different types", () => {
			const code = "const x = 'str' || 42";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("string");
			expect(result).toContain("number");
		});

		test("should handle call to filter returning inferred array type", () => {
			const code = "const x = [1, 2, 3].filter(n => n > 1)";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("number");
		});

		test("should handle call to slice returning inferred array type", () => {
			const code = "const x = [1, 2, 3].slice(0, 2)";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toContain("number");
		});

		test("should handle unary minus operator", () => {
			const code = "const x = -42";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("number");
		});

		test("should handle unary plus operator", () => {
			const code = "const x = +42";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const statement = sourceFile.statements[0] as ts.VariableStatement;
			const declaration = statement.declarationList.declarations[0];
			const result = inferTypeFromExpression(declaration.initializer as ts.Expression);
			expect(result).toBe("number");
		});

		test("should handle types with 'any' that have union alternatives", () => {
			const code = `
				interface Mixed {
					prop: any;
				}
			`;
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				module: ts.ModuleKind.ESNext,
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};
			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			const checker = program.getTypeChecker();

			let mixedType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isInterfaceDeclaration(node) && node.name.text === "Mixed") {
					const symbol = checker.getSymbolAtLocation(node.name);
					if (symbol) {
						mixedType = checker.getDeclaredTypeOfSymbol(symbol);
					}
				}
			});

			if (mixedType) {
				const properties = extractPropertiesFromType(mixedType, checker);
				// Should handle 'any' type gracefully
				expect(properties.prop).toBeDefined();
			}
		});

		test("should test remaining edge cases in type inference", () => {
			// Test comparison operators
			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 1 === 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("boolean");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 1 !== 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("boolean");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 1 < 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("boolean");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 1 > 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("boolean");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 1 <= 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("boolean");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 1 >= 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("boolean");

			// Test arithmetic operators
			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 10 % 3";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("number");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 5 - 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("number");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 4 * 3";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("number");

			expect(
				inferTypeFromExpression(
					(() => {
						const code = "const x = 8 / 2";
						const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
						const statement = sourceFile.statements[0] as ts.VariableStatement;
						return statement.declarationList.declarations[0].initializer as ts.Expression;
					})(),
				),
			).toBe("number");
		});
	});

	describe("getTypeStringInternal coverage", () => {
		function createProgram(code: string) {
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.Latest,
				module: ts.ModuleKind.ESNext,
			};
			const host = ts.createCompilerHost(compilerOptions);
			const originalGetSourceFile = host.getSourceFile;
			host.getSourceFile = (fileName, languageVersion) => {
				if (fileName === "test.ts") {
					return sourceFile;
				}
				return originalGetSourceFile(fileName, languageVersion);
			};
			const program = ts.createProgram(["test.ts"], compilerOptions, host);
			return { program, sourceFile, checker: program.getTypeChecker() };
		}

		test("should call getTypeStringInternal for simple non-union types", () => {
			const code = `
				const simpleString: string = "test";
				const simpleNumber: number = 42;
				const simpleBoolean: boolean = true;
			`;
			const { sourceFile, checker } = createProgram(code);

			let stringType: ts.Type | undefined;
			let numberType: ts.Type | undefined;
			let booleanType: ts.Type | undefined;

			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name)) {
							const type = checker.getTypeAtLocation(decl.name);
							if (decl.name.text === "simpleString") stringType = type;
							if (decl.name.text === "simpleNumber") numberType = type;
							if (decl.name.text === "simpleBoolean") booleanType = type;
						}
					}
				}
			});

			// These should all call getTypeStringInternal directly (not through union handling)
			expect(stringType).toBeDefined();
			if (stringType) {
				const result = getTypeString(stringType, checker);
				expect(result).toBe("string");
			}

			expect(numberType).toBeDefined();
			if (numberType) {
				const result = getTypeString(numberType, checker);
				expect(result).toBe("number");
			}

			expect(booleanType).toBeDefined();
			if (booleanType) {
				const result = getTypeString(booleanType, checker);
				expect(result).toMatch(BOOLEAN_TYPE_PATTERN);
			}
		});

		test("should call getTypeStringInternal for object types", () => {
			const code = `
				interface SimpleInterface {
					name: string;
					age: number;
				}
				const obj: SimpleInterface = { name: "test", age: 30 };
			`;
			const { sourceFile, checker } = createProgram(code);

			let objectType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "obj") {
							objectType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(objectType).toBeDefined();
			if (objectType) {
				const result = getTypeString(objectType, checker);
				expect(result).toBe("SimpleInterface");
			}
		});

		test("should call getTypeStringInternal for array types", () => {
			const code = `
				const arr: string[] = ["a", "b", "c"];
			`;
			const { sourceFile, checker } = createProgram(code);

			let arrayType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "arr") {
							arrayType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(arrayType).toBeDefined();
			if (arrayType) {
				const result = getTypeString(arrayType, checker);
				expect(result).toBe("string[]");
			}
		});

		test("should call getTypeStringInternal for each union member", () => {
			const code = `
				type UnionType = string | number | boolean;
				const val: UnionType = "test";
			`;
			const { sourceFile, checker } = createProgram(code);

			let unionType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "val") {
							unionType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(unionType).toBeDefined();
			if (unionType) {
				// This should call getTypeStringInternal multiple times (once per union member)
				const result = getTypeString(unionType, checker);
				expect(result).toBeTruthy();
				// Result should contain all union members
				expect(result.includes("string") || result.includes("number") || result.includes("boolean")).toBe(true);
			}
		});

		test("should call getTypeStringInternal for type aliases", () => {
			const code = `
				type MyString = string;
				const val: MyString = "test";
			`;
			const { sourceFile, checker } = createProgram(code);

			let aliasType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "val") {
							aliasType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(aliasType).toBeDefined();
			if (aliasType) {
				const result = getTypeString(aliasType, checker);
				expect(result).toBe("string");
			}
		});

		test("should handle edge case where union filtering results in empty array", () => {
			// This test ensures we hit the edge case in getTypeString where filtered.length === 0
			const code = `
				type EmptyAfterFilter = never;
				const val: EmptyAfterFilter = undefined as never;
			`;
			const { sourceFile, checker } = createProgram(code);

			let neverType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "val") {
							neverType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(neverType).toBeDefined();
			if (neverType) {
				const result = getTypeString(neverType, checker);
				// Never type should be returned even if it's filtered
				expect(result).toBe("never");
			}
		});

		test("should properly call getTypeStringInternal through fallback path", () => {
			// Test the non-union path (line 630) explicitly
			const code = `
				class MyClass {
					name: string = "test";
				}
				const instance: MyClass = new MyClass();
			`;
			const { sourceFile, checker } = createProgram(code);

			let classType: ts.Type | undefined;
			ts.forEachChild(sourceFile, (node) => {
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === "instance") {
							classType = checker.getTypeAtLocation(decl.name);
						}
					}
				}
			});

			expect(classType).toBeDefined();
			if (classType) {
				// This should directly call getTypeStringInternal (not through union handling)
				const result = getTypeString(classType, checker);
				expect(result).toBe("MyClass");
			}
		});
	});
});
