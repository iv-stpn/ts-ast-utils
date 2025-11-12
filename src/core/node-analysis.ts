/**
 * Node type checking and analysis utilities
 */

import ts from "typescript";

/**
 * Check if a function node is async
 */
export function isAsyncFunction(node: ts.Node): boolean {
	if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
	}

	if (ts.isFunctionDeclaration(node)) {
		return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
	}

	return false;
}

/**
 * Check if a call expression is part of a function declaration
 */
export function isInFunctionContext(callExpression: ts.CallExpression): boolean {
	let parent = callExpression.parent;

	while (parent) {
		if (
			ts.isFunctionDeclaration(parent) ||
			ts.isMethodDeclaration(parent) ||
			ts.isArrowFunction(parent) ||
			ts.isFunctionExpression(parent)
		) {
			return true;
		}
		parent = parent.parent;
	}

	return false;
}

/**
 * Find component/function name from declaration
 */
export function getDeclarationName(node: ts.Node): string | null {
	// Function declarations
	if (ts.isFunctionDeclaration(node) && node.name) {
		return node.name.text;
	}

	// Variable declarations with identifiers
	if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
		return node.name.text;
	}

	// Class declarations
	if (ts.isClassDeclaration(node) && node.name) {
		return node.name.text;
	}

	return null;
}

/**
 * Check if node has export modifier
 */
export function hasExportModifier(node: ts.Node): boolean {
	if ("modifiers" in node && Array.isArray(node.modifiers)) {
		return (node.modifiers as ts.Modifier[]).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
	}
	return false;
}

/**
 * Check if a node has a specific modifier
 */
export function hasModifier(node: ts.Node, modifierKind: ts.SyntaxKind): boolean {
	if (!("modifiers" in node) || !node.modifiers) {
		return false;
	}
	return (node.modifiers as ts.NodeArray<ts.ModifierLike>).some((modifier) => modifier.kind === modifierKind);
}

/**
 * Get the text content of a node, handling different node types
 */
export function getNodeText(node: ts.Node): string {
	if (ts.isIdentifier(node)) {
		return node.text;
	}
	return node.getText();
}

/**
 * Extract comments associated with a node
 */
export function getNodeComments(sourceFile: ts.SourceFile, node: ts.Node): string[] {
	const comments: string[] = [];
	const fullText = sourceFile.getFullText();

	// Get leading comments
	const leadingComments = ts.getLeadingCommentRanges(fullText, node.getFullStart());
	if (leadingComments) {
		for (const comment of leadingComments) {
			comments.push(fullText.substring(comment.pos, comment.end));
		}
	}

	return comments;
}

/**
 * Check if a node is exported
 */
export function isExported(node: ts.Node): boolean {
	return hasModifier(node, ts.SyntaxKind.ExportKeyword);
}

/**
 * Check if a node is a default export
 */
export function isDefaultExport(node: ts.Node): boolean {
	return hasModifier(node, ts.SyntaxKind.DefaultKeyword);
}

/**
 * Check if a function-like node has async modifier
 */
export function isNodeAsync(node: ts.Node): boolean {
	const hasAsyncModifier = (n: { modifiers?: ts.NodeArray<ts.ModifierLike> }) =>
		n.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false;

	return (
		(ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isFunctionDeclaration(node) ||
			ts.isMethodSignature(node) ||
			ts.isMethodDeclaration(node)) &&
		hasAsyncModifier(node)
	);
}
