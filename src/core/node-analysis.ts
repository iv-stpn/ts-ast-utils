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

// biome-ignore lint/suspicious/noTemplateCurlyInString: this is intentional
const TEMPLATE_STRING_PLACEHOLDER = "${string}";

/**
 * Extract simple property name from a PropertyName node
 */
function extractPropertyName(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
	return null;
}

/**
 * Extract property name from a PropertySignature node
 */
export function getPropertyName(name: ts.PropertyName): string | null {
	const simpleName = extractPropertyName(name);
	if (simpleName) return simpleName;

	if (ts.isComputedPropertyName(name) && ts.isTemplateLiteralTypeNode(name.expression)) {
		const templateLiteral = name.expression;
		if (templateLiteral.head) {
			let pattern = templateLiteral.head.text;
			for (const span of templateLiteral.templateSpans) {
				pattern += TEMPLATE_STRING_PLACEHOLDER;
				if (span.literal) pattern += span.literal.text;
			}
			return pattern;
		}
	}
	return null;
}

/**
 * Generic helper to parse TypeScript interface declarations from generated types
 */
export function parseGeneratedInterfaces<T>(
	content: string,
	handlers: Record<
		string,
		(propName: string, member: ts.PropertySignature | ts.IndexSignatureDeclaration, results: T) => void
	>,
	results: T,
): T {
	try {
		const sourceFile = ts.createSourceFile("types.d.ts", content, ts.ScriptTarget.Latest, true);

		function visit(node: ts.Node): void {
			if (ts.isInterfaceDeclaration(node)) {
				const interfaceName = node.name.text;
				const handler = handlers[interfaceName];

				if (handler) {
					for (const member of node.members) {
						let propName: string | null = null;

						// Handle property signatures
						if (ts.isPropertySignature(member)) {
							propName = getPropertyName(member.name);
						}
						// Handle index signatures with template literal types
						else if (ts.isIndexSignatureDeclaration(member)) {
							const param = member.parameters[0];
							if (param?.type && ts.isTemplateLiteralTypeNode(param.type)) {
								const templateLiteral = param.type;
								if (templateLiteral.head) {
									let pattern = templateLiteral.head.text;
									for (const span of templateLiteral.templateSpans) {
										pattern += TEMPLATE_STRING_PLACEHOLDER;
										if (span.literal) {
											pattern += span.literal.text;
										}
									}
									propName = pattern;
								}
							}
						}

						if (propName) handler(propName, member as ts.PropertySignature | ts.IndexSignatureDeclaration, results);
					}
				}
			}

			ts.forEachChild(node, visit);
		}

		visit(sourceFile);
	} catch (error) {
		console.warn(`Warning: Could not parse generated types with AST: ${error}`);
	}

	return results;
}
