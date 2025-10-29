/**
 * Function call extraction utilities for TypeScript AST
 * Provides focused utilities for extracting and analyzing function calls
 */

import * as ts from "typescript";

/**
 * Result type for extracted function calls
 */
export interface FunctionCallResult {
	name: string;
	node: ts.CallExpression;
	isExported: boolean;
}

/**
 * Extract function calls from a TypeScript source file
 * @param sourceFile - The TypeScript source file to analyze
 * @param functionNames - Array of function names to look for
 * @returns Array of function call results with metadata
 */
export function extractFunctionCalls(sourceFile: ts.SourceFile, functionNames: string[]): FunctionCallResult[] {
	const calls: FunctionCallResult[] = [];

	function visit(node: ts.Node): void {
		// Check for export default statements containing function calls
		if (ts.isExportAssignment(node) && !node.isExportEquals) {
			if (ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
				const functionName = node.expression.expression.text;
				if (functionNames.includes(functionName)) {
					calls.push({
						name: functionName,
						node: node.expression,
						isExported: true,
					});
				}
			}
		}

		// Look for function calls
		if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
			const functionName = node.expression.text;
			if (functionNames.includes(functionName)) {
				calls.push({
					name: functionName,
					node,
					isExported: false,
				});
			}
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return calls;
}
