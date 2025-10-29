/**
 * Example file showcasing literal value extraction
 * This file demonstrates various literal types for extraction utilities
 */

// String literals
export const simpleString = "hello world";
export const multiLineString = `
    This is a multi-line
    template string with
    embedded expressions: ${new Date().getFullYear()}
`;
export const quotedString = "single quoted string";
export const templateString = `Template with ${42} and ${"nested"}`;

// Number literals
export const integerLiteral = 42;
export const floatLiteral = Math.PI;
export const negativeLiteral = -123;
export const scientificLiteral = 1.23e-4;
export const hexLiteral = 0xff;
export const binaryLiteral = 0b1010;
export const octalLiteral = 0o755;

// Boolean literals
export const trueLiteral = true;
export const falseLiteral = false;

// Null and undefined literals
export const nullLiteral: null = null;
export const undefinedLiteral: undefined = undefined;

// Array literals with different types
export const stringArray = ["first", "second", "third"];
export const numberArray = [1, 2, 3, 4, 5];
export const mixedArray = ["string", 42, true, null];
export const nestedArray = [
	["a", "b"],
	["c", "d"],
	[1, 2, 3],
];

// Object literals with various value types
export const simpleObject = {
	stringProp: "value",
	numberProp: 123,
	booleanProp: true,
};

export const complexObject = {
	// Different literal types
	string: "text",
	number: 42,
	boolean: false,
	nullValue: null,

	// Nested structures
	nested: {
		deep: {
			value: "deeply nested",
		},
	},

	// Arrays as properties
	stringArray: ["item1", "item2"],
	numberArray: [10, 20, 30],

	// Mixed types
	mixed: ["string", 123, { prop: "value" }, [1, 2, 3]],
};

// Regular expression literals
export const simpleRegex = /hello/;
export const complexRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
export const regexWithFlags = /pattern/gim;

// BigInt literals
export const bigIntLiteral = 123456789012345678901234567890n;

// Symbol (though not a literal, included for completeness)
export const symbolValue = Symbol("description");

// Function expressions with literal bodies
export const functionWithLiterals = () => {
	return {
		message: "Hello from function",
		count: 42,
		active: true,
		items: ["a", "b", "c"],
	};
};

// Arrow function with literal return
export const arrowWithLiteral = () => "literal string";
export const arrowWithObject = () => ({
	prop1: "value1",
	prop2: 123,
	prop3: true,
});

const value = 1;

// Conditional expressions with literals
export const conditionalLiteral = value === 1 ? "truthy" : "falsy";
export const nestedConditional = value > 0 ? "positive" : value < 0 ? "negative" : "zero";

// Template literals with complex expressions
export const complexTemplate = `
    User info:
    - Name: ${"John Doe"}
    - Age: ${30}
    - Active: ${true}
    - Score: ${Math.round(95.7)}
`;

// Array of objects with literals
export const arrayOfObjects = [
	{ id: 1, name: "First", active: true },
	{ id: 2, name: "Second", active: false },
	{ id: 3, name: "Third", active: true },
];

// Deeply nested structure
export const deeplyNested = {
	level1: {
		level2: {
			level3: {
				level4: {
					value: "deep value",
					array: [{ prop: "nested in array" }, { prop: "another nested" }],
				},
			},
		},
	},
};
