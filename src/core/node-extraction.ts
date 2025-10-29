/**
 * Node value extraction utilities for TypeScript AST nodes
 */

import ts from "typescript";

/**
 * Extract literal value from a TypeScript node
 * Supports strings, numbers, booleans, null, and undefined
 */
export function getLiteralValue(node: ts.Node): unknown {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return node.text;
	}
	if (ts.isNumericLiteral(node)) {
		return Number(node.text);
	}
	if (node.kind === ts.SyntaxKind.TrueKeyword) {
		return true;
	}
	if (node.kind === ts.SyntaxKind.FalseKeyword) {
		return false;
	}
	if (node.kind === ts.SyntaxKind.NullKeyword) {
		return null;
	}
	if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
		return undefined;
	}
	return undefined;
}

/**
 * Extract string literal value from TypeScript node
 */
export function getStringLiteralValue(node: ts.Node): string | null {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return node.text;
	}
	return null;
}

/**
 * Extract array of literal values from array literal expression
 */
export function getArrayLiteralValues(node: ts.Node): unknown[] {
	if (ts.isArrayLiteralExpression(node)) {
		return node.elements.map((element) => getLiteralValue(element)).filter((val) => val !== undefined);
	}
	return [];
}

/**
 * Extract array of string literals from array literal expression
 */
export function getStringArrayLiterals(node: ts.Node): string[] {
	if (ts.isArrayLiteralExpression(node)) {
		const strings: string[] = [];
		for (const element of node.elements) {
			const str = getStringLiteralValue(element);
			if (str !== null) strings.push(str);
		}
		return strings;
	}
	return [];
}
