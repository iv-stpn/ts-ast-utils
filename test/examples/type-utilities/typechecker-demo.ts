/**
 * Example demonstrating the new TypeChecker-based utilities
 *
 * This file shows how to use getTypeString and extractPropertiesFromType
 * to get detailed type information from TypeScript types.
 */

import ts from "typescript";
import { extractPropertiesFromType, getTypeString } from "../../../src/index";

// Example source code to analyze
const sourceCode = `
interface User {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  metadata?: Record<string, any>;
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  isActive: true
};

function getUser(): User {
  return user;
}
`;

// Create a source file and program
const sourceFile = ts.createSourceFile("example.ts", sourceCode, ts.ScriptTarget.Latest, true);

const compilerOptions: ts.CompilerOptions = {
	target: ts.ScriptTarget.Latest,
	module: ts.ModuleKind.ESNext,
};

const host = ts.createCompilerHost(compilerOptions);
const originalGetSourceFile = host.getSourceFile;
host.getSourceFile = (fileName, languageVersion) => {
	if (fileName === "example.ts") {
		return sourceFile;
	}
	return originalGetSourceFile(fileName, languageVersion);
};

const program = ts.createProgram(["example.ts"], compilerOptions, host);
const checker = program.getTypeChecker();

// Find the User interface
let userInterfaceType: ts.Type | undefined;
ts.forEachChild(sourceFile, (node) => {
	if (ts.isInterfaceDeclaration(node) && node.name.text === "User") {
		const symbol = checker.getSymbolAtLocation(node.name);
		if (symbol) {
			userInterfaceType = checker.getDeclaredTypeOfSymbol(symbol);
		}
	}
});

if (userInterfaceType) {
	console.log("=== User Interface Type Analysis ===");

	// Get the type string
	const typeString = getTypeString(userInterfaceType, checker);
	console.log("Type String:", typeString);

	// Extract properties with their types
	const properties = extractPropertiesFromType(userInterfaceType, checker);
	console.log("\nProperties:");
	for (const [propName, propType] of Object.entries(properties)) {
		console.log(`  ${propName}: ${propType}`);
	}
}

// Find the getUser function and get its return type
ts.forEachChild(sourceFile, (node) => {
	if (ts.isFunctionDeclaration(node) && node.name?.text === "getUser") {
		const signature = checker.getSignatureFromDeclaration(node);
		if (signature) {
			const returnType = checker.getReturnTypeOfSignature(signature);

			console.log("\n=== getUser Return Type ===");
			const returnTypeString = getTypeString(returnType, checker);
			console.log("Return Type:", returnTypeString);

			const returnProperties = extractPropertiesFromType(returnType, checker);
			console.log("\nReturn Type Properties:");
			for (const [propName, propType] of Object.entries(returnProperties)) {
				console.log(`  ${propName}: ${propType}`);
			}
		}
	}
});
