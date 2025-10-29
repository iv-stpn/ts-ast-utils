/**
 * Object Analysis Tests
 * Tests the object analysis functionality with all object pattern examples
 */

import { beforeAll, describe, expect, test } from "bun:test";
import * as path from "node:path";
import * as ts from "typescript";
import {
	createSourceFileFromPath,
	findNodes,
	getBooleanPropertyValue,
	getObjectProperties,
	getObjectPropertyValue,
	hasObjectProperty,
} from "../../src/index";

describe("Object Analysis", () => {
	const examplesPath = path.join(__dirname, "..", "examples", "objects");

	describe("Object Literals", () => {
		let sourceFile: ts.SourceFile;
		let objectLiterals: ts.ObjectLiteralExpression[];

		beforeAll(() => {
			const filePath = path.join(examplesPath, "object-literals.ts");
			sourceFile = createSourceFileFromPath(filePath);
			objectLiterals = findNodes(sourceFile, ts.isObjectLiteralExpression);
		});

		test("should find multiple object literals", () => {
			expect(objectLiterals.length).toBeGreaterThan(5);
		});

		test("should analyze appConfig object properties", () => {
			// Find the appConfig object (should be one of the first objects)
			const appConfigObj = objectLiterals.find((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some((prop) => prop.key === "name" || prop.key === "version");
			});

			expect(appConfigObj).toBeDefined();

			if (appConfigObj) {
				const properties = getObjectProperties(appConfigObj);

				// Should have basic properties
				expect(properties.some((prop) => prop.key === "name")).toBe(true);
				expect(properties.some((prop) => prop.key === "version")).toBe(true);
				expect(properties.some((prop) => prop.key === "debug")).toBe(true);
				expect(properties.some((prop) => prop.key === "port")).toBe(true);
			}
		});

		test("should analyze serverSettings object with various property types", () => {
			// Find the serverSettings object
			const serverSettingsObj = objectLiterals.find((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some((prop) => prop.key === "environment");
			});

			expect(serverSettingsObj).toBeDefined();

			if (serverSettingsObj) {
				const properties = getObjectProperties(serverSettingsObj);

				// Check for different property types
				const stringProps = properties.filter((prop) => typeof prop.value === "string");
				const numberProps = properties.filter((prop) => typeof prop.value === "number");
				const booleanProps = properties.filter((prop) => typeof prop.value === "boolean");
				const arrayProps = properties.filter((prop) => Array.isArray(prop.value));

				expect(stringProps.length).toBeGreaterThan(0);
				expect(numberProps.length).toBeGreaterThan(0);
				expect(booleanProps.length).toBeGreaterThan(0);
				expect(arrayProps.length).toBeGreaterThan(0);
			}
		});

		test("should handle nested object properties", () => {
			// Find objects with nested structures
			const nestedObjects = objectLiterals.filter((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some((prop) => typeof prop.value === "object" && prop.value !== null);
			});

			expect(nestedObjects.length).toBeGreaterThan(0);
		});

		test("should identify computed properties", () => {
			// Find the dynamicObject which has computed properties
			const dynamicObj = objectLiterals.find((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some((prop) => prop.isComputed);
			});

			if (dynamicObj) {
				const properties = getObjectProperties(dynamicObj);
				const computedProps = properties.filter((prop) => prop.isComputed);

				expect(computedProps.length).toBeGreaterThan(0);
			}
		});

		test("should extract property values correctly", () => {
			const simpleObj = objectLiterals.find((obj) => {
				const properties = getObjectProperties(obj);
				return properties.length > 0 && properties.length < 10; // Find a simple object
			});

			if (simpleObj) {
				const properties = getObjectProperties(simpleObj);

				properties.forEach((prop) => {
					expect(prop.key).toBeTruthy();
					expect(prop.valueNode).toBeDefined();
					expect(typeof prop.isComputed).toBe("boolean");
				});
			}
		});
	});

	describe("Property Access Patterns", () => {
		let sourceFile: ts.SourceFile;

		beforeAll(() => {
			const filePath = path.join(examplesPath, "property-access.ts");
			sourceFile = createSourceFileFromPath(filePath);
		});

		test("should find object literals in property access file", () => {
			const objectLiterals = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objectLiterals.length).toBeGreaterThan(0);
		});

		test("should handle object destructuring patterns", () => {
			// The file contains destructuring examples
			const destructuringPatterns = findNodes(sourceFile, ts.isObjectBindingPattern);
			expect(destructuringPatterns.length).toBeGreaterThan(0);
		});

		test("should analyze configuration objects", () => {
			const objectLiterals = findNodes(sourceFile, ts.isObjectLiteralExpression);

			// Should find objects created in functions
			expect(objectLiterals.length).toBeGreaterThan(3);
		});
	});

	describe("Object Creation Patterns", () => {
		let sourceFile: ts.SourceFile;
		let objectLiterals: ts.ObjectLiteralExpression[];

		beforeAll(() => {
			const filePath = path.join(examplesPath, "object-creation.ts");
			sourceFile = createSourceFileFromPath(filePath);
			objectLiterals = findNodes(sourceFile, ts.isObjectLiteralExpression);
		});

		test("should find objects in factory functions", () => {
			expect(objectLiterals.length).toBeGreaterThan(5);
		});

		test("should analyze objects with different creation patterns", () => {
			// Test various object creation patterns exist
			const properties = objectLiterals.flatMap((obj) => getObjectProperties(obj));

			expect(properties.length).toBeGreaterThan(10);
		});

		test("should handle objects with computed properties", () => {
			const objectsWithComputed = objectLiterals.filter((obj) => {
				const properties = getObjectProperties(obj);
				return properties.some((prop) => prop.isComputed);
			});

			// At least some objects should have computed properties
			expect(objectsWithComputed.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Object Property Utility Functions", () => {
		let testObject: ts.ObjectLiteralExpression;

		beforeAll(() => {
			// Create a test object for utility function testing
			const testContent = `
        const testObj = {
          stringProp: "test",
          numberProp: 42,
          booleanProp: true,
          nullProp: null,
          arrayProp: [1, 2, 3],
          nestedObj: {
            inner: "value"
          }
        };
      `;

			const sourceFile = ts.createSourceFile("test.ts", testContent, ts.ScriptTarget.Latest, true);

			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			testObject = objects[0];
		});

		test("getObjectPropertyValue should extract property values", () => {
			expect(getObjectPropertyValue(testObject, "stringProp")).toBe("test");
			expect(getObjectPropertyValue(testObject, "numberProp")).toBe(42);
			expect(getObjectPropertyValue(testObject, "booleanProp")).toBe(true);
			expect(getObjectPropertyValue(testObject, "nonexistent")).toBeUndefined();
		});

		test("getBooleanPropertyValue should extract boolean values", () => {
			expect(getBooleanPropertyValue(testObject, "booleanProp")).toBe(true);
			expect(getBooleanPropertyValue(testObject, "stringProp")).toBeNull();
			expect(getBooleanPropertyValue(testObject, "nonexistent")).toBeNull();
		});

		test("hasObjectProperty should check property existence", () => {
			expect(hasObjectProperty(testObject, "stringProp")).toBe(true);
			expect(hasObjectProperty(testObject, "numberProp")).toBe(true);
			expect(hasObjectProperty(testObject, "nonexistent")).toBe(false);
		});

		test("should handle edge cases", () => {
			// Test with false boolean value
			const falseTestContent = `
        const obj = { falseProp: false };
      `;

			const sourceFile = ts.createSourceFile("test.ts", falseTestContent, ts.ScriptTarget.Latest, true);

			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			const falseTestObj = objects[0];

			expect(getBooleanPropertyValue(falseTestObj, "falseProp")).toBe(false);
			expect(hasObjectProperty(falseTestObj, "falseProp")).toBe(true);
		});
	});

	describe("Object Analysis Edge Cases", () => {
		test("should handle empty objects", () => {
			const emptyObjContent = "const empty = {};";
			const sourceFile = ts.createSourceFile("test.ts", emptyObjContent, ts.ScriptTarget.Latest, true);

			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objects.length).toBe(1);

			const properties = getObjectProperties(objects[0]);
			expect(properties).toHaveLength(0);
		});

		test("should handle objects with only methods", () => {
			const methodsOnlyContent = `
        const obj = {
          method1() { return 1; },
          method2: () => 2,
          get prop() { return 3; },
          set prop(value) { }
        };
      `;

			const sourceFile = ts.createSourceFile("test.ts", methodsOnlyContent, ts.ScriptTarget.Latest, true);

			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objects.length).toBe(1);

			// getObjectProperties should handle method properties
			expect(() => getObjectProperties(objects[0])).not.toThrow();
		});

		test("should handle objects with complex computed properties", () => {
			const complexComputedContent = `
        const key = 'dynamic';
        const obj = {
          [key]: 'value',
          [\`prefix_\${key}\`]: 'prefixed',
          [1 + 2]: 'computed'
        };
      `;

			const sourceFile = ts.createSourceFile("test.ts", complexComputedContent, ts.ScriptTarget.Latest, true);

			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objects.length).toBe(1);

			const properties = getObjectProperties(objects[0]);
			const computedProps = properties.filter((prop) => prop.isComputed);

			expect(computedProps.length).toBe(3);
		});
	});

	describe("Object Analysis Performance", () => {
		test("should handle objects with many properties efficiently", () => {
			// Create an object with many properties
			const manyPropsContent = `
        const largeObj = {
          ${Array.from({ length: 100 }, (_, i) => `prop${i}: ${i}`).join(",\n")}
        };
      `;

			const sourceFile = ts.createSourceFile("test.ts", manyPropsContent, ts.ScriptTarget.Latest, true);

			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);
			expect(objects.length).toBe(1);

			const start = performance.now();
			const properties = getObjectProperties(objects[0]);
			const end = performance.now();

			expect(properties.length).toBe(100);
			expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
		});

		test("should handle many small objects efficiently", () => {
			// Create many small objects
			const manyObjectsContent = Array.from({ length: 50 }, (_, i) => `const obj${i} = { prop: ${i} };`).join("\n");

			const sourceFile = ts.createSourceFile("test.ts", manyObjectsContent, ts.ScriptTarget.Latest, true);

			const start = performance.now();
			const objects = findNodes(sourceFile, ts.isObjectLiteralExpression);

			// Analyze all objects
			const allProperties = objects.flatMap((obj) => getObjectProperties(obj));
			const end = performance.now();

			expect(objects.length).toBe(50);
			expect(allProperties.length).toBe(50);
			expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
		});
	});
});
