/**
 * Position and location utilities for TypeScript AST nodes
 */

import type * as ts from "typescript";

/**
 * Get line number from TypeScript source file and position
 */
export function getLineNumber(sourceFile: ts.SourceFile, position: number): number {
	const lineAndChar = sourceFile.getLineAndCharacterOfPosition(position);
	return lineAndChar.line + 1; // TypeScript uses 0-based line numbers
}

/**
 * Get column number from TypeScript source file and position
 */
export function getColumnNumber(sourceFile: ts.SourceFile, position: number): number {
	const lineAndChar = sourceFile.getLineAndCharacterOfPosition(position);
	return lineAndChar.character + 1; // TypeScript uses 0-based character positions
}

/**
 * Get position info (line and column) from TypeScript source file
 */
export function getPositionInfo(sourceFile: ts.SourceFile, position: number): { line: number; column: number } {
	const lineAndChar = sourceFile.getLineAndCharacterOfPosition(position);
	return {
		line: lineAndChar.line + 1,
		column: lineAndChar.character + 1,
	};
}

/**
 * Get the position information for a node
 */
export function getNodePosition(sourceFile: ts.SourceFile, node: ts.Node) {
	const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
	const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

	return {
		start: {
			line: start.line + 1, // Convert to 1-based line numbers
			column: start.character + 1, // Convert to 1-based column numbers
		},
		end: {
			line: end.line + 1,
			column: end.character + 1,
		},
		startPos: node.getStart(),
		endPos: node.getEnd(),
	};
}
