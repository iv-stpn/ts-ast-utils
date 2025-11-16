/**
 * Property Analysis Tests
 * Tests for getPropertyName and parseGeneratedInterfaces functions
 */

import { describe, expect, test } from "bun:test";
import ts from "typescript";
import { createSourceFileFromContent, findFirstNode, getPropertyName, parseGeneratedInterfaces } from "../../src/index";

type InterfaceMember = ts.PropertySignature | ts.IndexSignatureDeclaration;

describe("Property Name Extraction", () => {
	test("should extract identifier property names", () => {
		const content = `
interface TestInterface {
	simpleProperty: string;
	anotherProperty: number;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(2);

			const prop1Name = getPropertyName(members[0].name);
			const prop2Name = getPropertyName(members[1].name);

			expect(prop1Name).toBe("simpleProperty");
			expect(prop2Name).toBe("anotherProperty");
		}
	});

	test("should extract string literal property names", () => {
		const content = `
interface TestInterface {
	"string-property": string;
	"another-string-prop": number;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(2);

			const prop1Name = getPropertyName(members[0].name);
			const prop2Name = getPropertyName(members[1].name);

			expect(prop1Name).toBe("string-property");
			expect(prop2Name).toBe("another-string-prop");
		}
	});

	test("should extract numeric literal property names", () => {
		const content = `
interface TestInterface {
	0: string;
	42: number;
	123: boolean;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(3);

			const prop1Name = getPropertyName(members[0].name);
			const prop2Name = getPropertyName(members[1].name);
			const prop3Name = getPropertyName(members[2].name);

			expect(prop1Name).toBe("0");
			expect(prop2Name).toBe("42");
			expect(prop3Name).toBe("123");
		}
	});

	test("should extract template literal property names via parseGeneratedInterfaces", () => {
		const content = `
interface TestInterface {
	[key: \`prefix_\${string}\`]: string;
	[key: \`\${string}_suffix\`]: number;
	[key: \`before_\${string}_after\`]: boolean;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				TestInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties[0]).toBe("prefix_${string}");
		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties[1]).toBe("${string}_suffix");
		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties[2]).toBe("before_${string}_after");
	});

	test("should handle computed property names without template literals", () => {
		const content = `
const KEY = "dynamicKey";
interface TestInterface {
	[KEY]: string;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				TestInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// Should have no properties since the index signature doesn't use a template literal
		expect(results.properties).toEqual([]);
	});

	test("should handle multiple template spans via parseGeneratedInterfaces", () => {
		const content = `
interface TestInterface {
	[key: \`\${string}_\${string}_\${string}\`]: string;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				TestInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties[0]).toBe("${string}_${string}_${string}");
	});

	test("should handle empty template literal head via parseGeneratedInterfaces", () => {
		const content = `
interface TestInterface {
	[key: \`\${string}suffix\`]: string;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				TestInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties[0]).toBe("${string}suffix");
	});

	test("should handle mixed property name types", () => {
		const content = `
interface TestInterface {
	identifier: string;
	"string-literal": number;
	42: boolean;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(3);

			expect(getPropertyName(members[0].name)).toBe("identifier");
			expect(getPropertyName(members[1].name)).toBe("string-literal");
			expect(getPropertyName(members[2].name)).toBe("42");
		}
	});
});

describe("Parse Generated Interfaces", () => {
	test("should parse simple interface", () => {
		const content = `
interface UserConfig {
	name: string;
	age: number;
	email: string;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				UserConfig: (_propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(_propName);
				},
			},
			{ properties: [] },
		);

		expect(results.properties).toEqual(["name", "age", "email"]);
	});

	test("should parse multiple interfaces with different handlers", () => {
		const content = `
interface UserConfig {
	username: string;
	password: string;
}

interface AppSettings {
	theme: string;
	language: string;
	notifications: boolean;
}
		`.trim();

		interface Results {
			userProps: string[];
			settingsProps: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				UserConfig: (propName: string, _member: InterfaceMember, results: Results) => {
					results.userProps.push(propName);
				},
				AppSettings: (propName: string, _member: InterfaceMember, results: Results) => {
					results.settingsProps.push(propName);
				},
			},
			{ userProps: [], settingsProps: [] },
		);

		expect(results.userProps).toEqual(["username", "password"]);
		expect(results.settingsProps).toEqual(["theme", "language", "notifications"]);
	});

	test("should handle interfaces with template literal properties", () => {
		const content = `
interface DynamicKeys {
	[key: \`user_\${string}\`]: string;
	[key: \`setting_\${string}\`]: number;
	staticProp: boolean;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				DynamicKeys: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties).toEqual(["user_${string}", "setting_${string}", "staticProp"]);
	});

	test("should access member type information", () => {
		const content = `
interface TypedConfig {
	stringProp: string;
	numberProp: number;
	booleanProp: boolean;
	optionalProp?: string;
}
		`.trim();

		interface Results {
			propTypes: Record<string, { optional: boolean }>;
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				TypedConfig: (propName: string, member: InterfaceMember, results: Results) => {
					results.propTypes[propName] = {
						optional: ts.isPropertySignature(member) && member.questionToken !== undefined,
					};
				},
			},
			{ propTypes: {} },
		);

		expect(results.propTypes.stringProp.optional).toBe(false);
		expect(results.propTypes.numberProp.optional).toBe(false);
		expect(results.propTypes.booleanProp.optional).toBe(false);
		expect(results.propTypes.optionalProp.optional).toBe(true);
	});

	test("should skip non-property signature members", () => {
		const content = `
interface MixedMembers {
	property: string;
	method(): void;
	callSignature: (arg: string) => void;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				MixedMembers: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// Should only include property signatures, not methods or call signatures
		expect(results.properties).toEqual(["property", "callSignature"]);
	});

	test("should handle empty interfaces", () => {
		const content = `
interface EmptyInterface {}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				EmptyInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		expect(results.properties).toEqual([]);
	});

	test("should handle interfaces not in handler map", () => {
		const content = `
interface HandledInterface {
	prop1: string;
}

interface UnhandledInterface {
	prop2: number;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				HandledInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// Only HandledInterface properties should be collected
		expect(results.properties).toEqual(["prop1"]);
	});

	test("should handle complex nested structures", () => {
		const content = `
export interface Config {
	"api-key": string;
	port: number;
	[key: \`env_\${string}\`]: string;
}

interface OtherInterface {
	ignored: boolean;
}
		`.trim();

		interface Results {
			configKeys: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				Config: (propName: string, _member: InterfaceMember, results: Results) => {
					results.configKeys.push(propName);
				},
			},
			{ configKeys: [] },
		);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.configKeys).toEqual(["api-key", "port", "env_${string}"]);
	});

	test("should handle malformed content gracefully", () => {
		const content = `
interface Broken {
	incomplete
		`.trim();

		interface Results {
			properties: string[];
		}

		// Should not throw, just log a warning
		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				Broken: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// TypeScript parser is lenient and may still parse some properties
		// The important thing is that it doesn't throw
		expect(Array.isArray(results.properties)).toBe(true);
	});

	test("should accumulate results across multiple interface handlers", () => {
		const content = `
interface Interface1 {
	prop1: string;
	prop2: number;
}

interface Interface2 {
	prop3: boolean;
	prop4: string[];
}
		`.trim();

		interface Results {
			allProps: string[];
			count: number;
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				Interface1: (propName: string, _member: InterfaceMember, results: Results) => {
					results.allProps.push(propName);
					results.count++;
				},
				Interface2: (propName: string, _member: InterfaceMember, results: Results) => {
					results.allProps.push(propName);
					results.count++;
				},
			},
			{ allProps: [], count: 0 },
		);

		expect(results.allProps).toEqual(["prop1", "prop2", "prop3", "prop4"]);
		expect(results.count).toBe(4);
	});

	test("should handle interfaces with numeric and mixed property names", () => {
		const content = `
interface MixedProps {
	0: string;
	identifier: number;
	"string-key": boolean;
	[key: \`dynamic_\${string}\`]: any;
}
		`.trim();

		interface Results {
			properties: Array<{ name: string; type: "numeric" | "identifier" | "string" | "template" }>;
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				MixedProps: (propName: string, _member: InterfaceMember, results: Results) => {
					let type: "numeric" | "identifier" | "string" | "template";
					// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
					if (propName.includes("${string}")) {
						type = "template";
						// biome-ignore lint/performance/useTopLevelRegex: test function only
					} else if (/^\d+$/.test(propName)) {
						type = "numeric";
					} else if (propName.includes("-")) {
						type = "string";
					} else {
						type = "identifier";
					}
					results.properties.push({ name: propName, type });
				},
			},
			{ properties: [] },
		);

		expect(results.properties).toEqual([
			{ name: "0", type: "numeric" },
			{ name: "identifier", type: "identifier" },
			{ name: "string-key", type: "string" },
			// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
			{ name: "dynamic_${string}", type: "template" },
		]);
	});

	test("should preserve results object mutations", () => {
		const content = `
interface TestInterface {
	prop1: string;
	prop2: number;
}
		`.trim();

		interface Results {
			props: Map<string, number>;
		}

		const initialMap = new Map<string, number>();
		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				TestInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.props.set(propName, results.props.size);
				},
			},
			{ props: initialMap },
		);

		expect(results.props.get("prop1")).toBe(0);
		expect(results.props.get("prop2")).toBe(1);
		expect(results.props.size).toBe(2);
	});

	test("should handle empty content", () => {
		const content = "";

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				SomeInterface: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		expect(results.properties).toEqual([]);
	});

	test("should handle content with only types and no interfaces", () => {
		const content = `
type MyType = {
	prop1: string;
	prop2: number;
};

enum MyEnum {
	VALUE1,
	VALUE2
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				MyType: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// Type aliases are not interfaces, so nothing should be collected
		expect(results.properties).toEqual([]);
	});
});

describe("Property Analysis Edge Cases", () => {
	test("should handle property signatures with readonly modifier", () => {
		const content = `
interface ReadonlyProps {
	readonly immutable: string;
	mutable: number;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(2);

			const prop1Name = getPropertyName(members[0].name);
			const prop2Name = getPropertyName(members[1].name);

			expect(prop1Name).toBe("immutable");
			expect(prop2Name).toBe("mutable");
		}
	});

	test("should handle symbol properties", () => {
		const content = `
const mySymbol = Symbol('test');
interface SymbolProps {
	[mySymbol]: string;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(1);

			// Symbol properties should return null as they're computed but not template literals
			const propName = getPropertyName(members[0].name);
			expect(propName).toBeNull();
		}
	});

	test("should handle extremely long template literals via parseGeneratedInterfaces", () => {
		const content = `
interface LongTemplate {
	[key: \`\${string}_\${string}_\${string}_\${string}_\${string}\`]: string;
}
		`.trim();

		interface Results {
			properties: string[];
		}

		const results = parseGeneratedInterfaces<Results>(
			content,
			{
				LongTemplate: (propName: string, _member: InterfaceMember, results: Results) => {
					results.properties.push(propName);
				},
			},
			{ properties: [] },
		);

		// biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal property names
		expect(results.properties[0]).toBe("${string}_${string}_${string}_${string}_${string}");
	});

	test("should handle unicode property names", () => {
		const content = `
interface UnicodeProps {
	"🎉emoji": string;
	"中文属性": number;
	"Ñoño": boolean;
}
		`.trim();
		const sourceFile = createSourceFileFromContent("test.ts", content);

		const interfaceDecl = findFirstNode(sourceFile, ts.isInterfaceDeclaration);
		expect(interfaceDecl).toBeDefined();

		if (interfaceDecl) {
			const members = interfaceDecl.members.filter(ts.isPropertySignature);
			expect(members.length).toBe(3);

			expect(getPropertyName(members[0].name)).toBe("🎉emoji");
			expect(getPropertyName(members[1].name)).toBe("中文属性");
			expect(getPropertyName(members[2].name)).toBe("Ñoño");
		}
	});
});
