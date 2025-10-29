/**
 * Example file showcasing node analysis utilities
 * This file demonstrates various node types for analysis
 */

// Function declarations for node analysis
export function regularFunction(param1: string, param2: number): string {
	return `${param1}: ${param2}`;
}

export async function asyncFunction(data: unknown[]): Promise<number> {
	// Simulated async work
	await new Promise((resolve) => setTimeout(resolve, 100));
	return data.length;
}

function _internalFunction(): void {
	console.log("This is an internal function");
}

// Class declarations for node analysis
export class PublicClass {
	private _value: string;

	constructor(value: string) {
		this._value = value;
	}

	public getValue(): string {
		return this._value;
	}

	public async asyncMethod(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

class _InternalClass {
	doSomething(): void {
		console.log("Internal class method");
	}
}

// Variable declarations with different modifiers
export const EXPORTED_CONSTANT = "exported";
export const exportedVariable = "mutable exported";

const _INTERNAL_CONSTANT = "internal";
const _internalVariable = "internal mutable";

// Default export for analysis
export default class DefaultExportClass {
	name: string;

	constructor(name: string) {
		this.name = name;
	}

	greet(): string {
		return `Hello, ${this.name}!`;
	}
}

// Arrow functions with different contexts
export const arrowFunction = (x: number, y: number): number => x + y;

const _internalArrow = (): string => "internal arrow";

export const asyncArrowFunction = async (id: string): Promise<string> => {
	await new Promise((resolve) => setTimeout(resolve, 10));
	return `processed-${id}`;
};

// Function expressions
export const functionExpression = function namedFunctionExpression(value: string): string {
	return value.toUpperCase();
};

const _internalFunctionExpression = (): number => Math.random();

// Methods within objects for context analysis
export const objectWithMethods = {
	regularMethod(param: string): string {
		return param.toLowerCase();
	},

	async asyncMethod(param: number): Promise<string> {
		await new Promise((resolve) => setTimeout(resolve, param));
		return `result: ${param}`;
	},

	arrowMethod: (param: boolean): string => (param ? "true" : "false"),

	get computedProperty(): string {
		return "computed";
	},

	set computedProperty(value: string) {
		console.log(`Setting: ${value}`);
	},
};

// Nested function contexts
export function outerFunction(): () => string {
	const innerVariable = "inner";

	function innerFunction(): string {
		return innerVariable;
	}

	const _innerArrow = (): string => innerVariable;

	return innerFunction;
}

// Generator functions
export function* generatorFunction(): Generator<number> {
	yield 1;
	yield 2;
	yield 3;
}

export async function* asyncGeneratorFunction(): AsyncGenerator<string> {
	yield "first";
	await new Promise((resolve) => setTimeout(resolve, 10));
	yield "second";
}
