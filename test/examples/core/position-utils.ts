/**
 * Example file showcasing position and location utilities
 * This file demonstrates various code structures with different positions
 */

// Single line declarations
export const singleLineConst = "value";
export function singleLineFunction(): void {
	console.log("single line");
}

// Multi-line declarations with comments
/**
 * This is a multi-line comment
 * for a function that spans
 * multiple lines
 */
export function multiLineFunction(
	param1: string,
	param2: number,
	param3: {
		nestedProp: boolean;
		anotherProp: string[];
	},
): Promise<{
	result: string;
	metadata: {
		processed: boolean;
		timestamp: number;
	};
}> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				result: `Processed ${param1} with ${param2}`,
				metadata: {
					processed: param3.nestedProp,
					timestamp: Date.now(),
				},
			});
		}, 100);
	});
}

// Class with various method positions
export class PositionTestClass {
	// Property on line with comment
	private value: string = "initial"; // End of line comment

	/* Block comment before method */
	public method1(): string {
		return this.value;
	}

	// Another comment
	public method2(
		longParameter1: string,
		longParameter2: number,
		longParameter3: boolean,
	): {
		prop1: string;
		prop2: number;
		prop3: boolean;
	} {
		// Method body with multiple statements
		const result = {
			prop1: longParameter1,
			prop2: longParameter2,
			prop3: longParameter3,
		};

		this.value = longParameter1;

		return result;
	}

	// Async method with await
	public async method3(): Promise<void> {
		const data = await multiLineFunction("test", 123, {
			nestedProp: true,
			anotherProp: ["a", "b", "c"],
		});

		console.log(data);
	}
}

// Interface definitions at different positions
export interface SimpleInterface {
	prop: string;
}

export interface ComplexInterface {
	// Property with comment
	name: string;

	// Optional property
	description?: string;

	// Method signature
	process(input: string): Promise<string>;

	// Complex nested type
	config: {
		settings: {
			enabled: boolean;
			level: number;
		};
		features: string[];
	};
}

// Type alias with different structures
export type SimpleType = string | number;

export type ComplexType = {
	field1: string;
	field2: {
		nested: boolean;
		values: number[];
	};
} & {
	additional: string;
};

// Enum definitions
export enum SimpleEnum {
	VALUE1,
	VALUE2,
	VALUE3,
}

export enum ComplexEnum {
	// First value with comment
	FIRST = "first_value",

	// Second value
	SECOND = "second_value",

	// Third value
	THIRD = "third_value",
}

// Namespace for position testing
export namespace PositionNamespace {
	export const CONSTANT = "namespace constant";

	export function namespaceFunction(): string {
		return CONSTANT;
	}

	export interface NamespaceInterface {
		prop: string;
	}
}

const testVariable = "test";

// Variable declarations at different indentation levels
if (testVariable === "test") {
	const level1Variable = "level 1";

	if (level1Variable === "level 1") {
		const level2Variable = "level 2";

		if (level2Variable === "level 2") {
			const level3Variable = "level 3";
			console.log(level1Variable, level2Variable, level3Variable);
		}
	}
}
