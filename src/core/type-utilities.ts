/**
 * TypeScript AST Type Utilities
 *
 * A collection of reusable utilities for working with TypeScript's AST API.
 * These utilities help with type serialization, parsing, and analysis.
 *
 * Can be used as a standalone library for any TypeScript AST manipulation tasks.
 */

import ts from "typescript";

// Regex constants for reuse
const VALID_IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Serialize a TypeScript type node to a string representation
 * Handles complex types including unions, arrays, objects, literals, etc.
 * @param typeNode - The TypeScript type node to serialize
 * @returns String representation of the type
 */
export function serializeTypeNode(typeNode: ts.TypeNode): string {
	// Handle primitive keywords
	if (typeNode.kind === ts.SyntaxKind.StringKeyword) return "string";
	if (typeNode.kind === ts.SyntaxKind.NumberKeyword) return "number";
	if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) return "boolean";
	if (typeNode.kind === ts.SyntaxKind.NullKeyword) return "null";
	if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) return "undefined";
	if (typeNode.kind === ts.SyntaxKind.VoidKeyword) return "void";
	if (typeNode.kind === ts.SyntaxKind.AnyKeyword) return "any";
	if (typeNode.kind === ts.SyntaxKind.UnknownKeyword) return "unknown";
	if (typeNode.kind === ts.SyntaxKind.NeverKeyword) return "never";

	// Handle array types
	if (ts.isArrayTypeNode(typeNode)) {
		const elementType = serializeTypeNode(typeNode.elementType);
		return `${elementType}[]`;
	}

	// Handle union types
	if (ts.isUnionTypeNode(typeNode)) {
		const types = typeNode.types.map(serializeTypeNode).sort();
		return types.join(" | ");
	}

	// Handle intersection types
	if (ts.isIntersectionTypeNode(typeNode)) {
		const types = typeNode.types.map(serializeTypeNode);
		return types.join(" & ");
	}

	// Handle literal types
	if (ts.isLiteralTypeNode(typeNode)) {
		if (ts.isStringLiteral(typeNode.literal)) {
			return `"${typeNode.literal.text}"`;
		}
		if (ts.isNumericLiteral(typeNode.literal)) {
			return typeNode.literal.text;
		}
		if (typeNode.literal.kind === ts.SyntaxKind.TrueKeyword) {
			return "true";
		}
		if (typeNode.literal.kind === ts.SyntaxKind.FalseKeyword) {
			return "false";
		}
	}

	// Handle type references (Date, Record, etc.)
	if (ts.isTypeReferenceNode(typeNode)) {
		const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : typeNode.typeName.getText();
		if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
			const typeArgs = typeNode.typeArguments.map(serializeTypeNode).join(", ");
			return `${typeName}<${typeArgs}>`;
		}
		return typeName;
	}

	// Handle object/type literals
	if (ts.isTypeLiteralNode(typeNode)) {
		const members: string[] = [];
		for (const member of typeNode.members) {
			if (ts.isPropertySignature(member)) {
				const name = member.name;
				let propName: string | null = null;

				if (ts.isIdentifier(name)) {
					propName = name.text;
				} else if (ts.isStringLiteral(name)) {
					propName = name.text;
				}

				if (propName && member.type) {
					const propType = serializeTypeNode(member.type);
					members.push(`${propName}: ${propType}`);
				}
			}
		}
		return `{ ${members.join("; ")} }`;
	}

	// Handle parenthesized types
	if (ts.isParenthesizedTypeNode(typeNode)) {
		return serializeTypeNode(typeNode.type);
	}

	// Fallback: get the full text
	return typeNode.getText();
}

/**
 * Resolve a type alias to its definition
 * @param typeName - Name of the type to resolve
 * @param sourceFile - Source file containing the type definition
 * @returns The resolved type node or null if not found
 */
export function resolveTypeAlias(typeName: string, sourceFile: ts.SourceFile): ts.TypeNode | null {
	let resolvedType: ts.TypeNode | null = null;

	function visit(node: ts.Node): void {
		if (resolvedType) return; // Already found

		// Check for type alias declarations
		if (ts.isTypeAliasDeclaration(node)) {
			if (ts.isIdentifier(node.name) && node.name.text === typeName) {
				resolvedType = node.type;
			}
		}

		// Check for interface declarations
		if (ts.isInterfaceDeclaration(node)) {
			if (ts.isIdentifier(node.name) && node.name.text === typeName) {
				// For interfaces, we can't easily create a synthetic type node
				// but we can extract properties directly
				// This is a limitation - callers should handle this case
			}
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return resolvedType;
}

/**
 * Parse object type for parameters
 * Handles type references by resolving them to their definitions
 * @param typeNode - The type node to parse
 * @param sourceFile - Optional source file for resolving type references
 * @returns Record mapping property names to their types
 */
export function parseObjectType(typeNode: ts.TypeNode, sourceFile?: ts.SourceFile): Record<string, string> {
	const params: Record<string, string> = {};

	// Handle type references - resolve them to their actual definitions
	if (ts.isTypeReferenceNode(typeNode) && sourceFile) {
		const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : typeNode.typeName.getText();
		const resolvedType = resolveTypeAlias(typeName, sourceFile);
		if (resolvedType) {
			return parseObjectType(resolvedType, sourceFile);
		}
	}

	if (ts.isTypeLiteralNode(typeNode)) {
		for (const member of typeNode.members) {
			if (ts.isPropertySignature(member)) {
				const name = member.name;
				let propName: string | null = null;

				if (ts.isIdentifier(name)) {
					propName = name.text;
				} else if (ts.isStringLiteral(name)) {
					propName = name.text;
				}

				if (propName && member.type) {
					params[propName] = serializeTypeNode(member.type);
				}
			}
		}
	}

	return params;
}

/**
 * Extract return type from a Promise<T> or T type
 * Unwraps Promise types to get the inner type
 * @param typeNode - The type node to unwrap
 * @param sourceFile - Source file for resolving type references
 * @returns Record of object properties or undefined
 */
export function extractReturnTypeFromPromise(
	typeNode: ts.TypeNode,
	sourceFile: ts.SourceFile,
): Record<string, string> | undefined {
	let actualType = typeNode;

	// Unwrap Promise<T> to get T
	if (ts.isTypeReferenceNode(typeNode)) {
		const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : typeNode.typeName.getText();
		if (typeName === "Promise" && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
			const innerType = typeNode.typeArguments[0];
			if (innerType) {
				actualType = innerType;
			}
		}
	}

	return parseObjectType(actualType, sourceFile);
}

/**
 * Extract properties from an object literal expression
 * Infers types from the initializer expressions
 * @param objectLiteral - The object literal to extract from
 * @returns Record mapping property names to inferred types
 */
export function extractPropertiesFromObjectLiteral(objectLiteral: ts.ObjectLiteralExpression): Record<string, string> {
	const stateProperties: Record<string, string> = {};

	for (const prop of objectLiteral.properties) {
		if (ts.isPropertyAssignment(prop)) {
			const name = prop.name;
			let propName: string | null = null;

			if (ts.isIdentifier(name)) {
				propName = name.text;
			} else if (ts.isStringLiteral(name)) {
				propName = name.text;
			}

			if (propName) {
				const propType = inferTypeFromExpression(prop.initializer);
				if (propType) {
					stateProperties[propName] = propType;
				}
			}
		} else if (ts.isShorthandPropertyAssignment(prop)) {
			const propName = prop.name.text;
			let propType = inferTypeFromExpression(prop.name);

			// Apply context-based type inference for shorthand properties
			if (propType === "unknown" && propName) {
				if (propName.includes("Id") || propName.includes("Name") || propName.includes("Key")) {
					propType = "string | null | undefined";
				} else if (propName.includes("enabled") || propName.includes("is") || propName.includes("has")) {
					propType = "boolean";
				}
			}

			if (propType) {
				stateProperties[propName] = propType;
			}
		}
	}

	return stateProperties;
}

/**
 * Infer TypeScript type from an expression node
 * Handles literals, arrays, objects, function calls, and more
 * @param node - The expression to infer the type from
 * @returns The inferred type as a string, or "unknown" if cannot be determined
 */
export function inferTypeFromExpression(node: ts.Expression): string | null {
	if (ts.isStringLiteral(node)) {
		return "string";
	}
	if (ts.isNumericLiteral(node)) {
		return "number";
	}
	if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
		return "boolean";
	}
	if (node.kind === ts.SyntaxKind.NullKeyword) {
		return "null";
	}
	if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
		return "undefined";
	}
	if (ts.isArrayLiteralExpression(node)) {
		if (node.elements.length > 0) {
			// Check if all elements are the same type
			const elementTypes = new Set<string>();
			for (const element of node.elements) {
				if (element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)) {
					const elementType = inferTypeFromExpression(element);
					if (elementType) {
						elementTypes.add(elementType);
					}
				}
			}

			if (elementTypes.size === 1 && elementTypes.has("string")) {
				return "string[]";
			}
			if (elementTypes.size === 1 && elementTypes.has("number")) {
				return "number[]";
			}
			if (elementTypes.size === 1 && elementTypes.has("boolean")) {
				return "boolean[]";
			}
			if (elementTypes.size > 0) {
				const unionType = Array.from(elementTypes).join(" | ");
				return `(${unionType})[]`;
			}
		}
		return "unknown[]";
	}
	if (ts.isObjectLiteralExpression(node)) {
		const objectProps: string[] = [];
		for (const prop of node.properties) {
			if (ts.isPropertyAssignment(prop)) {
				const name = prop.name;
				let propName: string | null = null;

				if (ts.isIdentifier(name)) {
					propName = name.text;
				} else if (ts.isStringLiteral(name)) {
					propName = name.text;
				}

				if (propName && prop.initializer) {
					const propType = inferTypeFromExpression(prop.initializer);
					if (propType) {
						objectProps.push(`${propName}: ${propType}`);
					}
				}
			} else if (ts.isShorthandPropertyAssignment(prop)) {
				const propName = prop.name.text;
				const propType = inferTypeFromExpression(prop.name);
				if (propType) {
					objectProps.push(`${propName}: ${propType}`);
				}
			}
		}
		return objectProps.length > 0 ? `{ ${objectProps.join("; ")} }` : "{}";
	}
	if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
		if (node.expression.text === "Date") {
			return "Date";
		}
		return "object";
	}
	if (ts.isAsExpression(node)) {
		if (ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName)) {
			if (node.type.typeName.text === "const") {
				return inferTypeFromExpression(node.expression);
			}
		}
		return inferTypeFromExpression(node.expression);
	}
	if (ts.isConditionalExpression(node)) {
		const trueType = inferTypeFromExpression(node.whenTrue);
		const falseType = inferTypeFromExpression(node.whenFalse);

		if (trueType && falseType) {
			if (trueType === falseType) {
				return trueType;
			}
			return `${trueType} | ${falseType}`;
		}
		if (trueType) {
			return trueType;
		}
		if (falseType) {
			return falseType;
		}
	}
	if (ts.isBinaryExpression(node)) {
		if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
			const leftType = inferTypeFromExpression(node.left);
			const rightType = inferTypeFromExpression(node.right);

			if (leftType && rightType) {
				if (leftType === rightType) {
					return leftType;
				}
				return `${leftType} | ${rightType}`;
			}
			if (leftType) {
				return leftType;
			}
			if (rightType) {
				return rightType;
			}
		}
		if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
			const rightType = inferTypeFromExpression(node.right);
			return rightType || "unknown";
		}
		if (
			node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
			node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
			node.operatorToken.kind === ts.SyntaxKind.LessThanToken ||
			node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken ||
			node.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken ||
			node.operatorToken.kind === ts.SyntaxKind.GreaterThanEqualsToken
		) {
			return "boolean";
		}
		if (
			node.operatorToken.kind === ts.SyntaxKind.PercentToken ||
			node.operatorToken.kind === ts.SyntaxKind.PlusToken ||
			node.operatorToken.kind === ts.SyntaxKind.MinusToken ||
			node.operatorToken.kind === ts.SyntaxKind.AsteriskToken ||
			node.operatorToken.kind === ts.SyntaxKind.SlashToken
		) {
			return "number";
		}
	}
	if (ts.isCallExpression(node)) {
		const expr = node.expression;
		if (ts.isPropertyAccessExpression(expr)) {
			const methodName = expr.name.text;
			if (methodName === "filter" || methodName === "slice") {
				return inferTypeFromExpression(expr.expression);
			}
			if (methodName === "toString" || methodName === "substr") {
				return "string";
			}
			if (methodName === "get") {
				return "string | null";
			}
			if (methodName === "now" || methodName === "random") {
				return "number";
			}
		} else if (ts.isIdentifier(expr)) {
			const funcName = expr.text;
			if (funcName === "parseInt" || funcName === "parseFloat" || funcName === "Number") {
				return "number";
			}
			if (funcName === "String") {
				return "string";
			}
			if (funcName === "Boolean") {
				return "boolean";
			}
		}
	}
	if (ts.isPrefixUnaryExpression(node)) {
		if (node.operator === ts.SyntaxKind.ExclamationToken) {
			return "boolean";
		}
		if (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken) {
			return "number";
		}
	}
	if (ts.isIdentifier(node)) {
		const name = node.text;
		if (name === "undefined") {
			return "undefined";
		}
		if (name.includes("Id") || name.includes("Name") || name.includes("Key")) {
			return "string | null | undefined";
		}
		if (name.includes("enabled") || name.includes("is") || name.includes("has")) {
			return "boolean";
		}
		return "unknown";
	}
	if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return "string";
	}
	if (ts.isSpreadElement(node)) {
		return inferTypeFromExpression(node.expression);
	}

	return "unknown";
}

/**
 * Find a property by name in an object literal expression
 * @param objectLiteral - The object literal to search
 * @param propertyName - Name of the property to find
 * @returns The property value expression or null if not found
 */
export function findObjectProperty(objectLiteral: ts.ObjectLiteralExpression, propertyName: string): ts.Expression | null {
	for (const prop of objectLiteral.properties) {
		if (ts.isPropertyAssignment(prop)) {
			const name = prop.name;
			if (ts.isIdentifier(name) && name.text === propertyName) {
				return prop.initializer;
			}
		}
	}
	return null;
}

/**
 * Check if a property exists in an object literal
 * @param objectLiteral - The object literal to check
 * @param propertyName - Name of the property to look for
 * @returns True if the property exists
 */
export function hasProperty(objectLiteral: ts.ObjectLiteralExpression, propertyName: string): boolean {
	return objectLiteral.properties.some(
		(p) =>
			(ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p)) && ts.isIdentifier(p.name) && p.name.text === propertyName,
	);
}

/**
 * Compare two Record objects for equality
 * @param a - First record
 * @param b - Second record
 * @returns True if records are equal
 */
export function areRecordsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	for (let i = 0; i < aKeys.length; i++) {
		const aKey = aKeys[i];
		const bKey = bKeys[i];
		if (aKey !== bKey || !aKey || !bKey) return false;
		if (a[aKey] !== b[bKey]) return false;
	}
	return true;
}

/**
 * Compare two Maps with Record values for equality
 * @param a - First map
 * @param b - Second map
 * @returns True if maps are equal
 */
export function areMapsWithRecordValuesEqual(
	a: Map<string, Record<string, string>>,
	b: Map<string, Record<string, string>>,
): boolean {
	if (a.size !== b.size) return false;
	for (const [key, value] of a) {
		const bValue = b.get(key);
		if (!bValue || !areRecordsEqual(value, bValue)) return false;
	}
	return true;
}

/**
 * Check if a string is a valid JavaScript identifier
 * @param str - String to check
 * @returns True if the string is a valid identifier
 */
export function isValidIdentifier(str: string): boolean {
	return VALID_IDENTIFIER_REGEX.test(str);
}

/**
 * Format a property key for use in TypeScript code
 * Quotes keys that contain special characters
 * @param key - The property key to format
 * @returns Formatted key (quoted if necessary)
 */
export function formatPropertyKey(key: string): string {
	return isValidIdentifier(key) ? key : `"${key}"`;
}
