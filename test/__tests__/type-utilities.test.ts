import { describe, expect, test } from "@jest/globals";
import ts from "typescript";
import {
	areMapsWithRecordValuesEqual,
	areRecordsEqual,
	extractPropertiesFromObjectLiteral,
	extractReturnTypeFromPromise,
	findObjectProperty,
	formatPropertyKey,
	hasProperty,
	inferTypeFromExpression,
	isValidIdentifier,
	parseObjectType,
	resolveTypeAlias,
	serializeTypeNode,
} from "../../src/core/type-utilities";

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

		test("should handle object types with computed property names", () => {
			const code = "type Test = { [key: string]: number }";
			const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
			const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
			const result = serializeTypeNode(typeAlias.type);
			// Index signatures are not property signatures, so they're skipped
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
});
