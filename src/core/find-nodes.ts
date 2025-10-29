/**
 * AST visitor utilities for traversing TypeScript AST nodes
 */

import ts from "typescript";

/**
 * Find all nodes of a specific type
 */
export function findNodes<T extends ts.Node>(sourceFile: ts.SourceFile, predicate: (node: ts.Node) => node is T): T[] {
	const results: T[] = [];

	function visit(node: ts.Node): void {
		if (predicate(node)) results.push(node);
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return results;
}

/**
 * Find first node that matches a predicate
 */
export function findFirstNode<T extends ts.Node>(
	sourceFile: ts.SourceFile,
	predicate: (node: ts.Node) => node is T,
): T | null {
	let result: T | null = null;

	function visit(node: ts.Node): void {
		if (result) return; // Early exit if found

		if (predicate(node)) {
			result = node;
			return;
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return result;
}
